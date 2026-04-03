import mongoose from "mongoose";
import User from "../models/User.js";
import Tracking from "../models/Tracking.js";
import Goal from "../models/Goal.js";
import DeepWorkSession from "../models/DeepWorkSession.js";
import FocusBlock from "../models/FocusBlock.js";
import Category from "../models/Category.js";
import Notification from "../models/Notification.js";
import Preference from "../models/Preference.js";
import UserSettings from "../models/UserSettings.js";
import Payment from "../models/Payment.js";

/**
 * Moves all data from anonymous user `fromUserId` into registered user `toUserId`, then deletes the anonymous user.
 * Handles unique indexes on Category/FocusBlock by dropping anonymous rows that would duplicate the target.
 */
export async function mergeAnonymousUserIntoTarget(fromUserId, toUserId) {
    const from = new mongoose.Types.ObjectId(fromUserId);
    const to = new mongoose.Types.ObjectId(toUserId);
    if (from.equals(to)) return;

    await Tracking.updateMany({ userId: from }, { $set: { userId: to } });
    await Goal.updateMany({ userId: from }, { $set: { userId: to } });
    await DeepWorkSession.updateMany({ userId: from }, { $set: { userId: to } });
    await Notification.updateMany({ userId: from }, { $set: { userId: to } });
    await Payment.updateMany({ userId: from }, { $set: { userId: to } });

    const toCats = await Category.find({ userId: to }).select("website").lean();
    const catSites = new Set(toCats.map((c) => c.website).filter(Boolean));
    if (catSites.size > 0) {
        await Category.deleteMany({ userId: from, website: { $in: [...catSites] } });
    }
    await Category.updateMany({ userId: from }, { $set: { userId: to } });

    const toBlocks = await FocusBlock.find({ userId: to }).select("website").lean();
    const blockSites = new Set(toBlocks.map((b) => b.website).filter(Boolean));
    if (blockSites.size > 0) {
        await FocusBlock.deleteMany({ userId: from, website: { $in: [...blockSites] } });
    }
    await FocusBlock.updateMany({ userId: from }, { $set: { userId: to } });

    const fromPref = await Preference.findOne({ userId: from });
    const toPref = await Preference.findOne({ userId: to });
    if (fromPref && !toPref) {
        await Preference.updateOne({ _id: fromPref._id }, { $set: { userId: to } });
    } else if (fromPref && toPref) {
        await Preference.deleteOne({ _id: fromPref._id });
    }

    const fromSettings = await UserSettings.findOne({ userId: from });
    const toSettings = await UserSettings.findOne({ userId: to });
    if (fromSettings && !toSettings) {
        await UserSettings.updateOne({ _id: fromSettings._id }, { $set: { userId: to } });
    } else if (fromSettings && toSettings) {
        await UserSettings.deleteOne({ _id: fromSettings._id });
    }

    await User.deleteOne({ _id: from });
}
