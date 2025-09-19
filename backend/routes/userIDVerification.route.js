const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  upload,
  uploadIDPicture,
  uploadSelfie,
  getVerificationStatus,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
} = require("../controllers/userIDVerification.controller");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

// ==================== RATE LIMITING ====================

// Rate limiting for uploads
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 uploads per 15 minutes
  message: {
    success: false,
    message: "Too many upload attempts, please try again later",
    code: "UPLOAD_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for status checks
const statusRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Max 60 requests per minute
  message: {
    success: false,
    message: "Too many status check requests, please try again later",
    code: "STATUS_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for admin endpoints
const adminRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute for admin
  message: {
    success: false,
    message: "Too many admin requests, please try again later",
    code: "ADMIN_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== ERROR HANDLING MIDDLEWARE ====================

// Enhanced multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  console.error("🚫 Multer/Upload Error:", err);

  // Multer specific errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 10MB",
      code: "FILE_TOO_LARGE",
      details: {
        maxSize: "10MB",
        receivedSize: req.file
          ? `${(req.file.size / 1024 / 1024).toFixed(2)}MB`
          : "Unknown",
      },
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected file field. Use 'image' as the field name",
      code: "UNEXPECTED_FILE_FIELD",
      expectedField: "image",
    });
  }

  if (err.message && err.message.includes("Only image files")) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Only image files are allowed",
      code: "INVALID_FILE_TYPE",
      allowedTypes: ["JPEG", "JPG", "PNG", "WebP", "GIF"],
    });
  }

  // Cloudinary or other upload errors
  if (err.message && err.message.includes("cloudinary")) {
    return res.status(500).json({
      success: false,
      message: "Cloud storage error. Please try again later",
      code: "CLOUD_STORAGE_ERROR",
    });
  }

  // Generic upload error
  if (err.message) {
    return res.status(400).json({
      success: false,
      message: "File upload error",
      code: "UPLOAD_ERROR",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  next(err);
};

// ==================== VALIDATION MIDDLEWARE ====================

// Validate required fields in request body
const validateUploadRequest = (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
      code: "MISSING_USER_ID",
    });
  }

  // Validate ObjectId format
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (!objectIdPattern.test(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID format",
      code: "INVALID_USER_ID_FORMAT",
    });
  }

  next();
};

// ==================== USER ROUTES (WORKERS & CLIENTS) ====================

/**
 * @route   POST /id-verification/upload-id-picture
 * @desc    Upload ID picture for verification
 * @access  Private (Authenticated users - Workers & Clients)
 * @body    multipart/form-data: { image: File, userId: String }
 */
router.post(
  "/upload-id-picture",
  uploadRateLimit,
  verifyToken,
  upload, // This is the multer middleware from controller
  handleMulterError,
  validateUploadRequest,
  uploadIDPicture
);

/**
 * @route   POST /id-verification/upload-selfie
 * @desc    Upload selfie picture for verification
 * @access  Private (Authenticated users - Workers & Clients)
 * @body    multipart/form-data: { image: File, userId: String }
 */
router.post(
  "/upload-selfie",
  uploadRateLimit,
  verifyToken,
  upload, // This is the multer middleware from controller
  handleMulterError,
  validateUploadRequest,
  uploadSelfie
);

/**
 * @route   GET /id-verification/status/:userId
 * @desc    Get user's ID verification status and documents
 * @access  Private (Authenticated users)
 * @params  userId: String (MongoDB ObjectId)
 */
