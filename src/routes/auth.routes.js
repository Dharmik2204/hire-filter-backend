import express from "express";
const router = express.Router();

import { signup, login, logout, forgotPassword, resetPassword } from "../controllers/auth.js";
import validateFormat from "../middlewares/userValidatition.middlewares.js";
import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";


// public
router.post("/signup", validateFormat, signup);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);

// protected
router.get(
    "/admin-dashboard",
    authMiddleware,
    authorizeRoles("admin"),
    (req, res) => {
        res.json({ message: "Welcome Admin Dashboard" });
    }
);

router.get(
    "/hr-dashboard",
    authMiddleware,
    authorizeRoles("hr", "admin"),
    (req, res) => {
        res.json({ message: "Welcome HR Dashboard" });
    }
);
router.get(
    "/user-dashboard",
    authMiddleware,
    authorizeRoles("hr", "admin", "user"),
    (req, res) => {
        res.json({ message: "Welcome Candidate Dashboard" });
    }
);



export default router;