const express = require("express");
const router = express.Router();
const verifyAdmin = require("../middleware/verifyAdmin");
const {
  getArchivedJobs,
  restoreJob,
} = require("../controllers/archived.controller");

console.log("✅ Archived routes loaded!");

/**
 * @route   GET /archived
 * @desc    Get all archived (soft deleted) jobs with filters (Admin only)
 * @access  Private/Admin
 */
router.get("/", verifyAdmin, getArchivedJobs);

/**
 * @route   PATCH /archived/:id/restore
 * @desc    Restore an archived job (undo soft delete) (Admin only)
 * @access  Private/Admin
 */
router.patch("/:id/restore", verifyAdmin, restoreJob);

module.exports = router;
