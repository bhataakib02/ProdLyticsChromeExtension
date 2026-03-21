/**
 * =====================================================
 * PRODUCTIVITY TRACKER - MAIN SERVER ENTRY POINT
 * =====================================================
 * Node.js + Express backend for the Chrome Extension
 * AI-powered productivity & time tracking platform
 * =====================================================
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const passport = require("passport");

// Route imports
const authRoutes = require("./routes/auth");
const trackingRoutes = require("./routes/tracking");
const categoriesRoutes = require("./routes/categories");
const goalsRoutes = require("./routes/goals");
const focusRoutes = require("./routes/focus");
const pomodoroRoutes = require("./routes/deepwork");
const insightsRoutes = require("./routes/insights");

// Middleware imports
const { globalRateLimit } = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// ==================== DATABASE ====================
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => {
        console.error("❌ MongoDB connection failed:", err.message);
        process.exit(1);
    });

// ==================== MIDDLEWARE ====================
// Security headers
app.use(helmet());

// CORS — allow extension and dashboard
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "chrome-extension://" + (process.env.EXTENSION_ID || "*"),
];
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, extensions)
            if (!origin || allowedOrigins.some((o) => origin.startsWith(o.split("*")[0]))) {
                callback(null, true);
            } else {
                callback(null, true); // Allow all in dev — tighten in production
            }
        },
        credentials: true,
    })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (dev only)
if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

// Passport (Google OAuth)
app.use(passport.initialize());
require("./config/passport")(passport);

// Global rate limiting — 100 requests per 15 minutes per IP
app.use(globalRateLimit);

// ==================== ROUTES ====================
app.use("/api/auth", authRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/focus", focusRoutes);
app.use("/api/deepwork", pomodoroRoutes);
app.use("/api/insights", insightsRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        message: "🚀 Productivity Tracker API is running",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use(errorHandler);

// ==================== START ====================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
