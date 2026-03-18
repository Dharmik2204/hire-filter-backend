import express from "express";
const router = express.Router();

import { signup, login, logout, forgotPassword, resetPassword, sendSignupOtp, verifySignupOtp } from "../controllers/auth.js";
import validateFormat from "../middlewares/userValidation.middlewares.js";
import { authorizeRoles, authMiddleware } from "../middlewares/authorize.middlewares.js";
import { authLimiter } from "../middlewares/rateLimiter.middlewares.js";


// public
router.post("/send-signup-otp", authLimiter, sendSignupOtp);
router.post("/verify-signup-otp", authLimiter, verifySignupOtp);
router.post("/signup", authLimiter, validateFormat, signup);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/login", authLimiter, login);
router.post("/logout", authMiddleware, logout);


export default router;