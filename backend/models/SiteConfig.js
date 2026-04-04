import mongoose from "mongoose";

const SiteConfigSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        description: {
            type: String,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

const SiteConfig = mongoose.models.SiteConfig || mongoose.model("SiteConfig", SiteConfigSchema);
export default SiteConfig;