router.get(
  "/status/:userId",
  statusRateLimit,
  verifyToken,
  getVerificationStatus
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /id-verification/admin/pending
 * @desc    Get all users with pending ID verifications (Admin only)
 * @access  Private (Admin only)
 * @query   page: number, limit: number, userType: string, sortBy: string, order: string
 */
router.get(
  "/admin/pending",
  adminRateLimit,
  verifyAdmin,
  getPendingVerifications
);

/**
 * @route   POST /id-verification/admin/approve/:userId
 * @desc    Approve user's ID verification (Admin only)
 * @access  Private (Admin only)
 * @params  userId: String (User's credential ID)
 * @body    { notes?: string }
 */
router.post(
  "/admin/approve/:userId",
  adminRateLimit,
  verifyAdmin,
  approveVerification
);

/**
 * @route   POST /id-verification/admin/reject/:userId
 * @desc    Reject user's ID verification (Admin only)
 * @access  Private (Admin only)
 * @params  userId: String (User's credential ID)
 * @body    { notes?: string, requireResubmission?: boolean }
 */
router.post(
  "/admin/reject/:userId",
  adminRateLimit,
  verifyAdmin,
  rejectVerification
);

/**
 * @route   GET /id-verification/admin/statistics
 * @desc    Get ID verification statistics (Admin only)
 * @access  Private (Admin only)
 */
router.get(
  "/admin/statistics",
  adminRateLimit,
  verifyAdmin,
  async (req, res) => {
    try {
      const Worker = require("../models/Worker");
      const Client = require("../models/Client");

      // Get verification statistics for workers
      const workerStats = await Worker.aggregate([
        {
          $group: {
            _id: "$verificationStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get verification statistics for clients
      const clientStats = await Client.aggregate([
        {
          $group: {
            _id: "$verificationStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      // Format statistics for workers
      const formattedWorkerStats = {
        not_submitted: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        requires_resubmission: 0,
      };

      workerStats.forEach((stat) => {
        if (formattedWorkerStats.hasOwnProperty(stat._id)) {
          formattedWorkerStats[stat._id] = stat.count;
        }
      });

      // Format statistics for clients
      const formattedClientStats = {
        not_submitted: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        requires_resubmission: 0,
      };

      clientStats.forEach((stat) => {
        if (formattedClientStats.hasOwnProperty(stat._id)) {
          formattedClientStats[stat._id] = stat.count;
        }
      });

      // Calculate totals
      const totalWorkers = Object.values(formattedWorkerStats).reduce(
        (sum, count) => sum + count,
        0
      );
      const totalClients = Object.values(formattedClientStats).reduce(
        (sum, count) => sum + count,
        0
      );

      const submittedWorkers =
        formattedWorkerStats.pending +
        formattedWorkerStats.approved +
        formattedWorkerStats.rejected +
        formattedWorkerStats.requires_resubmission;

      const submittedClients =
        formattedClientStats.pending +
        formattedClientStats.approved +
        formattedClientStats.rejected +
        formattedClientStats.requires_resubmission;

      // Combined statistics
      const combinedStats = {
        not_submitted:
          formattedWorkerStats.not_submitted +
          formattedClientStats.not_submitted,
        pending: formattedWorkerStats.pending + formattedClientStats.pending,
        approved: formattedWorkerStats.approved + formattedClientStats.approved,
        rejected: formattedWorkerStats.rejected + formattedClientStats.rejected,
        requires_resubmission:
          formattedWorkerStats.requires_resubmission +
          formattedClientStats.requires_resubmission,
      };

      const totalUsers = totalWorkers + totalClients;
      const totalSubmitted = submittedWorkers + submittedClients;

      res.status(200).json({
        success: true,
        message: "ID verification statistics retrieved successfully",
        data: {
          combined: {
            byStatus: combinedStats,
            summary: {
              totalUsers: totalUsers,
              totalSubmitted: totalSubmitted,
              totalNotSubmitted: combinedStats.not_submitted,
              totalPending: combinedStats.pending,
              totalApproved: combinedStats.approved,
              totalRejected:
                combinedStats.rejected + combinedStats.requires_resubmission,
              submissionRate:
                totalUsers > 0
                  ? ((totalSubmitted / totalUsers) * 100).toFixed(2) + "%"
                  : "0%",
              approvalRate:
                totalSubmitted > 0
                  ? ((combinedStats.approved / totalSubmitted) * 100).toFixed(
                      2
                    ) + "%"
                  : "0%",
            },
          },
          workers: {
            byStatus: formattedWorkerStats,
            summary: {
              totalWorkers: totalWorkers,
              submitted: submittedWorkers,
              notSubmitted: formattedWorkerStats.not_submitted,
              pendingReview: formattedWorkerStats.pending,
              approved: formattedWorkerStats.approved,
              rejected:
                formattedWorkerStats.rejected +
                formattedWorkerStats.requires_resubmission,
              submissionRate:
                totalWorkers > 0
                  ? ((submittedWorkers / totalWorkers) * 100).toFixed(2) + "%"
                  : "0%",
              approvalRate:
                submittedWorkers > 0
                  ? (
                      (formattedWorkerStats.approved / submittedWorkers) *
                      100
                    ).toFixed(2) + "%"
                  : "0%",
            },
          },
          clients: {
            byStatus: formattedClientStats,
            summary: {
              totalClients: totalClients,
              submitted: submittedClients,
              notSubmitted: formattedClientStats.not_submitted,
              pendingReview: formattedClientStats.pending,
              approved: formattedClientStats.approved,
              rejected:
                formattedClientStats.rejected +
                formattedClientStats.requires_resubmission,
              submissionRate:
                totalClients > 0
                  ? ((submittedClients / totalClients) * 100).toFixed(2) + "%"
                  : "0%",
              approvalRate:
                submittedClients > 0
                  ? (
                      (formattedClientStats.approved / submittedClients) *
                      100
                    ).toFixed(2) + "%"
                  : "0%",
            },
          },
        },
      });
    } catch (error) {
      console.error("Error getting verification statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get verification statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /id-verification/health
 * @desc    Health check for ID verification service
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ID Verification service is healthy",
    service: "ID Verification API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      public: ["GET /health - Health check"],
      user: [
        "POST /upload-id-picture - Upload ID picture",
        "POST /upload-selfie - Upload selfie picture",
        "GET /status/:userId - Get verification status",
      ],
      admin: [
        "GET /admin/pending - Get pending verifications",
        "POST /admin/approve/:userId - Approve verification",
        "POST /admin/reject/:userId - Reject verification",
        "GET /admin/statistics - Get verification statistics",
      ],
    },
    features: {
      supportedUserTypes: ["Workers", "Clients"],
      fileTypes: ["JPEG", "JPG", "PNG", "WebP", "GIF"],
      maxFileSize: "10MB",
      storage: "Cloudinary",
      verificationStates: [
        "not_submitted",
        "pending",
        "approved",
        "rejected",
        "requires_resubmission",
      ],
      rateLimiting: {
        uploads: "20 per 15 minutes",
        status: "60 per minute",
        admin: "100 per minute",
      },
      adminFeatures: [
        "View pending verifications",
        "Approve/Reject documents",
        "Filter by user type",
        "Pagination support",
        "Resubmission tracking",
        "Statistics dashboard",
      ],
    },
  });
});

// ==================== ERROR HANDLING ====================

// Global error handler for this router
router.use((err, req, res, next) => {
  console.error("🚫 ID Verification Route Error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error in ID verification service",
    code: "INTERNAL_SERVER_ERROR",
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
});

module.exports = router;
