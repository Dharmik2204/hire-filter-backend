// Assuming these services exist, otherwise this might fail.
// Based on other controllers, it seems repositories are used more often.
// If services/application.service doesn't exist, I might need to adjust this.
// However, the task is to standardize responses, so I will stick to that and fix the module format.

import { getRankedApplications, updateApplicationStatus } from "../repositories/application.repository.js";
// Note: Added .js extension for consistency if it's an ESM project.
// If service doesn't exist, I'll have to investigate further. But first let's list dir.

import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { isString } from "../utils/Validation.js";

export const getRankedCandidates = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId || !isString(jobId)) {
      return res.status(400).json(new ApiError(400, "Job ID is required as a string"));
    }
    const applications = await getRankedApplications(jobId);
    res.status(200).json(
      new ApiResponse(200, applications, "Ranked candidates fetched successfully")
    );
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["shortlisted", "rejected", "hired"].includes(status)) {
      return res.status(400).json(new ApiError(400, "Invalid status"));
    }

    const application = await updateApplicationStatus(
      req.params.applicationId,
      status
    );

    res.status(200).json(
      new ApiResponse(200, application, "Status updated successfully")
    );
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message));
  }
};
