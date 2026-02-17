import express from "express";
import {
   createExamController,
   startExamController,
   submitExamController,
   evaluateExamController,
   getExamByJobController,
   getExamAttemptsController,
   deleteExamController,
   getMyExamResult,
   updateExamResultController,
   getAttemptDetailsController
} from "../controllers/exam.js";

import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";

const router = express.Router();

/* =====================
   HR ROUTES
===================== */
router.post("/", authMiddleware, authorizeRoles("hr", "admin"), createExamController);
router.get("/job/:jobId", authMiddleware, getExamByJobController);
router.get("/:examId/attempts", authMiddleware, authorizeRoles("hr", "admin"), getExamAttemptsController);
router.get("/attempt/:attemptId", authMiddleware, authorizeRoles("hr", "admin"), getAttemptDetailsController);
router.delete("/:examId", authMiddleware, authorizeRoles("hr", "admin"), deleteExamController);

/* =====================
   USER ROUTES
===================== */
router.post("/start", authMiddleware, startExamController);
router.post("/:attemptId/submit", authMiddleware, submitExamController);

/* =====================
   SYSTEM / ADMIN
===================== */
router.post("/:attemptId/evaluate", authMiddleware, authorizeRoles("admin", "hr"), evaluateExamController);
router.patch("/:attemptId/result", authMiddleware, authorizeRoles("admin", "hr"), updateExamResultController);

/* =====================
   USER REPORT
===================== */
router.get("/my-result/:examId", authMiddleware, getMyExamResult);

export default router;
