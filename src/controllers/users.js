import cloudinary from "../config/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";


import {
  findUserById,
  updateUser,
  deleteUser,
} from "../repositories/user.repository.js";


/* ================= GET PROFILE ================= */
export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    res.status(200).json(
      new ApiResponse(200, user, "Profile fetched successfully")
    );
  } catch (error) {
    console.error("error: ", error);
    res.status(500).json(new ApiError(500, error.message));
  }
};

/* ================= UPDATE PROFILE ================= */
export const updateProfile = async (req, res) => {
  try {
    const updateData = {};

    /* BASIC FIELDS */
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.phone) updateData.phone = req.body.phone;

    /* PROFILE (NESTED SAFE UPDATE) */
    if (req.body.profile && typeof req.body.profile === "object") {
      Object.keys(req.body.profile).forEach((key) => {
        updateData[`profile.${key}`] = req.body.profile[key];
      });
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
    res.status(500).json(new ApiError(500, error.message));
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
    res.status(500).json(new ApiError(500, error.message));
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
    res.status(500).json(new ApiError(500, "Resume processing failed"));
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
    return res.status(500).json(new ApiError(500, "Profile image upload failed"));
  }
};
