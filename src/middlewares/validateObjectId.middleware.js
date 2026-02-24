import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

/**
 * Middleware to strictly validate that any parameter ending with 'Id' 
 * in the URL route (like :examId, :jobId) is a valid MongoDB ObjectID.
 */
export const validateObjectIdParams = (req, res, next) => {
    // Loop through all URL parameters in the current request
    for (const [key, value] of Object.entries(req.params)) {
        // If the parameter name implies it's an ID, check it
        if (key.toLowerCase().endsWith("id")) {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return res.status(400).json(
                    new ApiError(400, `Invalid ${key} format`, [`The provided ${key} is not a valid MongoDB ObjectID`])
                );
            }
        }
    }

    // If all IDs are valid, proceed to the controller
    next();
};
