export const formatError = (error, statusCode = 500, message = "Server error") => {
    const isDevelopment = process.env.NODE_ENV === "development";

    console.error(`[ERROR] ${message}:`, error);

    return {
        statusCode,
        success: false,
        message,
        errors: [],
        data: null,
        ...(isDevelopment && { stack: error.stack })
    };
};
