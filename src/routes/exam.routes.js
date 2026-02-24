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
   addExamFeedbackController,
   getAttemptDetailsController
} from "../controllers/exam.js";

import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";
import { validateObjectIdParams } from "../middlewares/validateObjectId.middleware.js";

const router = express.Router();



/* =====================
   HR ROUTES
===================== */
router.post("/", authMiddleware, authorizeRoles("hr", "admin"), createExamController);
router.get("/job/:jobId", validateObjectIdParams, authMiddleware, getExamByJobController);
router.get("/:examId/attempts", validateObjectIdParams, authMiddleware, authorizeRoles("hr", "admin"), getExamAttemptsController);
router.get("/attempt/:attemptId", validateObjectIdParams, authMiddleware, authorizeRoles("hr", "admin"), getAttemptDetailsController);
router.delete("/:examId", validateObjectIdParams, authMiddleware, authorizeRoles("hr", "admin"), deleteExamController);

/* =====================
   USER ROUTES
===================== */
router.post("/start", validateObjectIdParams, authMiddleware, startExamController);
router.post("/:attemptId/submit", validateObjectIdParams, authMiddleware, submitExamController);

/* =====================
   SYSTEM / ADMIN
===================== */
// router.post("/:attemptId/evaluate", authMiddleware, authorizeRoles("admin", "hr"), evaluateExamController);
router.patch("/:attemptId/feedback", validateObjectIdParams, authMiddleware, authorizeRoles("admin", "hr"), addExamFeedbackController);

/* =====================
   USER REPORT
===================== */
router.get("/my-result/:examId", validateObjectIdParams, authMiddleware, authorizeRoles("user"), getMyExamResult);

export default router;
