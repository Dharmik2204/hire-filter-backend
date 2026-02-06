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
import { createJobSchema, updateJobSchema, getJobsSchema } from "../validations/job.validation.js";

/* ================= CREATE JOB ================= */

export const createJobController = async (req, res) => {
  try {
    console.log("createJobController hit");
    console.log("req.body:", req.body);

    const { error, value } = createJobSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const { role, company } = req.user;
    let jobData = { ...value, createdBy: req.user._id };

    if (role === "hr") {
      const dbCompanyName = typeof company === "string" ? company : company?.name;
      if (!value.companyName && dbCompanyName) {
        jobData.companyName = dbCompanyName;
      } else if (!value.companyName && !dbCompanyName) {
        return res.status(400).json(new ApiError(400, "HR must have a company name in profile to create a job"));
      }
    } else if (!value.companyName) {
      return res.status(400).json(new ApiError(400, "Company name is required"));
    }

    const job = await createJob(jobData);

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

    const { error, value } = updateJobSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
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

    const updatedJob = await updateJobById(req.params.id, value);

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
    const { error, value } = getJobsSchema.validate(req.query, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const { page, limit, ...filters } = value;

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
