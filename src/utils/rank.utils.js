import { Application } from "../models/application.models.js";

/**
 * Calculates a score strictly based on Skills Match.
 * Formula: 
 * - Skills Match: (matched/total * 100)
 * 
 * @param {number} matchedSkillsCount - Number of skills matched
 * @param {number} totalSkillsCount - Total required skills for the job
 * @returns {number} - The calculated composite score (0-100)
 */
export const calculateCompositeScore = (matchedSkillsCount, totalSkillsCount) => {
    // Normalize Skills Score to 0-100
    const normalizedSkillsScore = totalSkillsCount > 0 ? (matchedSkillsCount / totalSkillsCount) * 100 : 0;

    return Math.round(normalizedSkillsScore * 100) / 100; // Round to 2 decimal places
};

/**
 * Recalculates and updates ranks for ALL applications of a specific job.
 * This should be called whenever a candidate's score changes.
 * 
 * @param {string} jobId - The Job ID to re-rank
 */
export const recalculateRanks = async (jobId) => {
    try {
        // 1. Fetch all applications for this job, sorted by score DESC
        const applications = await Application.find({ job: jobId })
            .select("_id score")
            .sort({ score: -1 });

        if (applications.length === 0) return;

        // 2. Prepare bulk write operations
        const bulkOps = applications.map((app, index) => ({
            updateOne: {
                filter: { _id: app._id },
                update: { $set: { rank: index + 1 } } // Rank 1 is highest
            }
        }));

        // 3. Execute bulk write
        await Application.bulkWrite(bulkOps);
        console.log(`Ranks recalculated for Job ${jobId}. Total candidates: ${applications.length}`);

    } catch (error) {
        console.error(`Failed to recalculate ranks for Job ${jobId}:`, error);
        // We don't throw here to avoid failing the parent request, 
        // but in a production system, you might want a retry mechanism (queue).
    }
};
