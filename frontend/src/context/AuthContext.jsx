"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    requestExtensionSync,
    bridgeGetAccessToken,
    bridgeSetAccessToken,
    bridgeClearAccessToken,
} from "@/lib/extensionSync";

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
    productivityNudges: true,
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

function authHeaders(token) {
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loadSession(token) {
    const [meRes, prefRes] = await Promise.all([
        axios.get(`${API_URL}/auth/me`, { headers: authHeaders(token) }),
        axios.get(`${API_URL}/auth/preferences`, { headers: authHeaders(token) }),
    ]);
    const me = meRes.data;
    const preferences = mergePreferencesFromApi(prefRes.data);
    return {
        id: me.id,
        email: me.email || "",
        name: me.name,
        avatar: me.avatar || "",
        isAnonymous: Boolean(me.isAnonymous),
        isActive: true,
        preferences,
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bootstrapError, setBootstrapError] = useState("");
    const [sessionKey, setSessionKey] = useState(0);
    const [authError, setAuthError] = useState("");
    const router = useRouter();

    const clearAuthError = useCallback(() => setAuthError(""), []);

    const applyToken = useCallback(async (token) => {
        if (!token) {
            setUser(null);
            return;
        }
        localStorage.setItem("accessToken", token);
        bridgeSetAccessToken(token);
        const sessionUser = await loadSession(token);
        setUser(sessionUser);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setBootstrapError("");
            try {
                if (typeof window !== "undefined") {
                    await new Promise((r) => setTimeout(r, 120));
                }
                const fromBridge =
                    typeof window !== "undefined" ? await bridgeGetAccessToken({ timeoutMs: 550 }) : null;
                const fromLs = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

                const trySession = async (t) => {
                    try {
                        return await loadSession(t);
                    } catch {
                        return null;
                    }
                };

                if (fromBridge) {
                    const sessionUser = await trySession(fromBridge);
                    if (sessionUser) {
                        localStorage.setItem("accessToken", fromBridge);
                        bridgeSetAccessToken(fromBridge);
                        if (!cancelled) setUser(sessionUser);
                        return;
                    }
                }

                if (fromLs) {
                    const sessionUser = await trySession(fromLs);
                    if (sessionUser) {
                        localStorage.setItem("accessToken", fromLs);
                        bridgeSetAccessToken(fromLs);
                        if (!cancelled) setUser(sessionUser);
                        return;
                    }
                    localStorage.removeItem("accessToken");
                }

                bridgeClearAccessToken();

                const { data } = await axios.post(`${API_URL}/auth/anonymous`, {});
                if (!data?.accessToken) {
                    throw new Error("No session token from server.");
                }
                if (typeof window !== "undefined") localStorage.setItem("accessToken", data.accessToken);
                bridgeSetAccessToken(data.accessToken);
                const sessionUser = await loadSession(data.accessToken);
                if (!cancelled) setUser(sessionUser);
            } catch (err) {
                const msg =
                    err.response?.data?.error ||
                    err.message ||
                    "Could not start a session. Check MONGO_URI and JWT_SECRET on the server.";
                if (!cancelled) {
                    setBootstrapError(String(msg));
                    setUser(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sessionKey]);

    const completeGoogleLogin = useCallback(
        async (idToken) => {
            setAuthError("");
            try {
                const { data } = await axios.post(`${API_URL}/auth/google`, { idToken });
                if (!data?.accessToken) {
                    setAuthError("Sign-in failed: no token returned.");
                    return;
                }
                await applyToken(data.accessToken);
                router.refresh();
            } catch (err) {
                const msg = err.response?.data?.error || err.message || "Sign-in failed.";
                setAuthError(String(msg));
            }
        },
        [applyToken, router]
    );

    const login = async () => {
        router.push("/");
        return { success: true };
    };

    const register = async () => {
        router.push("/");
        return { success: true };
    };

    const logout = useCallback(() => {
        localStorage.removeItem("accessToken");
        bridgeClearAccessToken();
        setUser(null);
        setSessionKey((k) => k + 1);
        router.push("/");
        router.refresh();
    }, [router]);

    const updateUser = (updates) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    };

    const syncWithExtension = () => {
        requestExtensionSync();
    };

    const updatePreference = async (key, value) => {
        if (!user) return;
        const newPrefs = { ...DEFAULT_PREFERENCES, ...(user.preferences || {}), [key]: value };
        updateUser({ preferences: newPrefs });
        try {
            const token = localStorage.getItem("accessToken");
            await axios.put(`${API_URL}/auth/preferences`, { [key]: value }, { headers: authHeaders(token) });
            syncWithExtension();
        } catch (err) {
            console.error(`Error updating focus preference ${key}:`, err);
        }
    };

    const updatePreferences = async (partial) => {
        if (!user || !partial || typeof partial !== "object") return false;
        const newPrefs = { ...(user.preferences || DEFAULT_PREFERENCES), ...partial };
        updateUser({ preferences: newPrefs });
        try {
            const token = localStorage.getItem("accessToken");
            await axios.put(`${API_URL}/auth/preferences`, partial, { headers: authHeaders(token) });
            syncWithExtension();
            return true;
        } catch (err) {
            console.error("Error updating preferences:", err);
            return false;
        }
    };

    const checkUser = async () => {
        return Boolean(localStorage.getItem("accessToken"));
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                bootstrapError,
                authError,
                clearAuthError,
                completeGoogleLogin,
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
