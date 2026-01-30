import jwt from "jsonwebtoken";
import { User } from "../models/users.models.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Token missing" });
        }

        const token = authHeader.split(" ")[1];

        // 1️⃣ verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2️⃣ VERY IMPORTANT: verify token exists in DB
        const user = await User.findOne({
            _id: decoded.id || decoded._id,
            token: token
        }).select("-password");

        if (!user) {
            return res.status(401).json({
                message: "Invalid or logged out token"
            });
        }

        req.user = user;
        next();

    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};



export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You are not allowed to access this resource"
            });
        }
        next();
    };
};


