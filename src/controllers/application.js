import {
  createApplication,
  getApplicationsByJob,
  getApplicationsByUser,
  findByJobAndCandidate,
  updateApplicationStatus,
} from "../repositories/application.repository.js";

import { getJobById } from "../repositories/job.repository.js";
import { findUserById } from "../repositories/user.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { isString } from "../utils/Validation.js";

/* ================= APPLY JOB & Create Application================= */

export const applyJobController = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    if (!jobId || !isString(jobId)) {
      return res.status(400).json(new ApiError(400, "Job ID is required as a string"));
    }

    const job = await getJobById(jobId);

    if (!job || job.jobStatus !== "Open") {
      return res.status(404).json(new ApiError(404, "Job not available"));
    }

    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const alreadyApplied = await findByJobAndCandidate(jobId, userId);

    if (alreadyApplied) {
      return res.status(409).json(new ApiError(409, "Already applied for this job"));
    }

    const application = await createApplication({
      jobId,
      userId,
      skills: user.skills
    });

    res.status(201).json(
      new ApiResponse(201, application, "Job applied successfully")
    );
  } catch (error) {
    console.error(error);
    res.status(500).json(new ApiError(500, "Apply job failed", [], error.stack));
  }
};

/* ================ get MYApplication =============== */
export const getMyApplicationsController = async (req, res) => {
  try {
    const applications = await getApplicationsByUser(req.user._id);

    res.status(200).json(
      new ApiResponse(200, applications, "Applications fetched successfully")
    );
  } catch (error) {
    res.status(500).json(new ApiError(500, "Failed to fetch my applications", [], error.stack));
  }
};


/* ================ get All Application (Hr/Admin)=============== */
export const getApplicationsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId || !isString(jobId)) {
      return res.status(400).json(new ApiError(400, "Job ID is required as a string"));
    }

    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found"));
    }

    const applications = await getApplicationsByJob(jobId);

    res.status(200).json(
      new ApiResponse(200, applications, "Applications fetched successfully")
    );
  } catch (error) {
    console.error("Get Applications Error:", error);
    res.status(500).json(new ApiError(500, "Failed to fetch applications", [], error.stack));
  }
};

/* ================ update Application (Hr/Admin) =============== */
export const updateApplicationStatusController = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (!applicationId || !isString(applicationId)) {
      return res.status(400).json(new ApiError(400, "Application ID is required as a string"));
    }

    if (!status || !isString(status)) {
      return res.status(400).json(new ApiError(400, "Status is required as a string"));
    }

    const allowedStatus = [
      "applied",
      "screening",
      "interviewing",
      "offer",
      "rejected",
      "archived",
    ];


    if (!allowedStatus.includes(status)) {
      return res.status(400).json(new ApiError(400, "Invalid application status"));
    }

    const updatedApplication = await updateApplicationStatus(
      applicationId,
      status);

    if (!updatedApplication) {
      return res.status(404).json(new ApiError(404, "Application not found"));
    }

    res.status(200).json(
      new ApiResponse(200, updatedApplication, "Application status updated")
    );
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json(new ApiError(500, "Failed to update application status", [], error.stack));
  }
};
