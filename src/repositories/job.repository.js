import { Job } from "../models/job.models.js";

/* ================= CREATE ================= */

export const createJob = (data) => {
  return Job.create(data);
};

/* ================= READ ================= */

export const getJobById = (jobId) => {
  return Job.findOne({
    _id: jobId,
    isActive: true,
  });
};

export const getJobByIdInternal = (jobId) => {
  return Job.findOne({
    _id: jobId
  });
};

export const getAllJobs = ({ page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  return Job.find({ isActive: true })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/* ================= SEARCH & FILTER ================= */

export const searchJobs = async (filters, { page = 1, limit = 10, sortBy = "createdAt", order = "desc" }) => {
  const query = { isActive: true, jobStatus: "Open" };

  // Global Search
  if (filters.search) {
    query.$or = [
      { jobTitle: { $regex: filters.search, $options: "i" } },
      { companyName: { $regex: filters.search, $options: "i" } },
      { jobDescription: { $regex: filters.search, $options: "i" } }
    ];
  }

  // Specific Filters
  if (filters.jobTitle) {
    query.jobTitle = { $regex: filters.jobTitle, $options: "i" };
  }

  if (filters.location) {
    query.location = { $regex: filters.location, $options: "i" };
  }

  if (filters.companyName) {
    query.companyName = { $regex: filters.companyName, $options: "i" };
  }

  if (filters.jobType) {
    query.jobType = filters.jobType;
  }

  if (filters.skills && filters.skills.length > 0) {
    query.requiredSkills = { $in: filters.skills };
  }

  // Experience Range
  if (filters.minExperience !== undefined || filters.maxExperience !== undefined) {
    query["experience.min"] = {};
    if (filters.minExperience !== undefined) query["experience.min"].$gte = filters.minExperience;
    if (filters.maxExperience !== undefined) query["experience.min"].$lte = filters.maxExperience;
  }

  // Salary Range
  if (filters.minSalary !== undefined || filters.maxSalary !== undefined) {
    query["salary.max"] = {};
    if (filters.minSalary !== undefined) query["salary.max"].$gte = filters.minSalary;
    if (filters.maxSalary !== undefined) query["salary.max"].$lte = filters.maxSalary;
  }

  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    Job.countDocuments(query)
  ]);

  return {
    jobs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/* ================= UPDATE ================= */

// export const updateJobById = (jobId, data) => {
//   return Job.findOneAndUpdate(
//     jobId,
//     { $set: data },
//     { new: true }
//   );
// };


export const updateJobById = (id, data) => {
  return Job.findByIdAndUpdate(
    id,
    { $set: data },
    {
      new: true,
      runValidators: true,
    }
  );
};

/* ================= SOFT DELETE ================= */

export const softDeleteJob = (id) => {
  return Job.findByIdAndUpdate(
    id,
    {
      $set: {
        isActive: false,
        jobStatus: "Closed",
      },
    },
    { new: true }
  );
};
export const hardDeleteJob = (id) => {
  return Job.findByIdAndDelete(
    id,
    { new: true }
  );
};

export const deleteJobsByUserId = (userId) => {
  return Job.deleteMany({ createdBy: userId });
};

/* ================= COUNTERS ================= */

export const incrementJobViews = (id) => {
  return Job.findByIdAndUpdate(
    id,
    { $inc: { viewsCount: 1 } },
    { new: true }
  );
};

export const incrementApplicationsCount = (id) => {
  return Job.findByIdAndUpdate(
    id,
    { $inc: { applicationsCount: 1 } },
    { new: true }
  );
};

/* ================= STATS & ADMIN ================= */

export const getJobStats = async () => {
  const stats = await Job.aggregate([
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        activeJobs: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
        closedJobs: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
        openStatusJobs: { $sum: { $cond: [{ $eq: ["$jobStatus", "Open"] }, 1, 0] } },
      },
    },
  ]);

  return stats[0] || { totalJobs: 0, activeJobs: 0, closedJobs: 0, openStatusJobs: 0 };
};

export const getAllJobsAdmin = ({ page = 1, limit = 10, search = "" }) => {
  const query = {};

  if (search) {
    query.$or = [
      { jobTitle: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } }
    ];
  }

  const skip = (page - 1) * limit;

  return Job.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "name email"); // Optional: populate creator info
};
