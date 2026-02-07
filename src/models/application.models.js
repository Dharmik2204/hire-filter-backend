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

    linkedinProfile: {
      type: String,
      trim: true,
    },
    portfolioWebsite: {
      type: String,
      trim: true,
    },

    workExperience: [
      {
        companyName: { type: String, trim: true },
        role: { type: String, trim: true },
        duration: { type: String, trim: true },
        accomplishments: { type: String, trim: true },
      },
    ],

    education: [
      {
        institution: { type: String, trim: true },
        degree: { type: String, trim: true },
        year: { type: String, trim: true },
      },
    ],

    projects: [
      {
        projectName: { type: String, trim: true },
        projectLink: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],

    experience: {
      type: Number,
      default: 0,
    },

    phone: {
      type: String,
    },

    score: {
      type: Number,
      default: 0,
    },

    resume: String,

    coverLetter: {
      type: String,
      trim: true,
    },

    desiredSalary: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "applied",
        "screening",
        "interviewing",
        "offer",
        "rejected",
        "archived"
      ],
      default: "applied",
    }
    ,

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
