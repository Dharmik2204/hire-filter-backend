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
    examScore,
    examRawMarks,
    examTotalMarks,
    examResultStatus,
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
        examScore,
        examRawMarks,
        examTotalMarks,
        examResultStatus,
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

export const updateApplicationScoring = (id, { score, examScore, examRawMarks, examTotalMarks, examResultStatus }) => {
    return Application.findByIdAndUpdate(
        id,
        {
            score,
            examScore,
            examRawMarks,
            examTotalMarks,
            examResultStatus
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

export const getRankedApplicationsWithExamDetails = async (jobId, page = 1, limit = 10) => {
    const { ExamAttempt } = await import("../models/exam.models.js");

    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const total = await Application.countDocuments({ job: jobId });

    const applications = await Application.find({ job: jobId })
        .populate("user", "name email phone")
        .populate("job", "jobTitle companyName")
        .sort({ score: -1 }) // Sort by score descending (highest first)
        .skip(skip)
        .limit(limit)
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

    return {
        candidates: applicationsWithExams,
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

export const findApplicationWithDetails = (id) => {
    return Application.findById(id)
        .populate("user", "name email phone profile")
        .populate("job", "jobTitle companyName");
};


