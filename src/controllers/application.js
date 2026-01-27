import {
  createApplication,
  getApplicationsByJob,
  getApplicationsByUser,
  findByJobAndCandidate,
  updateApplicationStatus,
  getRankedApplications
} from "../repositories/application.repository.js";

import { getJobById } from "../repositories/job.repository.js";
import { findUserById } from "../repositories/user.repository.js";
/* ================= APPLY JOB & Create Application================= */

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

    const alreadyApplied = await findByJobAndCandidate(jobId, userId);

    if (alreadyApplied) {
      return res.status(400).json({
        message: "Already applied for this job",
      });
    }

    const application = await createApplication({
      jobId,
      userId,
      skills: user.skills
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

/* ================ get MYApplication =============== */
export const getMyApplicationsController = async (req, res) => {
  try {
    const applications = await getApplicationsByUser(req.user._id);

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch my applications",
    });
  }
};


/* ================ get All Application (Hr/Admin)=============== */
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

/* ================ get Rank Application (Hr/Admin)=============== */
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

/* ================ update Application (Hr/Admin) =============== */
export const updateApplicationStatusController = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const allowedStatus = [
      "applied",
      "screening",
      "interviewing",
      "offer",
      "rejected",
      "archived",
    ];


    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid application status",
      });
    }

    const updatedApplication = await updateApplicationStatus(
      applicationId,
      status);

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
