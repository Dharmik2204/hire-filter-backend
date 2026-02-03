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

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
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
    },

    currentAddress: addressSchema,
    permanentAddress: addressSchema,

    profile: {
      image: {
        url: String,
        public_id: String,
      },
      skills: [{ type: String, trim: true }],

      experience: {
        type: Number, // in years
        default: 0,
      },

      education: String,

      resume: {
        url: String,
        public_id: String,
      },

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

  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);
