import { Application } from "../models/application.models.js";

export const createApplication = async ({
    jobId,
    userId,
    skills,
    matchedSkills,
    missingSkills,
    experience,
    education,
    phone,
    score,
    skillsScore,
    linkedinProfile,
    portfolioWebsite,
    workExperience,
    projects,
    coverLetter,
    desiredSalary,
}) => {
    return await Application.create({
        job: jobId,
        user: userId,
        skills,
        matchedSkills,
        missingSkills,
        experience,
        education,
        phone,
        score,
        skillsScore,
        linkedinProfile,
        portfolioWebsite,
        workExperience,
        projects,
        coverLetter,
        desiredSalary,
    });
};

export const getApplicationsByJob = (jobId) => {
    return Application.find({ job: jobId })
        .populate("user", "name email")
        .sort({ score: -1 });
};

export const getApplicationsByUser = (userId) => {
    return Application.find({ user: userId })
        .populate("job", "jobTitle companyName location")
        .sort({ createdAt: -1 });
};

export const findByJobAndCandidate = (jobId, userId) => {
    return Application.findOne({
        job: jobId,
        user: userId
    });
};

export const updateApplicationStatus = (id, status) => {
    return Application.findByIdAndUpdate(
        id,
        { status },
        { new: true }
    );
};

export const updateApplicationScore = (id, score) => {
    return Application.findByIdAndUpdate(
        id,
        { score },
        { new: true }
    );
};

export const updateApplicationScoring = (id, { score }) => {
    return Application.findByIdAndUpdate(
        id,
        {
            score
        },
        { new: true }
    );
};

export const deleteApplicationById = (id) => {
    return Application.findByIdAndDelete(id);
};

export const deleteApplicationsByUserId = (userId) => {
    return Application.deleteMany({ user: userId });
};

export const getRankedApplications = async (jobId) => {
    return await Application.find({ job: jobId })
        .populate("user", "name email phone")
        .populate("job", "jobTitle companyName")
        .sort({ score: -1 });
};

export const getRankedApplicationsWithPagination = async (jobId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const total = await Application.countDocuments({ job: jobId });

    const candidates = await Application.find({ job: jobId })
        .populate("user", "name email phone")
        .populate("job", "jobTitle companyName")
        .sort({ score: -1 }) // Sort by score descending (highest first)
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        candidates,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};


export const countUserApplicationsByStatus = (userId, status) => {
    const query = { user: userId };
    if (status) query.status = status;
    return Application.countDocuments(query);
};

export const countHrApplicationsByStatus = async (hrId, status) => {
    const { Job } = await import("../models/job.models.js");
    const hrJobs = await Job.find({ createdBy: hrId }).select("_id");
    const jobIds = hrJobs.map((j) => j._id);

    const query = { job: { $in: jobIds } };
    if (status) query.status = status;
    return Application.countDocuments(query);
};

export const countAllApplicationsByStatus = (status) => {
    const query = {};
    if (status) query.status = status;
    return Application.countDocuments(query);
};

export const findApplicationWithDetails = (id) => {
    return Application.findById(id)
        .populate("user", "name email phone profile")
        .populate("job", "jobTitle companyName createdBy");
};

export const getApplicationsByStatus = async (role, userId, status, jobId) => {
    const query = { status };

    if (jobId) {
        query.job = jobId;
    }

    if (role === "user") {
        query.user = userId;
    } else if (role === "hr") {
        const { Job } = await import("../models/job.models.js");

        if (jobId) {
            // If jobId is provided, ensure HR owns this specific job
            const job = await Job.findOne({ _id: jobId, createdBy: userId });
            if (!job) {
                // If HR doesn't own this job, return empty or throw error?
                // Returning empty array is safer for now, or we can handle in controller
                return [];
            }
        } else {
            // If no jobId provided, get all applications for all jobs created by this HR
            const hrJobs = await Job.find({ createdBy: userId }).select("_id");
            const jobIds = hrJobs.map((j) => j._id);
            query.job = { $in: jobIds };
        }
    }
    // Admin can see all or narrow by jobId if provided

    return Application.find(query)
        .populate("user", "name email phone profile")
        .populate("job", "jobTitle companyName location")
        .sort({ createdAt: -1 });
};


