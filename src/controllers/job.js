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
    if (!jobTitle) return res.status(400).json({ message: "Job title is required" });
    if (!companyName) return res.status(400).json({ message: "Company name is required" });

    if (!jobDescription || jobDescription.length < 50) {
      return res.status(400).json({ message: "Job description must be at least 50 characters long" });
    }

    if (!location) return res.status(400).json({ message: "Location is required" });
    if (!jobType) return res.status(400).json({ message: "Job type is required" });

    if (!requiredSkills || !Array.isArray(requiredSkills) || requiredSkills.length === 0) {
      return res.status(400).json({ message: "At least one skill is required" });
    }

    if (!lastDate) return res.status(400).json({ message: "Last date is required" });

    // Experience validation
    if (!experience || experience.min === undefined || experience.max === undefined) {
      return res.status(400).json({ message: "Experience min and max are required" });
    }
    if (Number(experience.min) < 0 || Number(experience.max) < 0) {
      return res.status(400).json({ message: "Experience cannot be negative" });
    }
    if (Number(experience.min) > Number(experience.max)) {
      return res.status(400).json({ message: "Minimum experience cannot be greater than maximum experience" });
    }
    // --- VALIDATION END ---

    const job = await createJob({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("createJob error:", error);
    res.status(500).json({ message: "Failed to create job", error: error.message });
  }
};

/* ================= UPDATE JOB ================= */

export const updateJobController = async (req, res) => {
  try {
    console.log("updateJobController hit. ID:", req.params.id);
    console.log("req.body:", req.body);

    if (!req.params.id) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Update data cannot be empty" });
    }

    const job = await getJobByIdInternal(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (
      req.user.role !== "admin" &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updatedJob = await updateJobById(req.params.id, req.body);

    res.json({
      success: true,
      job: updatedJob,
    });
  } catch (error) {
    console.error("updateJob error: ", error);
    res.status(500).json({ message: "Failed to update job", error: error.message });
  }
};

/* ================= DELETE JOB (SOFT) ================= */

export const deleteJobController = async (req, res) => {
  try {
    console.log("deleteJobController hit. ID:", req.params.id);

    if (!req.params.id) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    const job = await getJobByIdInternal(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (
      req.user.role !== "admin" &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await softDeleteJob(req.params.id);

    res.json({
      success: true,
      message: "Job closed successfully",
    });
  } catch (error) {
    console.error("deleteJob error:", error);
    res.status(500).json({ message: "Failed to delete job", error: error.message });
  }
};


/* ================= DELETE JOB (Hard) ================= */
export const deleteHardJobController = async (req, res) => {
  try {
    console.log("deleteHardJobController hit. ID:", req.params.id);

    if (!req.params.id) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    const job = await getJobByIdInternal(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (
      req.user.role !== "admin" &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await hardDeleteJob(req.params.id);

    res.json({
      success: true,
      message: "Job Delete successfully",
    });
  } catch (error) {
    console.error("deleteHardJob error:", error);
    res.status(500).json({ message: "Failed to delete job", error: error.message });
  }
};

/* ================= GET JOB BY ID ================= */

export const getJobByIdController = async (req, res) => {
  try {
    console.log("getJobByIdController hit. ID:", req.params.id);

    if (!req.params.id) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    const job = await getJobById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    await incrementJobViews(job._id);

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("get job error: ", error);
    res.status(500).json({ message: "Failed to fetch job", error: error.message });
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

    res.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};







