import { ApiResponse } from "../utils/ApiResponse.js";
import { formatError } from "../utils/errorHandler.js";
import { findUserById } from "../repositories/user.repository.js";
import {
    countUserApplicationsByStatus,
    countHrApplicationsByStatus
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
