import express from "express";
const router = express.Router();

import {
  getProfile,
  updateProfile,
  deleteProfile,
  uploadResumeController,
  uploadProfileImageController,
  uploadCoverImageController,
  getAllUsersAndHrs,
  adminDeleteUser,
} from "../controllers/users.js";

import {
  authorizeRoles,
  authMiddleware,
} from "../middlewares/authorize.middlewares.js";

import upload from "../middlewares/upload.middlewares.js";

/* =====================
   PROFILE ROUTES
===================== */

router.get(
  "/getProfile",
  authMiddleware,
  authorizeRoles("user", "hr", "admin"),
  getProfile
);

router.put(
  "/updateProfile",
  authMiddleware,
  authorizeRoles("user", "hr", "admin"),
  updateProfile
);

/* =====================
   CLOUDINARY UPLOADS
===================== */

router.post(
  "/upload-resume",
  authMiddleware,
  authorizeRoles("user"),
  upload.single("resume"),
  uploadResumeController
);

router.post(
  "/upload-profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadProfileImageController
);

router.post(
  "/upload-cover-image",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  upload.single("coverImage"),
  uploadCoverImageController
);

router.delete(
  "/deleteProfile",
  authMiddleware,
  authorizeRoles("user", "hr", "admin"),
  deleteProfile
);

/* =====================
   ADMIN ROUTES
===================== */

router.get(
  "/admin/all-users",
  authMiddleware,
  authorizeRoles("admin"),
  getAllUsersAndHrs
);

router.delete(
  "/admin/user/:id",
  authMiddleware,
  authorizeRoles("admin"),
  adminDeleteUser
);

export default router;
