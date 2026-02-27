import express from "express";
import {
    authMiddleware,
    authorizeRoles
} from "../middlewares/authorize.middlewares.js";
import {
    getCandidateStats,
    getHrStats
} from "../controllers/dashboard.js";

const router = express.Router();

router.get(
    "/user-stats",
    authMiddleware,
    authorizeRoles("user"),
    getCandidateStats
);

router.get(
    "/hr-stats",
    authMiddleware,
    authorizeRoles("hr", "admin"),
    getHrStats
);

export default router;
