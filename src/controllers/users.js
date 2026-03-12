import cloudinary from "../config/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";


import {
  findUserById,
  deleteUser,
  findAllUsersAndHrs,
  updateUser, // Add this if not already there, but it seems to be in use
} from "../repositories/user.repository.js";
import { deleteApplicationsByUserId } from "../repositories/application.repository.js";
import { deleteJobsByUserId } from "../repositories/job.repository.js";



import { updateProfileSchema } from "../validations/user.validation.js";
import { formatUserResponse } from "../utils/userFormatter.js";
import path from "path";
import { 
  buildResumeResponse, 
  resolveCloudinaryAssetInfo, 
  uploadOnCloudinary, 
  deleteFromCloudinary,
  getSignedUrl 
} from "../config/cloudinary.js";

/* ================= GET PROFILE ================= */
export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const formattedUser = formatUserResponse(user);

    // Sign all profile assets if they exist
    if (formattedUser.profile) {
      if (formattedUser.profile.resume) {
        formattedUser.profile.resume = buildResumeResponse(formattedUser.profile.resume);
      }
      if (formattedUser.profile.image) {
        formattedUser.profile.image.url = getSignedUrl(user.profile.image.public_id, { sourceUrl: user.profile.image.url }) || user.profile.image.url;
      }
      if (formattedUser.profile.coverImage) {
        formattedUser.profile.coverImage.url = getSignedUrl(user.profile.coverImage.public_id, { sourceUrl: user.profile.coverImage.url }) || user.profile.coverImage.url;
      }
    }

    res.status(200).json(
      new ApiResponse(200, formattedUser, "User profile fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch profile"));
  }
};

/* ================= GET USER UPLOADS ================= */
export const getUserUploads = async (req, res) => {
  try {
    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const resumeResponse = buildResumeResponse(user.profile?.resume);

    const uploads = {
      resume: resumeResponse,
      resumeDownload: resumeResponse?.downloadUrl || null,
      profileImage: getSignedUrl(user.profile?.image?.public_id, { sourceUrl: user.profile?.image?.url }) || user.profile?.image?.url || null,
      coverImage: getSignedUrl(user.profile?.coverImage?.public_id, { sourceUrl: user.profile?.coverImage?.url }) || user.profile?.coverImage?.url || null,
    };

    res.status(200).json(
      new ApiResponse(200, uploads, "User uploads fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch user uploads"));
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
      const resume = user.profile.resume;
      const resolved = resolveCloudinaryAssetInfo({
        resourceType: resume.resource_type,
        type: resume.type,
        sourceUrl: resume.url,
      });
      const resumeResourceType = resolved.resourceType || "raw";
      await deleteFromCloudinary(resume.public_id, resumeResourceType, resolved.type);
    }

    if (user.profile?.image?.public_id) {
      await deleteFromCloudinary(user.profile.image.public_id);
    }

    if (user.profile?.coverImage?.public_id) {
      await deleteFromCloudinary(user.profile.coverImage.public_id);
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

    const formattedUsers = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;
      if (userObj.profile) {
        if (userObj.profile.image) {
          userObj.profile.image.url = getSignedUrl(userObj.profile.image.public_id, { sourceUrl: userObj.profile.image.url }) || userObj.profile.image.url;
        }
        if (userObj.profile.coverImage) {
          userObj.profile.coverImage.url = getSignedUrl(userObj.profile.coverImage.public_id, { sourceUrl: userObj.profile.coverImage.url }) || userObj.profile.coverImage.url;
        }
      }
      return userObj;
    });

    res.status(200).json(
      new ApiResponse(200, formattedUsers, "All users and HRs fetched successfully")
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
      const resume = user.profile.resume;
      const resolved = resolveCloudinaryAssetInfo({
        resourceType: resume.resource_type,
        type: resume.type,
        sourceUrl: resume.url,
      });
      const resumeResourceType = resolved.resourceType || "raw";
      await deleteFromCloudinary(resume.public_id, resumeResourceType, resolved.type);
    }

    if (user.profile?.image?.public_id) {
      await deleteFromCloudinary(user.profile.image.public_id);
    }

    if (user.profile?.coverImage?.public_id) {
      await deleteFromCloudinary(user.profile.coverImage.public_id);
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

import fs from "fs";

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

    // 🔥 CLEANUP OLD RESUME
    if (user.profile?.resume?.public_id) {
      /* IF CLOUDINARY */
      const resume = user.profile.resume;
      const resolved = resolveCloudinaryAssetInfo({
        resourceType: resume.resource_type,
        type: resume.type,
        sourceUrl: resume.url,
      });
      const resumeResourceType = resolved.resourceType || "raw";
      await deleteFromCloudinary(resume.public_id, resumeResourceType, resolved.type);
    } else if (user.profile?.resume?.url?.includes("/temp/")) {
      /* IF LOCAL FALLBACK */
      try {
        const oldFileName = user.profile.resume.url.split("/").pop();
        const oldPath = path.join("public", "temp", oldFileName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) { console.error("Old local resume cleanup failed:", e); }
    }

    /* 🚀 UPLOAD TO CLOUDINARY WITH LOCAL FALLBACK */
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path, "resumes");

    let resumeData;
    if (cloudinaryResponse) {
      resumeData = {
        url: cloudinaryResponse.secure_url,
        public_id: cloudinaryResponse.public_id,
        resource_type: cloudinaryResponse.resource_type,
        type: cloudinaryResponse.type,
      };
      fs.unlinkSync(req.file.path);
    } else {
      resumeData = {
        url: `${req.protocol}://${req.get("host")}/temp/${req.file.filename}`,
        public_id: null,
        resource_type: null,
        type: null,
      };
    }

    /* ✅ UPDATE USER RESUME */
    await updateUser(user._id, {
      $set: { "profile.resume": resumeData },
    });

    const responseData = buildResumeResponse(resumeData);

    res.status(200).json(new ApiResponse(200, responseData, "Resume uploaded successfully"));

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
      return res.status(400).json(new ApiError(400, "Profile image is required"));
    }

    const user = await findUserById(req.user._id);
    if (!user) {
      return res.status(401).json(new ApiError(401, "User not found"));
    }

    // 🔥 CLEANUP OLD PROFILE IMAGE
    if (user.profile?.image?.public_id) {
      /* IF CLOUDINARY */
      await deleteFromCloudinary(user.profile.image.public_id, user.profile.image.resource_type || "image", user.profile.image.type);
    } else if (user.profile?.image?.url?.includes("/temp/")) {
      /* IF LOCAL FALLBACK */
      try {
        const oldFileName = user.profile.image.url.split("/").pop();
        const oldPath = path.join("public", "temp", oldFileName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) { console.error("Old local image cleanup failed:", e); }
    }

    /* 🚀 UPLOAD TO CLOUDINARY WITH LOCAL FALLBACK */
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path, "profile-images");

    let imageData;
    if (cloudinaryResponse) {
      imageData = {
        url: cloudinaryResponse.secure_url,
        public_id: cloudinaryResponse.public_id,
        resource_type: cloudinaryResponse.resource_type,
        type: cloudinaryResponse.type,
      };
      fs.unlinkSync(req.file.path);
    } else {
      imageData = {
        url: `${req.protocol}://${req.get("host")}/temp/${req.file.filename}`,
        public_id: null,
        resource_type: null,
        type: null,
      };
    }

    /* ✅ UPDATE PROFILE IMAGE */
    await updateUser(user._id, {
      $set: { "profile.image": imageData },
    });

    const finalImageData = { ...imageData };
    if (finalImageData.public_id) {
      finalImageData.url = getSignedUrl(finalImageData.public_id, { sourceUrl: finalImageData.url }) || finalImageData.url;
    }

    res.status(200).json(new ApiResponse(200, finalImageData, "Profile image uploaded successfully"));

  } catch (error) {
    res.status(500).json(formatError(error, 500, "Profile image upload failed"));
  }
};

