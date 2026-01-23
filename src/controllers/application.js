import {
  getApplicationsByJob,
  updateApplicationStatus,
  getRankedApplications
} from "../repositories/application.repository.js";

import { getJobById } from "../repositories/job.repository.js";

/**
 * @desc    HR/Admin – View all applications for a job
 * @route   GET /applications/job/:jobId
 * @access  HR / Admin
 */
export const getApplicationsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const applications = await getApplicationsByJob(jobId);

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("Get Applications Error:", error);
    res.status(500).json({
      message: "Failed to fetch applications",
    });
  }
};

/**
 * @desc    HR/Admin – View ranked applications (by score)
 * @route   GET /applications/job/:jobId/ranked
 * @access  HR / Admin
 */
export const getRankedApplicationsController = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const applications = await getRankedApplications(jobId);

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("Ranking Error:", error);
    res.status(500).json({
      message: "Failed to rank applications",
    });
  }
};

/**
 * @desc    HR – Update application status
 * @route   PATCH /applications/:id/status
 * @access  HR
 */
export const updateApplicationStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = [
      "applied",
      "shortlisted",
      "rejected",
      "hired",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid application status",
      });
    }

    const updatedApplication = await updateApplicationStatus(id, status);

    if (!updatedApplication) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application status updated",
      data: updatedApplication,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({
      message: "Failed to update application status",
    });
  }
};
