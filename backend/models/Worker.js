const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    credentialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Credential",
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      default: null,
    },
    suffixName: {
      type: String,
      default: null,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    sex: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    maritalStatus: {
      type: String,
      enum: [
        "single",
        "married",
        "separated",
        "divorced",
        "widowed",
        "prefer not to say",
      ],
      required: true,
    },
    address: {
      region: {
        type: String,
        required: true,
      },
      province: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      barangay: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: true,
      },
    },
    profilePicture: {
      url: {
        type: String,
        required: false,
      },
      public_id: {
        type: String,
        required: false,
      },
    },
    biography: {
      type: String,
      default: "",
    },
    skillsByCategory: [
      {
        skillCategoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SkillCategory",
          required: true,
        },
      },
    ],
    portfolio: [
      {
        projectTitle: {
          type: String,
          default: "",
        },
        description: {
          type: String,
          default: "",
        },
        image: {
          url: {
            type: String,
            required: true,
          },
          public_id: {
            type: String,
            required: true,
          },
        },
      },
    ],
    experience: [
      {
        companyName: {
          type: String,
          required: true,
        },
        position: {
          type: String,
          required: true,
        },
        startYear: {
          type: Number,
          required: true,
        },
        endYear: {
          type: Number,
          default: null,
        },
        responsibilities: {
          type: String,
          default: "",
        },
      },
    ],
    certificates: [
      {
        url: {
          type: String,
          required: true,
        },
        public_id: {
          type: String,
          required: true,
        },
      },
    ],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],

    // ==================== ID VERIFICATION FIELDS ====================
    idPictureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IDPicture",
      default: null,
    },
    selfiePictureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Selfie",
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: [
        "not_submitted",
        "pending",
        "approved",
        "rejected",
        "requires_resubmission",
      ],
      default: "not_submitted",
    },
    idVerificationSubmittedAt: {
      type: Date,
      default: null,
    },
    idVerificationApprovedAt: {
      type: Date,
      default: null,
    },
    idVerificationRejectedAt: {
      type: Date,
      default: null,
    },
    idVerificationNotes: {
      type: String,
      default: "",
    },
    resubmissionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxResubmissionAttempts: {
      type: Number,
      default: 3,
    },

    // ==================== EXISTING WORKER FIELDS ====================
    status: {
      type: String,
      enum: ["available", "working", "not available"],
      default: "available",
    },
    currentJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: [0, "Total ratings cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== VIRTUAL FIELDS ====================

// Check if both ID documents are uploaded
WorkerSchema.virtual("hasCompleteIdVerification").get(function () {
  return !!(this.idPictureId && this.selfiePictureId);
});

// Check if can resubmit documents
WorkerSchema.virtual("canResubmit").get(function () {
  return this.resubmissionCount < this.maxResubmissionAttempts;
});

// Get verification status display text
WorkerSchema.virtual("verificationStatusText").get(function () {
  const statusMap = {
    not_submitted: "Not Submitted",
    pending: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
    requires_resubmission: "Requires Resubmission",
  };
  return statusMap[this.verificationStatus] || "Unknown";
});

// ==================== METHODS ====================

// Method to submit ID verification
WorkerSchema.methods.submitIdVerification = function (
  idPictureId,
  selfiePictureId
) {
  this.idPictureId = idPictureId;
  this.selfiePictureId = selfiePictureId;
  this.verificationStatus = "pending";
  this.idVerificationSubmittedAt = new Date();
  return this;
};

// Method to approve ID verification
WorkerSchema.methods.approveIdVerification = function (notes = "") {
  this.verificationStatus = "approved";
  this.idVerificationApprovedAt = new Date();
  this.idVerificationNotes = notes;
  return this;
};

// Method to reject ID verification
WorkerSchema.methods.rejectIdVerification = function (
  reason,
  requireResubmission = true
) {
  this.verificationStatus = requireResubmission
    ? "requires_resubmission"
    : "rejected";
  this.idVerificationRejectedAt = new Date();
  this.idVerificationNotes = reason;

  if (requireResubmission) {
    this.resubmissionCount += 1;
  }

  return this;
};

// ==================== INDEXES ====================
WorkerSchema.index({ credentialId: 1 });
WorkerSchema.index({ verificationStatus: 1 });
WorkerSchema.index({ idVerificationSubmittedAt: 1 });
WorkerSchema.index({ "address.city": 1, "address.province": 1 });

module.exports = mongoose.model("Worker", WorkerSchema);
