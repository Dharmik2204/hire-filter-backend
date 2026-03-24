import express from "express";
import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";

import {
  createJobController,
  updateJobController,
  deleteJobController,
  getJobByIdController,
  getJobsController,
  deleteHardJobController,
  getJobStatsController,
  getJobsAdminController,
  toggleSaveJobController,
  getSavedJobsController
} from "../controllers/job.js";

export const router = express.Router();

router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  createJobController
);

router.get("/", getJobsController);

/* =====================
   ADMIN / STATS ROUTES
===================== */

router.get(
  "/stats",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  getJobStatsController
);

router.get(
  "/admin/all-jobs",
  authMiddleware,
  authorizeRoles("admin"),
  getJobsAdminController
);

/* =====================
   SAVED JOBS ROUTES
===================== */

router.post(
  "/toggle-save/:id",
  authMiddleware,
  authorizeRoles("user"),
  toggleSaveJobController
);

router.get(
  "/saved",
  authMiddleware,
  authorizeRoles("user"),
  getSavedJobsController
);

router.get("/:id", getJobByIdController);

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  updateJobController
);

router.delete(
  "/soft/:id",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  deleteJobController
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  deleteHardJobController
);

export default router;
