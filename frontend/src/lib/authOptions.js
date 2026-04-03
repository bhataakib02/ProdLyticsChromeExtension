import dbConnect from "../../../backend/db/mongodb.js";
import User from "../../../backend/models/User.js";
import Google from "@auth/core/providers/google";
import Credentials from "@auth/core/providers/credentials";
import bcrypt from "bcryptjs";

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions = {
    session: { strategy: "jwt" },
    providers: [
        ...(googleClientId && googleClientSecret
            ? [
                  Google({
                      clientId: googleClientId,
                      clientSecret: googleClientSecret,
                  }),
              ]
            : []),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = String(credentials?.email || "").trim().toLowerCase();
                const password = String(credentials?.password || "");
                if (!email || !password) return null;

                await dbConnect();
                const user = await User.findOne({ email }).select("+password");
                if (!user || !user.password) return null;
                const ok = await bcrypt.compare(password, user.password);
                if (!ok) return null;

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    image: user.image || user.avatar || "",
                    subscription: user.subscription || (user.isPremium ? "pro" : "free"),
                    role: user.role || "user",
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            await dbConnect();
            const email = String(user?.email || "").trim().toLowerCase();
            if (!email) return false;

            let dbUser = await User.findOne({ email });
            if (!dbUser) {
                dbUser = await User.create({
                    name: user?.name || email.split("@")[0],
                    email,
                    image: user?.image || "",
                    avatar: user?.image || "",
                    googleId: account?.provider === "google" ? account.providerAccountId : undefined,
                    subscription: "free",
                    isPremium: false,
                    isAnonymous: false,
                });
            } else {
                dbUser.isAnonymous = false;
                if (account?.provider === "google" && account.providerAccountId) {
                    dbUser.googleId = dbUser.googleId || account.providerAccountId;
                }
                if (user?.image) {
                    dbUser.image = user.image;
                    dbUser.avatar = user.image;
                }
                if (user?.name) dbUser.name = user.name;
                if (!dbUser.subscription) dbUser.subscription = dbUser.isPremium ? "pro" : "free";
                dbUser.isPremium = dbUser.subscription === "pro";
                await dbUser.save();
            }
            return true;
        },
        async jwt({ token }) {
            if (token?.email) {
                await dbConnect();
                const dbUser = await User.findOne({ email: String(token.email).toLowerCase() }).lean();
                if (dbUser) {
                    token.userId = dbUser._id.toString();
                    token.subscription = dbUser.subscription || (dbUser.isPremium ? "pro" : "free");
                    token.role = dbUser.role || "user";
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.userId || "";
                session.user.subscription = token.subscription || "free";
                session.user.role = token.role || "user";
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
    },
    secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
};
