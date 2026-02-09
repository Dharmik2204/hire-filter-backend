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

import { updateApplicationSchema, createApplicationSchema } from "../validations/application.validation.js";
import { getRankedCandidatesSchema } from "../validations/rank.validation.js";

/* ================= APPLY JOB & Create Application================= */

export const applyJobController = async (req, res) => {
  try {
    if (req.params.jobId && !mongoose.Types.ObjectId.isValid(req.params.jobId)) {
      return res.status(400).json(new ApiError(400, "Job ID is not valid"));
    }

    const { error, value } = createApplicationSchema.validate({ ...req.params, ...req.body }, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const {
      jobId,
      skills: reqSkills,
      experience: reqExperience,
      education: reqEducation,
      phone: reqPhone,
      linkedinProfile: reqLinkedin,
      portfolioWebsite: reqPortfolio,
      workExperience: reqWorkExp,
      projects: reqProjects,
      coverLetter: reqCoverLetter,
      desiredSalary: reqSalary
    } = value;
    const userId = req.user._id;

    const job = await getJobById(jobId);

    if (!job || job.jobStatus !== "Open") {
      return res.status(404).json(new ApiError(404, "Job not available", ["Job not available"]));
    }

    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found", ["User not found"]));
    }

    const alreadyApplied = await findByJobAndCandidate(jobId, userId);

    if (alreadyApplied) {
      return res.status(409).json(new ApiError(409, "Already applied for this job", ["Already applied for this job"]));
    }

    // Use details from request body if provided, otherwise fallback to user profile
    const applicationSkills = reqSkills || user.profile?.skills || [];
    const applicationExperience = reqExperience !== undefined ? reqExperience : (user.profile?.experience || 0);
    const applicationEducation = reqEducation || user.profile?.education || []; // Now an array
    const applicationPhone = reqPhone || user.phone || "";
    const applicationLinkedin = reqLinkedin || user.profile?.linkedin || "";
    const applicationPortfolio = reqPortfolio || user.profile?.portfolio || "";
    const applicationWorkExp = reqWorkExp || [];
    const applicationProjects = reqProjects || [];
    const applicationCoverLetter = reqCoverLetter || "";
    const applicationSalary = reqSalary || "";

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

    // Note: applicationEducation is now an array of objects. 
    // For scoring, we might want to take the highest level or just simple check if any matches.
    // However, if job.education is a string like "Graduate", we check if any education item matches.
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
    console.error("Get Applications Error:", error);
    res.status(500).json(new ApiError(500, "Failed to fetch applications", [], error.stack));
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

    res.status(200).json(
      new ApiResponse(200, updatedApplication, "Application status updated")
    );
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json(new ApiError(500, "Failed to update application status", [], error.stack));
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
    console.error("Delete Application Error:", error);
    res.status(500).json(new ApiError(500, "Failed to delete application", [], error.stack));
  }
};
