import {Application} from "../models/application.models.js";

export const findByJobAndCandidate = (jobId, userId) => {
    return Application.findOne({
        job: jobId,
        user: userId
    });
};

export const createApplication = async ({
    jobId,
    userId,
    skills,
    scoreData
}) => {
    return await Application.create({
        job: jobId,
        user: userId,
        skills,
        score: scoreData.score,
        matchedSkills: scoreData.matchedSkills,
        missingSkills: scoreData.missingSkills
    });
};

export const getApplicationsByJob = (jobId) => {
    return Application.find({ job: jobId })
        .populate("user", "name email")
        .sort({ score: -1 });
};

export const updateApplicationStatus = (id, status) => {
    return Application.findByIdAndUpdate(
        id,
        { status },
        { new: true }
    );
};

//

export const getRankedApplications = async (jobId) => {
    return await Application.find({ job: jobId })
        .populate("user", "name email")
        .sort({ score: -1 });
};


