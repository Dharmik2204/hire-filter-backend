import express from "express";
import { authorizeRoles,authMiddleware } from "../middlewares/authorize.middlewares.js";

import {
  getApplicationsForJob,
  updateApplicationStatusController,
  getRankedApplicationsController
} from "../controllers/application.js";

const router = express.Router();

/* ================= HR / ADMIN VIEW APPLICATIONS ================= */
router.get(
  "/:jobId/getAll",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  getApplicationsForJob
);

router.get("/:jobId/ranked",
  authMiddleware,
  authorizeRoles,
  getRankedApplicationsController
)

/* ================= UPDATE APPLICATION STATUS ================= */
router.patch(
  "/:applicationId/status",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  updateApplicationStatusController
);

export default router;
