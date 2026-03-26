"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { requestExtensionSync } from "@/lib/extensionSync";

const AuthContext = createContext();

export const API_URL = "/api";

const DEFAULT_PREFERENCES = {
    strictMode: true,
    smartBlock: true,
    breakReminders: false,
    focusSessionMinutes: 25,
    breakSessionMinutes: 5,
    deepWorkMinutes: 25,
    breakMinutes: 5,
    theme: "dark",
};

function mergePreferencesFromApi(data) {
    const next = { ...DEFAULT_PREFERENCES };
    if (!data || typeof data !== "object") return next;
    for (const key of Object.keys(DEFAULT_PREFERENCES)) {
        if (data[key] !== undefined && data[key] !== null) {
            next[key] = data[key];
        }
    }
    return next;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const login = async () => {
        router.push("/");
        return { success: true };
    };

    const register = async () => {
        router.push("/");
        return { success: true };
    };

    const logout = () => {
        router.push("/");
    };

    const updateUser = (updates) => {
        setUser(prev => prev ? { ...prev, ...updates } : prev);
    };

    const syncWithExtension = () => {
        requestExtensionSync();
    };

    const updatePreference = async (key, value) => {
        if (!user) return;

        // Merge with defaults so keys like breakMinutes are never dropped from context.
        const newPrefs = { ...DEFAULT_PREFERENCES, ...(user.preferences || {}), [key]: value };
        updateUser({ preferences: newPrefs });

        try {
            const token = localStorage.getItem("accessToken");
            await axios.put(`${API_URL}/auth/preferences`, { [key]: value }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            syncWithExtension();
        } catch (err) {
            console.error(`Error updating focus preference ${key}:`, err);
        }
    };

    /** Save several preference keys at once (e.g. timer work + break defaults). */
    const updatePreferences = async (partial) => {
        if (!user || !partial || typeof partial !== "object") return false;
        const newPrefs = { ...(user.preferences || DEFAULT_PREFERENCES), ...partial };
        updateUser({ preferences: newPrefs });
        try {
            const token = localStorage.getItem("accessToken");
            await axios.put(`${API_URL}/auth/preferences`, partial, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            syncWithExtension();
            return true;
        } catch (err) {
            console.error("Error updating preferences:", err);
            return false;
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axios.get(`${API_URL}/auth/preferences`);
                if (cancelled) return;
                const preferences = mergePreferencesFromApi(data);
                setUser({
                    name: "ProdLytics User",
                    email: "local@prodlytics.com",
                    isActive: true,
                    avatar: "",
                    preferences,
                });
            } catch {
                if (!cancelled) {
                    setUser({
                        name: "ProdLytics User",
                        email: "local@prodlytics.com",
                        isActive: true,
                        avatar: "",
                        preferences: { ...DEFAULT_PREFERENCES },
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const checkUser = async () => {
        // Mock checkUser function
        return true;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                checkUser,
                updateUser,
                updatePreference,
                updatePreferences,
            }}
        >
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

