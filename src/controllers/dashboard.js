import { ApiResponse } from "../utils/ApiResponse.js";
import { formatError } from "../utils/errorHandler.js";
import { findUserById, getUserGrowthStats } from "../repositories/user.repository.js";
import { getJobGrowthStats } from "../repositories/job.repository.js";
import {
    countUserApplicationsByStatus,
    countHrApplicationsByStatus,
    countAllApplicationsByStatus
} from "../repositories/application.repository.js";

/* ================= CANDIDATE DASHBOARD STATS ================= */
export const getCandidateStats = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch counts for different statuses
        const [totalApplied, interviewing, offers, user] = await Promise.all([
            countUserApplicationsByStatus(userId), // All applications
            countUserApplicationsByStatus(userId, "interviewing"),
            countUserApplicationsByStatus(userId, "offer"),
            findUserById(userId)
        ]);

        const stats = {
            totalApplied,
            interviewing,
            offers,
            profileVisits: user.profileVisits || 0
        };

        res.status(200).json(
            new ApiResponse(200, stats, "Candidate dashboard statistics fetched successfully")
        );
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to fetch candidate stats"));
    }
};

/* ================= HR DASHBOARD STATS ================= */
export const getHrStats = async (req, res) => {
    try {
        const hrId = req.user._id;

        // Fetch counts for status across all jobs created by this HR
        const [hired, shortlisted, rejected] = await Promise.all([
            countHrApplicationsByStatus(hrId, "hired"),
            countHrApplicationsByStatus(hrId, "shortlisted"),
            countHrApplicationsByStatus(hrId, "rejected")
        ]);

        const stats = {
            hired,
            shortlisted,
            rejected
        };

        res.status(200).json(
            new ApiResponse(200, stats, "HR dashboard statistics fetched successfully")
        );
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to fetch HR stats"));
    }
};

/* ================= ADMIN DASHBOARD STATS ================= */
export const getAdminStats = async (req, res) => {
    try {
        // Fetch global counts for specific statuses and growth metrics
        const [
            hired,
            shortlisted,
            rejected,
            jobStats,
            userStats
        ] = await Promise.all([
            countAllApplicationsByStatus("hired"),
            countAllApplicationsByStatus("shortlisted"),
            countAllApplicationsByStatus("rejected"),
            getJobGrowthStats(),
            getUserGrowthStats()
        ]);

        const stats = {
            totals: {
                jobs: jobStats.total,
                users: userStats.totalUsers,
                hrs: userStats.totalHrs
            },
            growth: {
                jobsAddedThisMonth: jobStats.currentMonth,
                jobsAddedLastMonth: jobStats.lastMonth,
                usersAddedThisMonth: userStats.usersCurrentMonth,
                usersAddedLastMonth: userStats.usersLastMonth,
                hrsAddedThisMonth: userStats.hrsCurrentMonth,
                hrsAddedLastMonth: userStats.hrsLastMonth,
            },
            applications: {
                hired,
                shortlisted,
                rejected
            }
        };

        res.status(200).json(
            new ApiResponse(200, stats, "Admin dashboard statistics fetched successfully")
        );
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to fetch Admin stats"));
    }
};
