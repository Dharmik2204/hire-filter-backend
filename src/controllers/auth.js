import { findUserByEmail, updateUserToken, createUser, deleteUser, saveOTP, clearOTPAndUpdatePassword, incrementOtpAttempts } from "../repositories/user.repository.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";


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
            // phone,
            // currentAddress,
            // permanentAddress
        } = req.body;


        if (role === "admin") {
            if (adminKey !== process.env.ADMIN_SECRET_KEY) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid admin secret key"
                });
            }
        }

        if (!["user", "hr", "admin"].includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Invalid role",
            });
        }

        if (role === "hr" && (!company)) {
            return res.status(400).json({
                success: false,
                message: "Company details are required for HR"
            });
        }



        // if (role === "user") {
        //     if (!phone || !currentAddress || !permanentAddress) {
        //         return res.status(400).json({
        //             success: false,
        //             message:
        //                 "Phone, current address and permanent address are required for users",
        //         });
        //     }
        // }

        // if (role === "hr") {
        //     if (!phone || !company) {
        //         return res.status(400).json({
        //             success: false,
        //             message: "Phone number and Company are required for HR",
        //         });
        //     }
        // }

        const userExists = await findUserByEmail(email);
        if (userExists) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userPayload = {
            name,
            email,
            password: hashedPassword,
            role,
            company: role === "hr" ? company : undefined,
            // phone,
            // currentAddress: role === "user" ? currentAddress : undefined,
            // permanentAddress: role === "user" ? permanentAddress : undefined
        };

        await createUser(userPayload);

        return res.status(201).json({
            success: true,
            message: `${role} signup successful`,
        });
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

//login

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password required"
            });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }


        const token = await jwt.sign(
            {
                id: user._id,
                role: user.role   // 👈 include role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );



        await updateUserToken(user._id, token);



        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            role: user.role   // 👈 REQUIRED
        });




    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


//logout 

export const logout = async (req, res) => {
    try {

        await updateUserToken(req.user._id, null);

        res.status(200).json({
            success: true,
            message: "Logout successful"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


//forgotpassword

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is Required"
            });
        }
        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If the email exists, OTP has been sent"
            });
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


        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.error("Error: ", error);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

//resetPassword

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                message: "Email, OTP and new password required"
            });
        }

        const user = await findUserByEmail(email);

        // OTP missing or expired
        if (!user || !user.otp || user.otpExpiry < Date.now()) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        // Max attempts reached
        if (user.otpAttempts >= 3) {
            await clearOTPAndUpdatePassword(user._id, user.password);
            return res.status(400).json({
                message: "OTP attempts exceeded. Please request a new OTP."
            });
        }

        // Compare OTP
        const isOtpValid = await bcrypt.compare(String(otp), user.otp);

        if (!isOtpValid) {
            await incrementOtpAttempts(user._id);

            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        // OTP correct → reset password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await clearOTPAndUpdatePassword(user._id, hashedPassword);

        return res.status(200).json({
            success: true,
            message: "Password reset successful"
        });

    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


