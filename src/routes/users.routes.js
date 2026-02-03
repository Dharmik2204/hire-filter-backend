import express from "express";
const router = express.Router();

import {
  getProfile,
  updateProfile,
  deleteProfile,
  uploadResumeController,
  uploadProfileImageController,
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
  (req, res, next) => {
    console.log("Endpoint hit: /upload-resume");
    console.log("Headers:", req.headers);
    next();
  },
  upload.single("resume"),
  uploadResumeController
);

router.post(
  "/upload-profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadProfileImageController
);

router.delete(
  "/deleteProfile",
  authMiddleware,
  authorizeRoles("user", "hr", "admin"),
  deleteProfile
);

export default router;
