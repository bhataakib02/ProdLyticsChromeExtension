"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const AuthContext = createContext();

export const API_URL = "/api";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const login = async () => {
        router.push("/dashboard");
        return { success: true };
    };

    const register = async () => {
        router.push("/dashboard");
        return { success: true };
    };

    const logout = () => {
        router.push("/");
    };

    const updateUser = (updates) => {
        setUser(prev => prev ? { ...prev, ...updates } : prev);
    };

    const syncWithExtension = () => {
        const extensionId = "dfbcfgkpgbfbdjabippomkelpkboffen";
        console.log(`📡 Syncing preferences to extension: ${extensionId}`);
        if (typeof window !== "undefined" && window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
            window.chrome.runtime.sendMessage(extensionId, { action: "syncAll" }, (response) => {
                if (window.chrome.runtime.lastError) {
                    console.warn("❌ Could not sync preferences:", window.chrome.runtime.lastError.message);
                } else {
                    console.log("✅ Preferences synced successfully");
                }
            });
        }
    };

    const updatePreference = async (key, value) => {
        if (!user) return;

        // Optimistic UI update
        const newPrefs = { ...(user.preferences || {}), [key]: value };
        updateUser({ preferences: newPrefs });

        try {
            const token = localStorage.getItem("accessToken");
            if (token) {
                await axios.put(`${API_URL}/auth/preferences`, { [key]: value }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            syncWithExtension();
        } catch (err) {
            console.error(`Error updating focus preference ${key}:`, err);
        }
    };

    useEffect(() => {
        // Automatically mock a logged-in user to bypass the login system entirely
        setUser({
            name: "ProdLytics User",
            email: "local@prodlytics.com",
            isActive: true,
            avatar: "",
            preferences: {
                strictMode: true,
                smartBlock: true,
                breakReminders: false
            }
        });
        setLoading(false);
    }, []);

    const checkUser = async () => {
        // Mock checkUser function
        return true;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, checkUser, updateUser, updatePreference }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

