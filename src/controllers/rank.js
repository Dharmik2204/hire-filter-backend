import { getRankedApplicationsWithExamDetails, updateApplicationStatus } from "../repositories/application.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { updateRankStatusSchema, getRankedCandidatesSchema } from "../validations/rank.validation.js";

/* ======================
   GET RANKED CANDIDATES (HR/ADMIN)
====================== */
export const getRankedCandidates = async (req, res) => {
  try {
    const { error, value } = getRankedCandidatesSchema.validate(req.params, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const { jobId } = value;
    const rankedCandidates = await getRankedApplicationsWithExamDetails(jobId);

    res.status(200).json(
      new ApiResponse(200, rankedCandidates, "Ranked candidates fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch ranked candidates"));
  }
};

/* ======================
   UPDATE APPLICATION STATUS (HR/ADMIN)
====================== */
export const updateStatus = async (req, res) => {
  try {
    const { error, value } = updateRankStatusSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const { status } = value;
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json(new ApiError(400, "Application ID is required"));
    }

    const application = await updateApplicationStatus(applicationId, status);

    if (!application) {
      return res.status(404).json(new ApiError(404, "Application not found"));
    }

    res.status(200).json(
      new ApiResponse(200, application, "Application status updated successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to update status"));
  }
};
