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

export const getRankedApplicationsWithExamDetails = async (jobId) => {
    const { ExamAttempt } = await import("../models/exam.models.js");

    const applications = await Application.find({ job: jobId })
        .populate("user", "name email phone")
        .populate("job", "jobTitle companyName")
        .sort({ score: -1 })
        .lean();

    // Fetch exam attempts for each application
    const applicationsWithExams = await Promise.all(
        applications.map(async (app) => {
            const examAttempt = await ExamAttempt.findOne({ application: app._id })
                .populate("exam", "title examType passingMarks durationMinutes")
                .lean();

            return {
                ...app,
                examAttempt: examAttempt ? {
                    score: examAttempt.score,
                    result: examAttempt.result,
                    status: examAttempt.status,
                    startedAt: examAttempt.startedAt,
                    exam: examAttempt.exam
                } : null
            };
        })
    );

    return applicationsWithExams;
};

export const updateApplicationRanks = async (rankings) => {
    // rankings = [{ _id: applicationId, rank: 1 }, ... ]
    const bulkOps = rankings.map(({ _id, rank }) => ({
        updateOne: {
            filter: { _id },
            update: { $set: { rank } }
        }
    }));

    return Application.bulkWrite(bulkOps);
};


