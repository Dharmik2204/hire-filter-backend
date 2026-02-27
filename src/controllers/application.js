import {
  createApplication,
  getApplicationsByJob,
  getApplicationsByUser,
  findByJobAndCandidate,
  updateApplicationStatus,
  deleteApplicationById,
} from "../repositories/application.repository.js";
import mongoose from "mongoose";


import { getJobById } from "../repositories/job.repository.js";
import {
  findUserById,
  incrementProfileVisits
} from "../repositories/user.repository.js";
import {
  getOrCreateConversation,
  createMessage,
  updateConversationLastMessage
} from "../repositories/message.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import {
  createApplicationSchema,
  updateApplicationSchema
} from "../validations/application.validation.js";
import { getRankedCandidatesSchema } from "../validations/rank.validation.js";
import { findApplicationWithDetails } from "../repositories/application.repository.js";

/* ================= APPLY JOB & Create Application================= */

export const applyJobController = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    if (jobId && !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json(new ApiError(400, "Job ID is not valid"));
    }

    // 1. Fetch Job and User first to get profile data for fallback
    const job = await getJobById(jobId);
    if (!job || job.jobStatus !== "Open") {
      return res.status(404).json(new ApiError(404, "Job not available", ["Job not available"]));
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found", ["User not found"]));
    }

    const alreadyApplied = await findByJobAndCandidate(jobId, userId);
    if (alreadyApplied) {
      return res.status(409).json(new ApiError(409, "Already applied for this job", ["Already applied for this job"]));
    }

    // 2. Merge Request Body with User Profile Data
    // Priority: Request Body > User Profile > Default
    const applicationData = {
      jobId,
      candidateId: userId.toString(),
      skills: req.body.skills || user.profile?.skills || [],
      experience: req.body.experience !== undefined ? req.body.experience : (user.profile?.experience || 0),
      education: req.body.education || user.profile?.education || [],
      phone: req.body.phone || user.phone || "",
      linkedinProfile: req.body.linkedinProfile || user.profile?.linkedin || "",
      portfolioWebsite: req.body.portfolioWebsite || user.profile?.portfolio || "",
      workExperience: req.body.workExperience || [],
      projects: req.body.projects || [],
      coverLetter: req.body.coverLetter || "",
      desiredSalary: req.body.desiredSalary || "",
    };

    // 3. Validate the MERGED data
    const { error, value } = createApplicationSchema.validate(applicationData, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    // Destructure validated values
    const {
      skills: applicationSkills,
      experience: applicationExperience,
      education: applicationEducation,
      phone: applicationPhone,
      linkedinProfile: applicationLinkedin,
      portfolioWebsite: applicationPortfolio,
      workExperience: applicationWorkExp,
      projects: applicationProjects,
      coverLetter: applicationCoverLetter,
      desiredSalary: applicationSalary
    } = value;

    /* ================= SCORING LOGIC ================= */
    let skillsScore = 0;
    const matchedSkills = [];
    const missingSkills = [];

    // 1. Skills Scoring (50% Weight)
    if (job.requiredSkills && job.requiredSkills.length > 0) {
      const jobSkills = job.requiredSkills.map(s => s.toLowerCase());
      const userSkills = applicationSkills.map(s => s.toLowerCase());

      jobSkills.forEach(skill => {
        if (userSkills.includes(skill)) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      });

      // (Match Ratio) * 50
      skillsScore = (matchedSkills.length / jobSkills.length) * 50;
    } else {
      // If no required skills are defined, the candidate gets full credit for the skills portion
      skillsScore = 50;
    }

    // Handle Fresher / Experience Validation
    // Even if weight is removed from score, we still check against job requirements
    const minExp = job.experience?.min || 0;
    const maxExp = job.experience?.max || Infinity;

    // Check if within range (Optional: you might want to allow application even if out of range, 
    // but here we check for validity if specified)
    if (applicationExperience < minExp && minExp > 0) {
      // We can log this or handle it as a soft warning, for now we keep the application valid 
      // but it gets no extra points (weight is 0 anyway).
    }

    // Final Initial Score (Skills Only at this stage)
    const totalScore = Math.round(skillsScore);

    const application = await createApplication({
      jobId,
      userId,
      skills: applicationSkills,
      matchedSkills,
      missingSkills,
      experience: applicationExperience,
      education: applicationEducation,
      phone: applicationPhone,
      score: totalScore,
      skillsScore: Math.round(skillsScore),
      examScore: 0,
      examRawMarks: 0,
      examTotalMarks: 0,
      examResultStatus: "pending",
      linkedinProfile: applicationLinkedin,
      portfolioWebsite: applicationPortfolio,
      workExperience: applicationWorkExp,
      projects: applicationProjects,
      coverLetter: applicationCoverLetter,
      desiredSalary: applicationSalary
    });

    // 🎯 Trigger Re-ranking immediately so the candidate appears in lists
    try {
      const { recalculateRanks } = await import("../utils/rank.utils.js");
      await recalculateRanks(jobId);
    } catch (rankError) {
      console.error("Initial ranking failed:", rankError);
    }

    res.status(201).json(
      new ApiResponse(201, application, `Job applied successfully. Skills Match Score: ${Math.round(skillsScore)}/50`)
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Apply job failed"));
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
    res.status(500).json(formatError(error, 500, "Failed to fetch my applications"));
  }
};


