import cloudinary from "../config/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";


import {
  findUserById,
  updateUser,
  deleteUser,
  findAllUsersAndHrs,
} from "../repositories/user.repository.js";
import { deleteApplicationsByUserId } from "../repositories/application.repository.js";
import { deleteJobsByUserId } from "../repositories/job.repository.js";



import { updateProfileSchema } from "../validations/user.validation.js";
import { formatUserResponse } from "../utils/userFormatter.js";

/* ================= GET PROFILE ================= */
export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const formattedUser = formatUserResponse(user);

    res.status(200).json(
      new ApiResponse(200, formattedUser, "User profile fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch profile"));
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

    const formattedProfile = formatUserResponse(updatedProfile);

    res.status(200).json(
      new ApiResponse(200, formattedProfile, "Profile updated successfully")
    );

  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to update profile"));
  }
};

/* ================= DELETE PROFILE ================= */
export const deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Find user to get Cloudinary IDs
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    // 2. Clear Cloudinary files
    if (user.profile?.resume?.public_id) {
      await cloudinary.uploader.destroy(user.profile.resume.public_id, { resource_type: "raw" });
    }

    if (user.profile?.image?.public_id) {
      await cloudinary.uploader.destroy(user.profile.image.public_id);
    }

    // 3. Delete associated data
    await deleteApplicationsByUserId(userId);
    await deleteJobsByUserId(userId);

    // 4. Delete the User record
    const result = await deleteUser(userId);

    if (result.deletedCount === 0) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    res.status(200).json(
      new ApiResponse(200, null, "User profile and associated data deleted successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to delete profile"));
  }
};

/* ================= ADMIN: GET ALL USERS & HRS ================= */
export const getAllUsersAndHrs = async (req, res) => {
  try {
    const users = await findAllUsersAndHrs();

    // Optional: Format users if needed, or send as is (excluding password)
    // const formattedUsers = users.map(user => formatUserResponse(user));

    res.status(200).json(
      new ApiResponse(200, users, "All users and HRs fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch users"));
  }
};

/* ================= ADMIN: DELETE USER ================= */
export const adminDeleteUser = async (req, res) => {
  try {
    const { id } = req.params; // Admin provides the ID of the user to delete

    // 1. Find user (to get Cloudinary IDs)
    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Prevent admin from deleting themselves via this route if needed, 
    // though 'deleteProfile' handles self-deletion.
    // If you want to prevent One Admin from deleting Another Admin:
    if (user.role === 'admin') {
      return res.status(403).json(new ApiError(403, "Cannot delete another admin account"));
    }

    // 2. Clear Cloudinary files
    if (user.profile?.resume?.public_id) {
      await cloudinary.uploader.destroy(user.profile.resume.public_id, { resource_type: "raw" });
    }

    if (user.profile?.image?.public_id) {
      await cloudinary.uploader.destroy(user.profile.image.public_id);
    }

    // 3. Delete associated data
    await deleteApplicationsByUserId(id);
    await deleteJobsByUserId(id);

    // 4. Delete the User record
    const result = await deleteUser(id);

    if (result.deletedCount === 0) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    res.status(200).json(
      new ApiResponse(200, null, "User deleted successfully by admin")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to delete user"));
  }
};

/* ===============uploadResume==========  */


/* ======================
   UPLOAD RESUME
====================== */
export const uploadResumeController = async (req, res) => {
  try {
    if (!req.file) {
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
    res.status(500).json(formatError(error, 500, "Resume processing failed"));
  }
};


/* ======================
   UPLOAD PROFILE IMAGE
====================== */
export const uploadProfileImageController = async (req, res) => {
  try {
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
    res.status(500).json(formatError(error, 500, "Profile image upload failed"));
  }
};
