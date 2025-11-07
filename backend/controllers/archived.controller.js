const mongoose = require("mongoose");
const Joi = require("joi");
const Job = require("../models/Job");
const Client = require("../models/Client");
const logger = require("../utils/logger");
const { decryptAES128 } = require("../utils/encipher");

// ✅ Validation schema for query parameters
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  category: Joi.string().trim(),
  location: Joi.string().trim(),
  search: Joi.string().trim(),
  status: Joi.string().valid("open", "in_progress", "completed", "cancelled"),
  sortBy: Joi.string()
    .valid("createdAt", "updatedAt", "price", "status")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
  clientId: Joi.string().trim(),
});

// ✅ Validation schema for restore
const restoreSchema = Joi.object({
  id: Joi.string().required(),
});

// ✅ Sanitize input helper
const sanitizeInput = (data) => {
  if (typeof data === "string") {
    return data.trim();
  }
  if (data instanceof Date) {
    return data;
  }
  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return data;
};

// ✅ Error handler
const handleJobError = (err, res, operation, req) => {
  logger.error(`${operation} failed`, {
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};

// ✅ Get all archived jobs (soft deleted)
const getArchivedJobs = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate query parameters
    const { error, value } = querySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get archived jobs validation failed", {
        errors: error.details,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Sanitize all inputs
    const sanitizedQuery = sanitizeInput(value);
    const {
      page,
      limit,
      category,
      location,
      search,
      status,
      sortBy,
      order,
      clientId,
    } = sanitizedQuery;

    // ✅ Build filter - only show deleted jobs
    const filter = {
      isDeleted: true, // ← this ensures only archived jobs appear
    };

    if (category) filter.category = category;
    if (location) filter.location = { $regex: location, $options: "i" };
    if (status) filter.status = status;
    if (search) filter.description = { $regex: search, $options: "i" };
    if (clientId) {
      try {
        filter.clientId = new mongoose.Types.ObjectId(clientId);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid clientId",
        });
      }
    }

    const sortOrder = order === "asc" ? 1 : -1;

    // ✅ Query only archived (soft deleted) jobs
    const jobs = await Job.find(filter)
      .populate({
        path: "clientId",
        select:
          "firstName lastName profilePicture credentialId isVerified blocked",
        populate: {
          path: "credentialId",
          select: "email",
        },
      })
      .populate("category", "categoryName")
      .populate("hiredWorker", "firstName lastName profilePicture")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // ✅ Filter for valid clients only (skip broken refs)
    const validJobs = jobs.filter((job) => job.clientId);

    if (!validJobs || validJobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No archived jobs found",
        code: "NO_ARCHIVED_JOBS_FOUND",
        data: {
          jobs: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: page > 1,
          },
          filters: {
            category,
            location,
            search,
            status,
            sortBy,
            order,
            clientId,
          },
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ✅ Get total count for pagination
    const totalCount = await Job.countDocuments(filter);

    const processingTime = Date.now() - startTime;

    // ✅ Format and clean up job data
    const optimizedJobs = validJobs.map((job) => ({
      id: job._id,
      description: job.description,
      price: job.price,
      location: job.location,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      category: job.category
        ? { id: job.category._id, name: job.category.categoryName }
        : null,
      clientId: job.clientId?._id,
      client: job.clientId
        ? {
            name: `${decryptAES128(job.clientId.firstName)} ${decryptAES128(
              job.clientId.lastName
            )}`,
            profilePicture: job.clientId.profilePicture,
            isVerified: job.clientId.isVerified || false,
          }
        : null,
      hiredWorker: job.hiredWorker
        ? {
            id: job.hiredWorker._id,
            name: `${job.hiredWorker.firstName} ${job.hiredWorker.lastName}`,
            profilePicture: job.hiredWorker.profilePicture,
          }
        : null,
    }));

    // ✅ Logging success
    logger.info("Archived jobs retrieved successfully", {
      totalJobs: validJobs.length,
      totalCount,
      page,
      limit,
      filters: { category, location, search, status, clientId },
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // ✅ Set headers for cache and total count
    res.set({
      "Cache-Control": "public, max-age=300",
      ETag: `"archived-jobs-${Date.now()}"`,
      "X-Total-Count": totalCount.toString(),
    });

    // ✅ Send final response
    res.status(200).json({
      success: true,
      message: "Archived jobs retrieved successfully",
      code: "ARCHIVED_JOBS_RETRIEVED",
      data: {
        jobs: optimizedJobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          category,
          location,
          search,
          status,
          sortBy,
          order,
          clientId,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get archived jobs failed", {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Get archived jobs", req);
  }
};

// ✅ Restore a job (undo soft delete)
const restoreJob = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate job ID
    const { error, value } = restoreSchema.validate(
      { id: req.params.id },
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (error) {
      logger.warn("Restore job validation failed", {
        errors: error.details,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { id } = value;

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("Invalid job ID format", {
        jobId: id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid job ID format",
        code: "INVALID_ID",
      });
    }

    // ✅ Find the archived job
    const job = await Job.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!job) {
      logger.warn("Archived job not found", {
        jobId: id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Archived job not found",
        code: "JOB_NOT_FOUND",
      });
    }

    // ✅ Restore the job (set isDeleted to false)
    job.isDeleted = false;
    await job.save();

    const processingTime = Date.now() - startTime;

    logger.info("Job restored successfully", {
      jobId: id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Job restored successfully",
      code: "JOB_RESTORED",
      data: {
        jobId: job._id,
        description: job.description,
        status: job.status,
        isDeleted: job.isDeleted,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Restore job failed", {
      error: err.message,
      stack: err.stack,
      jobId: req.params.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Restore job", req);
  }
};

module.exports = {
  getArchivedJobs,
  restoreJob,
};
