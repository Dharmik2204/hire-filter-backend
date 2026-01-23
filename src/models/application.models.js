import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    skills: [String],

    matchedSkills: [String],
    missingSkills: [String],

    score: {
      type: Number,
      default: 0,
    },

    resume: String,

    status: {
      type: String,
      enum: ["applied", "shortlisted", "rejected", "hired"],
      default: "applied",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Prevent duplicate applications
applicationSchema.index(
  { job: 1, user: 1 },
  { unique: true }
);

export const Application = mongoose.model("Application", applicationSchema);
