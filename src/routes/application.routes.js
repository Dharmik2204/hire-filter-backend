import express from "express";
import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";

import {
  getApplicationsForJob,
  updateApplicationStatusController,
  getRankedApplicationsController,
  applyJobController,
  getMyApplicationsController

} from "../controllers/application.js";

const router = express.Router();

router.post(
  "/:jobId/apply",
  authMiddleware,
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

router.get("/:jobId/ranked",
  authMiddleware,
  authorizeRoles("admin","hr"),
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
