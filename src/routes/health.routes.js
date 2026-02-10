import express from "express";

const router = express.Router();

/* Health Check Endpoint */
router.get("/", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export default router;