/* ======================
   UPLOAD COVER IMAGE (HR BANNER)
====================== */
export const uploadCoverImageController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(new ApiError(400, "Cover image is required"));
    }

    const user = await findUserById(req.user._id);
    if (!user) {
      return res.status(401).json(new ApiError(401, "User not found"));
    }

    // 🔥 CLEANUP OLD COVER IMAGE
    if (user.profile?.coverImage?.public_id) {
      /* IF CLOUDINARY */
      await deleteFromCloudinary(user.profile.coverImage.public_id, user.profile.coverImage.resource_type || "image", user.profile.coverImage.type);
    } else if (user.profile?.coverImage?.url?.includes("/temp/")) {
      /* IF LOCAL FALLBACK */
      try {
        const oldFileName = user.profile.coverImage.url.split("/").pop();
        const oldPath = path.join("public", "temp", oldFileName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) { console.error("Old local cover cleanup failed:", e); }
    }

    /* 🚀 UPLOAD TO CLOUDINARY WITH LOCAL FALLBACK */
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path, "cover-images");

    let coverData;
    if (cloudinaryResponse) {
      coverData = {
        url: cloudinaryResponse.secure_url,
        public_id: cloudinaryResponse.public_id,
        resource_type: cloudinaryResponse.resource_type,
        type: cloudinaryResponse.type,
      };
      fs.unlinkSync(req.file.path);
    } else {
      coverData = {
        url: `${req.protocol}://${req.get("host")}/temp/${req.file.filename}`,
        public_id: null,
        resource_type: null,
        type: null,
      };
    }

    /* ✅ UPDATE COVER IMAGE */
    await updateUser(user._id, {
      $set: { "profile.coverImage": coverData },
    });

    const finalCoverData = { ...coverData };
    if (finalCoverData.public_id) {
      finalCoverData.url = getSignedUrl(finalCoverData.public_id, { sourceUrl: finalCoverData.url }) || finalCoverData.url;
    }

    res.status(200).json(new ApiResponse(200, finalCoverData, "Cover image uploaded successfully"));

  } catch (error) {
    res.status(500).json(formatError(error, 500, "Cover image upload failed"));
  }
};
