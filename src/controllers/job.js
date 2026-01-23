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

    const job = await createJob({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create job" });
  }
};

/* ================= UPDATE JOB ================= */

export const updateJobController = async (req, res) => {
  try {
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
    console.error("error: ",error);
    res.status(500).json({ message: "Failed to update job" });
  }
};

/* ================= DELETE JOB (SOFT) ================= */

export const deleteJobController = async (req, res) => {
  try {
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
    res.status(500).json({ message: "Failed to delete job" });
  }
};


/* ================= DELETE JOB (Hard) ================= */
export const deleteHardJobController = async (req, res) => {
  try {
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
    res.status(500).json({ message: "Failed to delete job" });
  }
};

/* ================= GET JOB BY ID ================= */

export const getJobByIdController = async (req, res) => {
  try {
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
    res.status(500).json({ message: "Failed to fetch job" });
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


/* ================= APPLY JOB ================= */

export const applyJobController = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    const job = await getJobById(jobId);

    if (!job || job.jobStatus !== "Open") {
      return res.status(404).json({ message: "Job not available" });
    }

    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }


    // // Check resume & skills
    // if (!user.skills || user.skills.length === 0) {
    //   return res.status(400).json({
    //     message: "Please upload resume before applying",
    //   });
    // }

    const alreadyApplied = await findByJobAndCandidate(jobId, userId);

    if (alreadyApplied) {
      return res.status(400).json({
        message: "Already applied for this job",
      });
    }


    // const scoreData = compareSkills(user.skills, job.requiredSkills)

    const application = await createApplication({
      jobId,
      userId,
      // skills: user.skills,
      // scoreData,
    });

    res.status(201).json({
      success: true,
      message: "Job applied successfully",
      application,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Apply job failed" });
  }
};




