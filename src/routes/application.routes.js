import express from "express";
import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";

import {
  getApplicationsForJob,
  updateApplicationStatusController,
  applyJobController,
  getMyApplicationsController,
  deleteApplicationController

} from "../controllers/application.js";

const router = express.Router();

router.post(
  "/:jobId/apply",
  authMiddleware,
  authorizeRoles("user"),
  applyJobController
);


router.get(
  "/my",
  authMiddleware,
  getMyApplicationsController
)

/* ================= HR / ADMIN VIEW APPLICATIONS ================= */
router.get(
  "/:jobId/getAll",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  getApplicationsForJob
);


/* ================= UPDATE APPLICATION STATUS ================= */
router.patch(
  "/:applicationId/status",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  updateApplicationStatusController
);

/* ================= DELETE APPLICATION (Hr/Admin) ================= */
router.delete(
  "/:applicationId",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  deleteApplicationController
);

export default router;