/* ================ get All Application (Hr/Admin)=============== */
export const getApplicationsForJob = async (req, res) => {
  try {
    if (req.params.jobId && !mongoose.Types.ObjectId.isValid(req.params.jobId)) {
      return res.status(400).json(new ApiError(400, "Job ID is not valid"));
    }

    const { error, value } = getRankedCandidatesSchema.validate(req.params, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const { jobId } = value;

    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found", ["Job not found"]));
    }

    const applications = await getApplicationsByJob(jobId);

    res.status(200).json(
      new ApiResponse(200, applications, "Applications fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch applications"));
  }
};

/* ================ update Application (Hr/Admin) =============== */
export const updateApplicationStatusController = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (applicationId && !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json(new ApiError(400, "Application ID is not valid"));
    }

    const { error, value } = updateApplicationSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    if (!applicationId) {
      return res.status(400).json(new ApiError(400, "Application ID is required"));
    }

    const { status } = value;

    const updatedApplication = await updateApplicationStatus(
      applicationId,
      status);

    if (!updatedApplication) {
      return res.status(404).json(new ApiError(404, "Application not found", ["Application not found"]));
    }

    /* 🔥 NOTIFICATION ON HIRED */
    if (status === "hired") {
      try {
        const candidateId = updatedApplication.user;
        const hrId = req.user._id;

        const conversation = await getOrCreateConversation(hrId, candidateId);

        const notification = await createMessage({
          conversationId: conversation._id,
          sender: hrId,
          receiver: candidateId,
          content: `Congratulations! You have been hired for the position. Our team will contact you soon.`,
          type: "notification"
        });

        await updateConversationLastMessage(conversation._id, notification._id);

      } catch (notifError) {
        console.error("Failed to send hiring notification:", notifError);
        // We don't fail the whole request because notification failed
      }
    }

    res.status(200).json(
      new ApiResponse(200, updatedApplication, "Application status updated")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to update application status"));
  }
};

/* ================ get single Application / Profile visit tracking =============== */
export const getApplicationDetailsController = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json(new ApiError(400, "Invalid Application ID"));
    }

    const application = await findApplicationWithDetails(applicationId);
    if (!application) {
      return res.status(404).json(new ApiError(404, "Application not found"));
    }

    // If viewer is HR or Admin, increment the candidate's profile visits
    if (req.user.role === "hr" || req.user.role === "admin") {
      await incrementProfileVisits(application.user._id);
    }

    res.status(200).json(
      new ApiResponse(200, application, "Application details fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch application details"));
  }
};

/* ================ delete Application (Hr/Admin) =============== */
export const deleteApplicationController = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (applicationId && !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json(new ApiError(400, "Application ID is not valid"));
    }

    if (!applicationId) {
      return res.status(400).json(new ApiError(400, "Application ID is required"));
    }

    const application = await deleteApplicationById(applicationId);

    if (!application) {
      return res.status(404).json(new ApiError(404, "Application not found", ["Application not found"]));
    }

    res.status(200).json(
      new ApiResponse(200, null, "Application deleted successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to delete application"));
  }
};
