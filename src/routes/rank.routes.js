import express from "express";
import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";
import { getRankedCandidates, updateStatus, getPublicRankList } from "../controllers/rank.js";

const router = express.Router();

/* ================= HR / ADMIN ROUTES ================= */
router.get("/:jobId", authMiddleware, authorizeRoles("admin", "hr"), getRankedCandidates);
router.patch("/:applicationId/status", authMiddleware, authorizeRoles("admin", "hr"), updateStatus);

/* ================= USER ROUTES ================= */
router.get("/:jobId/public", authMiddleware, getPublicRankList);

export default router;
