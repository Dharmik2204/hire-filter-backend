import {
  createJob,
  getJobById,
  getAllJobs,
  searchJobs,
  updateJobById,
  softDeleteJob,
  incrementJobViews,
  getJobByIdInternal,
  hardDeleteJob
} from "../repositories/job.repository.js";

import { findUserById } from "../repositories/user.repository.js";
import { findByJobAndCandidate, createApplication } from "../repositories/application.repository.js";

import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  isString,
  isNumber,
  isArray,
  isObject,
  isDate,
  isBoolean,
} from "../utils/Validation.js";


/* ================= CREATE JOB ================= */

export const createJobController = async (req, res) => {
  try {
    console.log("createJobController hit");
    console.log("req.body:", req.body);

    const {
      jobTitle,
      companyName,
      jobDescription,
      location,
      jobType,
      experience,
      requiredSkills,
      lastDate,
    } = req.body;

    // --- VALIDATION START ---

    // Existence and Type Checks
    if (!jobTitle) return res.status(400).json(new ApiError(400, "Job title is required"));
    if (!isString(jobTitle)) return res.status(400).json(new ApiError(400, "Job title must be a string"));

    if (!companyName) return res.status(400).json(new ApiError(400, "Company name is required"));
    if (!isString(companyName)) return res.status(400).json(new ApiError(400, "Company name must be a string"));

    if (!jobDescription) return res.status(400).json(new ApiError(400, "Job description is required"));
    if (!isString(jobDescription)) return res.status(400).json(new ApiError(400, "Job description must be a string"));
    if (jobDescription.length < 5) {
      return res.status(400).json(new ApiError(400, "Job description must be at least 5 characters long"));
    }

    if (!location) return res.status(400).json(new ApiError(400, "Location is required"));
    if (!isString(location)) return res.status(400).json(new ApiError(400, "Location must be a string"));

    if (!jobType) return res.status(400).json(new ApiError(400, "Job type is required"));
    if (!isString(jobType)) return res.status(400).json(new ApiError(400, "Job type must be a string"));

    if (!requiredSkills) return res.status(400).json(new ApiError(400, "Required skills are required"));
    if (!isArray(requiredSkills) || requiredSkills.length === 0) {
      return res.status(400).json(new ApiError(400, "At least one skill is required in an array"));
    }
    if (!requiredSkills.every(isString)) {
      return res.status(400).json(new ApiError(400, "All skills must be strings"));
    }

    if (!lastDate) return res.status(400).json(new ApiError(400, "Last date is required"));
    if (!isDate(lastDate)) return res.status(400).json(new ApiError(400, "Last date must be a valid date"));

    // Experience validation
    if (!experience) return res.status(400).json(new ApiError(400, "Experience is required"));
    if (!isObject(experience)) return res.status(400).json(new ApiError(400, "Experience must be an object"));

    if (experience.min === undefined || experience.max === undefined) {
      return res.status(400).json(new ApiError(400, "Experience min and max are required"));
    }
    if (!isNumber(experience.min) || !isNumber(experience.max)) {
      return res.status(400).json(new ApiError(400, "Experience min and max must be numbers"));
    }
    if (experience.min < 0 || experience.max < 0) {
      return res.status(400).json(new ApiError(400, "Experience cannot be negative"));
    }
    if (experience.min > experience.max) {
      return res.status(400).json(new ApiError(400, "Minimum experience cannot be greater than maximum experience"));
    }

    // Optional Salary validation
    if (req.body.salary) {
      const { salary } = req.body;
      if (!isObject(salary)) return res.status(400).json(new ApiError(400, "Salary must be an object"));
      if (salary.min !== undefined && !isNumber(salary.min)) return res.status(400).json(new ApiError(400, "Salary min must be a number"));
      if (salary.max !== undefined && !isNumber(salary.max)) return res.status(400).json(new ApiError(400, "Salary max must be a number"));
      if (salary.currency !== undefined && !isString(salary.currency)) return res.status(400).json(new ApiError(400, "Salary currency must be a string"));
      if (salary.isNegotiable !== undefined && !isBoolean(salary.isNegotiable)) return res.status(400).json(new ApiError(400, "Salary isNegotiable must be a boolean"));
    }
    // --- VALIDATION END ---

    const job = await createJob({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json(
      new ApiResponse(201, job, "Job created successfully")
    );
  } catch (error) {
    console.error("createJob error:", error);
    res.status(500).json(new ApiError(500, "Failed to create job", [], error.stack));
  }
};

/* ================= UPDATE JOB ================= */

export const updateJobController = async (req, res) => {
  try {
    console.log("updateJobController hit. ID:", req.params.id);
    console.log("req.body:", req.body);

    if (!req.params.id) {
      return res.status(400).json(new ApiError(400, "Job ID is required"));
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json(new ApiError(400, "Update data cannot be empty"));
    }

    const job = await getJobByIdInternal(req.params.id);

    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found"));
    }

    if (
      req.user.role !== "admin" &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json(new ApiError(403, "Unauthorized"));
    }

    const updatedJob = await updateJobById(req.params.id, req.body);

    res.json(
      new ApiResponse(200, updatedJob, "Job updated successfully")
    );
  } catch (error) {
    console.error("updateJob error: ", error);
    res.status(500).json(new ApiError(500, "Failed to update job", [], error.stack));
  }
};

/* ================= DELETE JOB (SOFT) ================= */

export const deleteJobController = async (req, res) => {
  try {
    console.log("deleteJobController hit. ID:", req.params.id);

    if (!req.params.id) {
      return res.status(400).json(new ApiError(400, "Job ID is required"));
    }

    const job = await getJobByIdInternal(req.params.id);

    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found"));
    }

    if (
      req.user.role !== "admin" &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json(new ApiError(403, "Unauthorized"));
    }

    await softDeleteJob(req.params.id);

    res.json(
      new ApiResponse(200, null, "Job closed successfully")
    );
  } catch (error) {
    console.error("deleteJob error:", error);
    res.status(500).json(new ApiError(500, "Failed to delete job", [], error.stack));
  }
};


