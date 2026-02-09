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

export const searchJobs = (filters, { page = 1, limit = 10 }) => {
  const query = { isActive: true, jobStatus: "Open" };

  if (filters.jobTitle) {
    query.jobTitle = { $regex: filters.jobTitle, $options: "i" };
  }

  if (filters.location) {
    query.location = filters.location;
  }

  if (filters.jobType) {
    query.jobType = filters.jobType;
  }

  if (filters.skills) {
    query.requiredSkills = { $in: filters.skills };
  }

  if (filters.minExperience) {
    query["experience.min"] = { $lte: filters.minExperience };
  }

  if (filters.maxSalary) {
    query["salary.max"] = { $gte: filters.maxSalary };
  }

  const skip = (page - 1) * limit;

  return Job.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
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
