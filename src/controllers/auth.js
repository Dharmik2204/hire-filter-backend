import { findUserByEmail, updateUserToken, createUser, deleteUser, saveOTP, clearOTPAndUpdatePassword, incrementOtpAttempts } from "../repositories/user.repository.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { isString } from "../utils/Validation.js";


//signup

export const signup = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            company,
            adminKey,
        } = req.body;

        // Presence and Type Checks
        if (!name) return res.status(400).json(new ApiError(400, "Name is required"));
        if (!isString(name)) return res.status(400).json(new ApiError(400, "Name must be a string"));

        if (!email) return res.status(400).json(new ApiError(400, "Email is required"));
        if (!isString(email)) return res.status(400).json(new ApiError(400, "Email must be a string"));

        if (!password) return res.status(400).json(new ApiError(400, "Password is required"));
        if (!isString(password)) return res.status(400).json(new ApiError(400, "Password must be a string"));

        if (!role) return res.status(400).json(new ApiError(400, "Role is required"));
        if (!isString(role)) return res.status(400).json(new ApiError(400, "Role must be a string"));

        if (role === "admin") {
            if (!adminKey) return res.status(400).json(new ApiError(400, "Admin secret key is required for admin role"));
            if (!isString(adminKey)) return res.status(400).json(new ApiError(400, "Admin secret key must be a string"));
            if (adminKey !== process.env.ADMIN_SECRET_KEY) {
                return res.status(403).json(new ApiError(403, "Invalid admin secret key"));
            }
        }

        if (!["user", "hr", "admin"].includes(role)) {
            return res.status(403).json(new ApiError(403, "Invalid role"));
        }

        if (role === "hr" && (!company)) {
            return res.status(400).json(new ApiError(400, "Company details are required for HR"));
        }
        if (role === "hr" && !isString(company)) {
            return res.status(400).json(new ApiError(400, "Company must be a string"));
        }

        const userExists = await findUserByEmail(email);
        if (userExists) {
            return res.status(409).json(new ApiError(409, "User already exists"));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userPayload = {
            name,
            email,
            password: hashedPassword,
            role,
            company: role === "hr" ? company : undefined,
        };

        await createUser(userPayload);

        return res.status(201).json(
            new ApiResponse(201, null, `${role} signup successful`)
        );
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json(new ApiError(500, "Server error", [], error.stack));
    }
};

//login

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json(new ApiError(400, "Email and password required"));
        }

        if (!isString(email) || !isString(password)) {
            return res.status(400).json(new ApiError(400, "Email and password must be strings"));
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json(new ApiError(401, "Invalid credentials"));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json(new ApiError(401, "Invalid credentials"));
        }


        const token = await jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        await updateUserToken(user._id, token);

        res.status(200).json(
            new ApiResponse(200, { token, role: user.role }, "Login successful")
        );

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json(new ApiError(500, "Server error", [], error.stack));
    }
};


//logout 

export const logout = async (req, res) => {
    try {

        await updateUserToken(req.user._id, null);

        res.status(200).json(
            new ApiResponse(200, null, "Logout successful")
        );

    } catch (error) {
        res.status(500).json(new ApiError(500, "Server error", [], error.stack));
    }
};


//forgotpassword

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json(new ApiError(400, "Email is Required"));
        }
        if (!isString(email)) {
            return res.status(400).json(new ApiError(400, "Email must be a string"));
        }
        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(200).json(
                new ApiResponse(200, null, "If the email exists, OTP has been sent")
            );
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiry = Date.now() + 10 * 60 * 1000; //10 minutes

        const hashedOtp = await bcrypt.hash(String(otp), 10);

        await saveOTP(user._id, hashedOtp, otpExpiry);

        await sendEmail({
            to: user.email,
            subject: "Password Reset OTP",
            text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
            html: `
        <h2>Password Reset</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for 10 minutes.</p>
      `,
        });


        res.status(200).json(
            new ApiResponse(200, null, "OTP sent successfully")
        );

    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json(new ApiError(500, "Internal Server Error", [], error.stack));
    }
}

//resetPassword

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json(new ApiError(400, "Email, OTP and new password required"));
        }

        if (!isString(email) || !isString(newPassword)) {
            return res.status(400).json(new ApiError(400, "Email and new password must be strings"));
        }
        // OTP could be number or string depending on how it's sent, but let's check for basic content
        if (typeof otp !== "string" && typeof otp !== "number") {
            return res.status(400).json(new ApiError(400, "OTP must be a string or number"));
        }

        const user = await findUserByEmail(email);

        // OTP missing or expired
        if (!user || !user.otp || user.otpExpiry < Date.now()) {
            return res.status(400).json(new ApiError(400, "Invalid or expired OTP"));
        }

        // Max attempts reached
        if (user.otpAttempts >= 3) {
            await clearOTPAndUpdatePassword(user._id, user.password);
            return res.status(400).json(new ApiError(400, "OTP attempts exceeded. Please request a new OTP."));
        }

        // Compare OTP
        const isOtpValid = await bcrypt.compare(String(otp), user.otp);

        if (!isOtpValid) {
            await incrementOtpAttempts(user._id);
            return res.status(400).json(new ApiError(400, "Invalid or expired OTP"));
        }

        // OTP correct → reset password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await clearOTPAndUpdatePassword(user._id, hashedPassword);

        return res.status(200).json(
            new ApiResponse(200, null, "Password reset successful")
        );

    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json(new ApiError(500, "Internal Server Error", [], error.stack));
    }
};


