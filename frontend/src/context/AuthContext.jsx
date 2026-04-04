"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    requestExtensionSync,
    bridgeGetAccessToken,
    bridgeGetDeviceKey,
    bridgeSetAccessToken,
    bridgeClearAccessToken,
} from "@/lib/extensionSync";
import { waitForSyncedAnonymousDeviceKey, getOrCreateAnonymousDeviceKey } from "@/lib/anonymousDeviceKey";

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
    weeklyDigestEmail: false,
    weeklyDigestPush: false,
    coachLlmPhrasing: false,
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
        isPremium: me.subscription ? me.subscription === "pro" : Boolean(me.isPremium),
        subscription: me.subscription || (me.isPremium ? "pro" : "free"),
        stripeCustomerId: me.stripeCustomerId || null,
        hasPassword: Boolean(me.hasPassword),
        role: me.role || "user",
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
        if (sessionUser?.email) {
            try {
                localStorage.setItem("prodlytics_last_email", String(sessionUser.email).toLowerCase());
            } catch {
                /* ignore */
            }
        }
        setUser(sessionUser);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setBootstrapError("");
            try {
                if (typeof window !== "undefined") {
                    // Small delay to ensure content scripts have started injecting
                    await new Promise((r) => setTimeout(r, 400));
                }
                const fromBridge =
                    typeof window !== "undefined" ? await bridgeGetAccessToken({ timeoutMs: 1500 }) : null;
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

                // PERMANENT FIX: Multi-stage wait for anonymous device key
                let deviceKey = await waitForSyncedAnonymousDeviceKey(2500);

                // Final on-demand check against the bridge if sync hasn't happened yet
                if (!deviceKey && typeof window !== "undefined") {
                    deviceKey = await bridgeGetDeviceKey({ timeoutMs: 1200 });
                }

                if (!deviceKey) deviceKey = getOrCreateAnonymousDeviceKey();

                const anonBody = deviceKey ? { deviceKey } : {};

                const { data } = await axios.post(`${API_URL}/auth/anonymous`, anonBody);
                if (!data?.accessToken) {
                    throw new Error("No session token from server.");
                }
                // Persist token to extension storage (chrome.storage.local) via the bridge
                // so it survives browser restarts and new window sessions.
                bridgeSetAccessToken(data.accessToken);
                if (typeof window !== "undefined") {
                    localStorage.setItem("accessToken", data.accessToken);
                    // Also persist the deviceKey to sessionStorage for fast future lookups
                    if (deviceKey) {
                        try { sessionStorage.setItem("prodlytics_anonymous_device_key", deviceKey); } catch { /* ignore */ }
                    }
                }
                const sessionUser = await loadSession(data.accessToken);
                if (!cancelled) setUser(sessionUser);
            } catch (err) {
                const msg =
                    err.response?.data?.error ||
                    err.message ||
                    "Could not start a session. (Local dev? Check your MongoDB Atlas IP Whitelist.)";
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
                const bearer =
                    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                const { data } = await axios.post(
                    `${API_URL}/auth/google`,
                    { idToken },
                    {
                        headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
                    }
                );
                if (!data?.accessToken) {
                    setAuthError("Sign-in failed: no token returned.");
                    return false;
                }
                await applyToken(data.accessToken);
                router.refresh();
                return true;
            } catch (err) {
                const msg = err.response?.data?.error || err.message || "Sign-in failed.";
                setAuthError(String(msg));
                return false;
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
                /** After email/password login: updates user from JWT without full page reload. */
                applySessionToken: applyToken,
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