/* ================= DELETE JOB (Hard) ================= */
export const deleteHardJobController = async (req, res) => {
  try {
    console.log("deleteHardJobController hit. ID:", req.params.id);

    if (!req.params.id) {
      return res.status(400).json(new ApiError(400, "Job ID is required"));
    }

    const job = await getJobByIdInternal(req.params.id);

    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found"));
    }

    if (
      req.user.role !== "admin" &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json(new ApiError(403, "Unauthorized"));
    }

    await hardDeleteJob(req.params.id);

    res.json(
      new ApiResponse(200, null, "Job deleted successfully")
    );
  } catch (error) {
    console.error("deleteHardJob error:", error);
    res.status(500).json(new ApiError(500, "Failed to delete job", [], error.stack));
  }
};

/* ================= GET JOB BY ID ================= */

export const getJobByIdController = async (req, res) => {
  try {
    console.log("getJobByIdController hit. ID:", req.params.id);

    if (!req.params.id) {
      return res.status(400).json(new ApiError(400, "Job ID is required"));
    }

    const job = await getJobById(req.params.id);

    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found"));
    }

    await incrementJobViews(job._id);

    res.json(
      new ApiResponse(200, job, "Job fetched successfully")
    );
  } catch (error) {
    console.error("get job error: ", error);
    res.status(500).json(new ApiError(500, "Failed to fetch job", [], error.stack));
  }
};

/* ================= GET ALL / SEARCH JOBS ================= */

export const getJobsController = async (req, res) => {
  try {
    const { page, limit, ...filters } = req.query;

    const jobs = await searchJobs(filters, {
      page: Number(page),
      limit: Number(limit),
    });

    res.json(
      new ApiResponse(200, jobs, "Jobs fetched successfully")
    );
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json(new ApiError(500, "Failed to fetch jobs", [], error.stack));
  }
};
