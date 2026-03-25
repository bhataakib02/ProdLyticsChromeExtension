import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["info", "success", "warning", "error"],
            default: "info",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
