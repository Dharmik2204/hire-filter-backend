import cloudinary from "../config/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";


import {
  findUserById,
  updateUser,
  deleteUser,
} from "../repositories/user.repository.js";


import { updateProfileSchema } from "../validations/user.validation.js";

/* ================= GET PROFILE ================= */
export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const userObj = user.toObject();
    if (userObj.role === "hr" && typeof userObj.company === "string") {
      userObj.company = { name: userObj.company };
    }

    res.status(200).json(
      new ApiResponse(200, userObj, "User profile fetched successfully")
    );
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json(new ApiError(500, "Failed to fetch profile", [], error.stack));
  }
};

/* ================= UPDATE PROFILE ================= */
export const updateProfile = async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const updateData = {};
    const { name, email, phone, currentAddress, permanentAddress, profile, company } = value;

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    if (currentAddress) {
      Object.keys(currentAddress).forEach((key) => {
        updateData[`currentAddress.${key}`] = currentAddress[key];
      });
    }

    if (permanentAddress) {
      Object.keys(permanentAddress).forEach((key) => {
        updateData[`permanentAddress.${key}`] = permanentAddress[key];
      });
    }

    if (profile) {
      Object.keys(profile).forEach((key) => {
        updateData[`profile.${key}`] = profile[key];
      });
    }

    if (company) {
      // If the current field in DB is a string, we need to replace it with an object
      if (typeof req.user.company === "string") {
        updateData.company = company; // Replace the whole field
      } else {
        Object.keys(company).forEach((key) => {
          updateData[`company.${key}`] = company[key];
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(new ApiError(400, "No data to update"));
    }

    const updatedProfile = await updateUser(
      req.user._id,
      { $set: updateData }
    );

    if (!updatedProfile) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    res.status(200).json(
      new ApiResponse(200, updatedProfile, "Profile updated successfully")
    );

  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json(new ApiError(500, "Failed to update profile", [], error.stack));
  }
};

/* ================= DELETE PROFILE ================= */
export const deleteProfile = async (req, res) => {
  try {
    const user = await deleteUser(req.user._id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    res.status(200).json(
      new ApiResponse(200, null, "User deleted successfully")
    );
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json(new ApiError(500, "Failed to delete profile", [], error.stack));
  }
};
/* ===============uploadResume==========  */


/* ======================
   UPLOAD RESUME
====================== */
export const uploadResumeController = async (req, res) => {
  try {
    console.log("Inside uploadResumeController");
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);

    if (!req.file) {
      console.error("No resume file found in request");
      return res.status(400).json(new ApiError(400, "Resume is required"));
    }

    const user = await findUserById(req.user._id);
    if (!user) {
      return res.status(401).json(new ApiError(401, "User not found"));
    }

    /* 🔥 DELETE OLD RESUME FROM CLOUDINARY */
    if (user.profile?.resume?.public_id) {
      await cloudinary.uploader.destroy(
        user.profile.resume.public_id,
        { resource_type: "raw" }
      );
    }

    /* ✅ UPDATE USER RESUME */
    await updateUser(user._id, {
      $set: {
        "profile.resume": {
          url: req.file.path,
          public_id: req.file.filename,
        },
      },
    });

    res.status(200).json(
      new ApiResponse(200, null, "Resume uploaded successfully")
    );

  } catch (error) {
    console.error("Resume upload error:", error);
    res.status(500).json(new ApiError(500, "Resume processing failed", [], error.stack));
  }
};


/* ======================
   UPLOAD PROFILE IMAGE
====================== */
export const uploadProfileImageController = async (req, res) => {
  try {
    console.log("Inside uploadProfileImageController");
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);

    if (!req.file) {
      return res.status(400).json(
        new ApiError(400, "Profile image is required")
      );
    }

    const user = await findUserById(req.user._id);
    if (!user) {
      return res.status(401).json(new ApiError(401, "User not found"));
    }

    /* 🔥 DELETE OLD IMAGE FROM CLOUDINARY */
    if (user.profile?.image?.public_id) {
      await cloudinary.uploader.destroy(
        user.profile.image.public_id
      );
    }

    /* ✅ UPDATE PROFILE IMAGE */
    const updatedUser = await updateUser(user._id, {
      $set: {
        "profile.image": {
          url: req.file.path,
          public_id: req.file.filename,
        },
      },
    });

    res.status(200).json(
      new ApiResponse(200, updatedUser.profile.image.url, "Profile image uploaded successfully")
    );

  } catch (error) {
    console.error("Profile image upload error:", error);
    res.status(500).json(new ApiError(500, "Profile image upload failed", [], error.stack));
  }
};
