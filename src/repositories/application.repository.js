import { Application } from "../models/application.models.js";

export const createApplication = async ({
    jobId,
    userId,
    skills,
}) => {
    return await Application.create({
        job: jobId,
        user: userId,
        skills,
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

export const getRankedApplications = async (jobId) => {
    return await Application.find({ job: jobId })
        .populate("user", "name email")
        .sort({ score: -1 });
};


