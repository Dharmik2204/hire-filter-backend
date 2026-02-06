import { findUserByEmail, updateUserToken, createUser, deleteUser, saveOTP, clearOTPAndUpdatePassword, incrementOtpAttempts } from "../repositories/user.repository.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../validations/auth.validation.js";

//signup

export const signup = async (req, res) => {
    try {
        const { error, value } = signupSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message);
            return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
        }

        const {
            name,
            email,
            password,
            role,
            company,
            adminKey,
        } = value;

        if (role === "admin") {
            if (adminKey !== process.env.ADMIN_SECRET_KEY) {
                return res.status(403).json(new ApiError(403, "Invalid admin secret key", ["Invalid admin secret key"]));
            }
        }

        const userExists = await findUserByEmail(email);
        if (userExists) {
            return res.status(409).json(new ApiError(409, "User already exists", ["User already exists"]));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const companyName = typeof company === "object" ? company.name : company;

        const userPayload = {
            name,
            email,
            password: hashedPassword,
            role,
            company: role === "hr" ? { name: companyName } : undefined,
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
        const { error, value } = loginSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message);
            return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
        }

        const { email, password } = value;

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json(new ApiError(401, "Invalid credentials", ["Invalid credentials"]));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json(new ApiError(401, "Invalid credentials", ["Invalid credentials"]));
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
        console.error("Logout error:", error);
        res.status(500).json(new ApiError(500, "Logout failed", [], error.stack));
    }
};


//forgotpassword

export const forgotPassword = async (req, res) => {
    try {
        const { error, value } = forgotPasswordSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message);
            return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
        }

        const { email } = value;
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
        console.error("Forgot password error:", error);
        res.status(500).json(new ApiError(500, "Internal Server Error", [], error.stack));
    }
}

//resetPassword

export const resetPassword = async (req, res) => {
    try {
        const { error, value } = resetPasswordSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message);
            return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
        }

        const { email, otp, newPassword } = value;

        const user = await findUserByEmail(email);

        // OTP missing or expired
        if (!user || !user.otp || user.otpExpiry < Date.now()) {
            return res.status(400).json(new ApiError(400, "Invalid or expired OTP", ["Invalid or expired OTP"]));
        }

        // Max attempts reached
        if (user.otpAttempts >= 3) {
            await clearOTPAndUpdatePassword(user._id, user.password);
            return res.status(400).json(new ApiError(400, "OTP attempts exceeded. Please request a new OTP.", ["OTP attempts exceeded. Please request a new OTP."]));
        }

        // Compare OTP
        const isOtpValid = await bcrypt.compare(String(otp), user.otp);

        if (!isOtpValid) {
            await incrementOtpAttempts(user._id);
            return res.status(400).json(new ApiError(400, "Invalid or expired OTP", ["Invalid or expired OTP"]));
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


