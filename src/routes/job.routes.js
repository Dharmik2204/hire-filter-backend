import express from "express";
import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";


import {
  createJobController,
  updateJobController,
  deleteJobController,
  getJobByIdController,
  getJobsController,
  applyJobController,
  deleteHardJobController
} from "../controllers/job.js";


export const router = express.Router();

router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "hr"),
  createJobController
);


router.post(
  "/:jobId/apply",
  authMiddleware,
  applyJobController
);

router.get("/", getJobsController);
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
