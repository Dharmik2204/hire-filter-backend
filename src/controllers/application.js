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
import { findUserById } from "../repositories/user.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { createApplicationSchema, updateApplicationSchema } from "../validations/application.validation.js";
import { getRankedCandidatesSchema } from "../validations/rank.validation.js";

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
    let score = 0;
    const matchedSkills = [];
    const missingSkills = [];

    // 1. Skills Scoring (60%)
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

      const skillScore = (matchedSkills.length / jobSkills.length) * 60;
      score += skillScore;
    } else {
      score += 60; // No required skills, full marks for skills section
    }

    // 2. Experience Scoring (30%)
    const minExp = job.experience?.min || 0;
    if (applicationExperience >= minExp) {
      score += 30;
    } else if (minExp > 0) {
      score += (applicationExperience / minExp) * 30;
    } else {
      score += 30;
    }

    // 3. Education Scoring (10%)
    const educationPriority = {
      "Any": 0,
      "10th": 1,
      "12th": 2,
      "Diploma": 3,
      "Graduate": 4,
      "Post-Graduate": 5
    };

    const reqEduLevel = educationPriority[job.education] || 0;
    let maxUserEduLevel = 0;

    if (Array.isArray(applicationEducation)) {
      applicationEducation.forEach(edu => {
        const level = educationPriority[edu.degree] || 0;
        if (level > maxUserEduLevel) maxUserEduLevel = level;
      });
    } else if (typeof applicationEducation === 'string') {
      maxUserEduLevel = educationPriority[applicationEducation] || 0;
    }

    if (maxUserEduLevel >= reqEduLevel) {
      score += 10;
    } else if (reqEduLevel > 0) {
      score += (maxUserEduLevel / reqEduLevel) * 10;
    } else {
      score += 10;
    }

    const application = await createApplication({
      jobId,
      userId,
      skills: applicationSkills,
      matchedSkills,
      missingSkills,
      experience: applicationExperience,
      education: applicationEducation,
      phone: applicationPhone,
      score: Math.round(score),
      linkedinProfile: applicationLinkedin,
      portfolioWebsite: applicationPortfolio,
      workExperience: applicationWorkExp,
      projects: applicationProjects,
      coverLetter: applicationCoverLetter,
      desiredSalary: applicationSalary
    });

    res.status(201).json(
      new ApiResponse(201, application, "Job applied successfully with score " + Math.round(score))
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

    const { error, value } = updateApplicationStatusSchema.validate(req.body, { abortEarly: false });

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

    res.status(200).json(
      new ApiResponse(200, updatedApplication, "Application status updated")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to update application status"));
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
