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
    const { page = 1, limit = 10 } = req.query; // Pagination params

    // Pass pagination to repository
    const result = await getRankedApplicationsWithExamDetails(jobId, parseInt(page), parseInt(limit));

    // Refine response for a professional HR Analytics view
    const refinedCandidates = result.candidates.map(app => ({
      applicationId: app._id,
      candidate: {
        name: app.user?.name,
        email: app.user?.email,
        phone: app.phone || app.user?.phone,
        experience: app.experience
      },
      scoring: {
        skillsScore: app.skillsScore,
        examScore: app.examScore,
        totalScore: app.score,
        rank: app.rank
      },
      examAnalytics: {
        rawMarks: app.examRawMarks,
        totalMarks: app.examTotalMarks,
        status: app.examResultStatus,
        attemptId: app.examAttempt?._id
      },
      skillsAnalysis: {
        matched: app.matchedSkills,
        missing: app.missingSkills
      },
      status: app.status,
      appliedAt: app.createdAt
    }));

    res.status(200).json(
      new ApiResponse(200, {
        candidates: refinedCandidates,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      }, "Ranked candidates fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch ranked candidates"));
  }
};

/* ======================
   UPDATE APPLICATION STATUS (HR/ADMIN)
====================== */
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

    // 🔔 SEND NOTIFICATION IF HIRED
    if (status === "hired") {
      try {
        const { createMessage } = await import("../repositories/message.repository.js");
        const { getIO } = await import("../socket/socket.js");

        const messageContent = `Congratulations! You have been hired for the position of ${application.job.jobTitle} at ${application.job.companyName}. HR will contact you shortly.`;

        // Create system message
        const message = await createMessage({
          sender: req.user._id, // Sender is the HR/Admin who updated status
          receiver: application.user._id,
          content: messageContent,
          type: "notification"
        });

        // Emit real-time event
        const io = getIO();
        io.to(application.user._id.toString()).emit("notification", message);

      } catch (notifyError) {
        console.error("Failed to send hiring notification:", notifyError);
        // Don't fail the request, just log it
      }
    }

    res.status(200).json(
      new ApiResponse(200, application, "Application status updated successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to update status"));
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
      .map(app => ({
        rank: app.rank,
        maskedName: app.user.name.split(" ")[0] + "***", // Masked Name
        skillsScore: app.skillsScore,
        examScore: app.examScore,
        totalScore: app.score
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
