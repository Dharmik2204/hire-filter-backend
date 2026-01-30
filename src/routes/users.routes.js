import express from "express";
const router = express.Router();

import { getProfile, updateProfile, deleteProfile, } from "../controllers/users.js";
import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";
import upload from "../middlewares/upload.middlewares.js";
import { uploadResumeController, uploadProfileImageController } from "../controllers/users.js";

router.get("/getProfile", authMiddleware, authorizeRoles("user","hr","admin"), getProfile);

router.put("/updateProfile", authMiddleware, authorizeRoles("user","hr","admin"), updateProfile);

router.post(
  "/upload-resume",
  authMiddleware,
  upload.single("resume"),
  uploadResumeController
);

router.post(
  "/upload-profile-image",
  authMiddleware,
  upload.single("profileImage"),
  uploadProfileImageController
);

router.delete("/deleteProfile", authMiddleware, authorizeRoles, deleteProfile);

export default router;