import { getRankedApplicationsWithExamDetails, updateApplicationStatus } from "../repositories/application.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { updateRankStatusSchema, getRankedCandidatesSchema, assignRankSchema } from "../validations/rank.validation.js";

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
    const { page = 1, limit = 10 } = req.query; // Pagination params

    // Pass pagination to repository
    const result = await getRankedApplicationsWithExamDetails(jobId, parseInt(page), parseInt(limit));

    res.status(200).json(
      new ApiResponse(200, result, "Ranked candidates fetched successfully")
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

/* ======================
   ASSIGN RANK (HR/ADMIN)
====================== */
export const assignRank = async (req, res) => {
  try {
    const { error, value } = assignRankSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const { rankings } = value;
    const { updateApplicationRanks } = await import("../repositories/application.repository.js");

    await updateApplicationRanks(rankings);

    res.status(200).json(
      new ApiResponse(200, null, "Ranks assigned successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to assign ranks"));
  }
};

/* ======================
   GET PUBLIC RANK LIST (USER)
====================== */
export const getPublicRankList = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate Job ID - Basic check, could be improved with mongoose.isValidObjectId
    if (!jobId) {
      return res.status(400).json(new ApiError(400, "Job ID is required"));
    }

    // Reuse existing repository function with pagination
    const result = await getRankedApplicationsWithExamDetails(jobId, parseInt(page), parseInt(limit));

    // Filter for ranked candidates only (rank > 0) and sanitize data
    // Note: If repository returns paginated object, we need to map candidates inside it.
    // Assuming repository now returns { candidates: [], total, page, pages }

    // If we haven't updated repo yet, this will break. 
    // We should update repo first usually, but since we're here... 
    // The repo update is next step. We assume it returns the structured object.

    const publicCandidates = result.candidates
      .filter(app => app.rank > 0)
      .map(app => ({
        rank: app.rank,
        maskedName: app.user.name.split(" ")[0] + "***", // Masked Name
        score: app.examAttempt ? app.examAttempt.score : app.score
      }));

    res.status(200).json(
      new ApiResponse(200, {
        candidates: publicCandidates,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      }, "Rank list fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch rank list"));
  }
};
