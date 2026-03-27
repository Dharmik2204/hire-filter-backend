import { findUserByEmail, findUserByIdentifier, updateUserToken, createUser, updateUser, deleteUser, saveOTP, clearOTP, clearOTPAndUpdatePassword, incrementOtpAttempts } from "../repositories/user.repository.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";
import { sendSms } from "../utils/sendSms.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, sendSignupOtpSchema, verifySignupOtpSchema } from "../validations/auth.validation.js";

//sendSignupOtp
export const sendSignupOtp = async (req, res) => {
    try {
        const { error, value } = sendSignupOtpSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message);
            return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
        }

        const { identifier } = value;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        let user = await findUserByIdentifier(identifier);

        if (user && (user.isEmailVerified || user.isPhoneVerified) && user.name) {
            return res.status(409).json(new ApiError(409, "User already exists", ["User already exists"]));
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        const hashedOtp = await bcrypt.hash(String(otp), 10);

        if (!user) {
            const createPayload = isEmail
                ? { email: identifier, isEmailVerified: false }
                : { phone: identifier, isPhoneVerified: false };
            user = await createUser(createPayload);
        }

        await saveOTP(user._id, hashedOtp, otpExpiry);

        if (isEmail) {
            await sendEmail({
                to: identifier,
                subject: "Signup Email Verification OTP",
                text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
                html: `
            <h2>Email Verification</h2>
            <p>Your OTP to verify your email for signup is:</p>
            <h1>${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
          `,
            });
        } else {
            await sendSms({
                to: identifier,
                text: `Your HireFilter OTP is: ${otp}`,
            });
        }

        res.status(200).json(
            new ApiResponse(200, null, `OTP sent successfully to your ${isEmail ? 'email' : 'phone'}`)
        );
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Internal Server Error"));
    }
};

//verifySignupOtp
export const verifySignupOtp = async (req, res) => {
    try {
        const { error, value } = verifySignupOtpSchema.validate(req.body, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message);
            return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
        }

        const { identifier, otp } = value;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        const user = await findUserByIdentifier(identifier);

        if (!user || ((user.isEmailVerified || user.isPhoneVerified) && user.name)) {
            return res.status(400).json(new ApiError(400, "Invalid request", ["Invalid request"]));
        }

        // OTP missing or expired
        if (!user.otp || user.otpExpiry < Date.now()) {
            return res.status(400).json(new ApiError(400, "Invalid or expired OTP", ["Invalid or expired OTP"]));
        }

        // Max attempts reached
        if (user.otpAttempts >= 3) {
            await clearOTP(user._id);
            return res.status(400).json(new ApiError(400, "OTP attempts exceeded. Please request a new OTP.", ["OTP attempts exceeded. Please request a new OTP."]));
        }

        // Compare OTP
        const isOtpValid = await bcrypt.compare(String(otp), user.otp);

        if (!isOtpValid) {
            await incrementOtpAttempts(user._id);
            return res.status(400).json(new ApiError(400, "Invalid or expired OTP", ["Invalid or expired OTP"]));
        }

        // OTP correct → set isEmailVerified/isPhoneVerified true and clear OTP
        const updatePayload = {
            otp: null,
            otpExpiry: null,
            otpAttempts: 0
        };
        if (isEmail) updatePayload.isEmailVerified = true;
        else updatePayload.isPhoneVerified = true;

        await updateUser(user._id, updatePayload);

        return res.status(200).json(
            new ApiResponse(200, null, `${isEmail ? 'Email' : 'Phone'} verified successfully. You can now complete your signup.`)
        );

    } catch (error) {
        return res.status(500).json(formatError(error, 500, "Internal Server Error"));
    }
};

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
            phone,
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

        const identifier = email || phone;
        const userExists = await findUserByIdentifier(identifier);

        if (!userExists || !(userExists.isEmailVerified || userExists.isPhoneVerified)) {
            return res.status(403).json(new ApiError(403, "Identifier not verified. Please verify OTP first.", ["Identifier not verified. Please verify OTP first."]));
        }

        if (userExists.name && userExists.password) {
            return res.status(409).json(new ApiError(409, "User already exists", ["User already exists"]));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const companyName = typeof company === "object" ? company.name : company;

        const userPayload = {
            name,
            password: hashedPassword,
            role,
            company: role === "hr" ? { name: companyName } : undefined,
        };

        if (email) userPayload.email = email;
        if (phone) userPayload.phone = phone;

        await updateUser(userExists._id, userPayload);

        return res.status(201).json(
            new ApiResponse(201, null, `${role} signup successful`)
        );
    } catch (error) {
        return res.status(500).json(formatError(error, 500, "Server error"));
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

        const { identifier, password } = value;

        const user = await findUserByIdentifier(identifier);
        if (!user) {
            return res.status(401).json(new ApiError(401, "Invalid credentials", ["Invalid credentials"]));
        }

        if (!user.password) {
            return res.status(401).json(new ApiError(401, "Account setup incomplete. Please sign up or reset password."));
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
        res.status(500).json(formatError(error, 500, "Server error"));
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
        res.status(500).json(formatError(error, 500, "Logout failed"));
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

        const { identifier } = value;
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        const user = await findUserByIdentifier(identifier);

        if (!user) {
            return res.status(200).json(
                new ApiResponse(200, null, "If the account exists, OTP has been sent")
            );
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiry = Date.now() + 10 * 60 * 1000; //10 minutes

        const hashedOtp = await bcrypt.hash(String(otp), 10);

        await saveOTP(user._id, hashedOtp, otpExpiry);

        if (isEmail) {
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
        } else {
            await sendSms({
                to: user.phone,
                text: `Your HireFilter Password Reset OTP is: ${otp}`,
            });
        }

        res.status(200).json(
            new ApiResponse(200, null, "OTP sent successfully")
        );

    } catch (error) {
        res.status(500).json(formatError(error, 500, "Internal Server Error"));
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

        const { identifier, otp, newPassword } = value;

        const user = await findUserByIdentifier(identifier);

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
        return res.status(500).json(formatError(error, 500, "Internal Server Error"));
    }
};


