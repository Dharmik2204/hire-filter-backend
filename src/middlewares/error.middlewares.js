import { ApiError } from "../utils/ApiError.js";
import multer from "multer";

/**
 * Global Error Handler Middleware
 * Catches all types of errors (Multer, Mongoose, JWT, etc.) and returns a standardized JSON response.
 */
export const globalErrorHandler = (err, req, res, next) => {
    let error = err;

    // 1. Log the error for Internal Tracking
    console.error(`[ERROR ERROR_MIDDLEWARE] - ${req.method} ${req.path}:`, {
        message: error.message,
        stack: error.stack,
    });

    // 2. Normalize standard Errors into ApiError
    if (!(error instanceof ApiError)) {

        // Handle Mongoose Validation Error
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((el) => el.message);
            error = new ApiError(400, "Database Validation Failed", messages);
        }

        // Handle Mongoose Cast Error (Invalid ObjectID)
        else if (error.name === "CastError") {
            error = new ApiError(400, `Invalid Resource Format: ${error.value} is not a valid ${error.path}`);
        }

        // Handle Multer Errors (Upload limits, wrong fields)
        else if (error instanceof multer.MulterError) {
            const message = `File Upload Error: ${error.message}${error.field ? ` (field: ${error.field})` : ""}`;
            error = new ApiError(400, message);
        }

        // Handle JWT Authentication Errors
        else if (error.name === "JsonWebTokenError") {
            error = new ApiError(401, "Authentication failed: Invalid credentials provided.");
        }
        else if (error.name === "TokenExpiredError") {
            error = new ApiError(401, "Authentication failed: Your session has expired. Please login again.");
        }

        // Final Fallback for Generic Errors
        else {
            const statusCode = error.statusCode || 500;
            const message = error.message || "Internal Server Error Occurred";
            error = new ApiError(statusCode, message, error?.errors || [], error.stack);
        }
    }

    // 3. Prepare the Standardized Response Body
    const responseBody = {
        statusCode: error.statusCode || 500,
        success: false,
        message: error.message,
        errors: error.errors || [],
        data: null,
        // Include stack trace only in development mode for easier debugging
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    };

    // 4. Send the JSON Response
    res.status(responseBody.statusCode).json(responseBody);
};
