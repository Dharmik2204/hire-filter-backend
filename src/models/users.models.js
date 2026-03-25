import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: "India",
    },
    pincode: {
      type: String,
    },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    url: String,
    public_id: String,
    resource_type: String,
    type: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function() { return this.isEmailVerified || this.isPhoneVerified; },
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: function() { return this.isEmailVerified || this.isPhoneVerified; },
    },

    role: {
      type: String,
      enum: ["admin", "hr", "user"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    token: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
    },

    currentAddress: addressSchema,
    permanentAddress: addressSchema,

    profile: {
      image: assetSchema,
      skills: [{ type: String, trim: true }],

      experience: {
        type: Number, // in years
        default: 0,
      },

      education: String,

      resume: assetSchema,

      coverImage: assetSchema,

      portfolio: String, // GitHub / Portfolio URL
      bio: String,
    },

    company: {
      name: String,
      website: String,
      location: String,
      industry: String,
      description: String,
    },

    permissions: {
      type: [String],
      default: [],
    },

    otp: {
      type: String,
      default: null
    },
    otpExpiry: {
      type: Number,
      default: null
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    profileVisits: {
      type: Number,
      default: 0,
    },
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],

  },
  {
    timestamps: true,
  }
);

userSchema.index({ savedJobs: 1 });

// Prevent re-compilation issues during hot-reload
export const User = mongoose.models.User || mongoose.model("User", userSchema);
