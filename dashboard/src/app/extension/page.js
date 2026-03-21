"use client";

import { useState } from "react";
import { Chrome, Download, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ExtensionSetupPage() {
    const { user } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'success' | 'error' | null

    const handleManualSync = () => {
        setSyncing(true);
        setSyncStatus(null);

        const token = localStorage.getItem("accessToken");
        const extensionId = "dfbcfgkpgbfbdjabippomkelpkboffen";

        if (typeof window !== "undefined" && window.chrome && window.chrome.runtime) {
            window.chrome.runtime.sendMessage(extensionId, { action: "setToken", token }, (response) => {
                setSyncing(false);
                if (window.chrome.runtime.lastError) {
                    setSyncStatus("error");
                    console.error("Sync Error:", window.chrome.runtime.lastError.message);
                } else {
                    setSyncStatus("success");
                }
            });
        } else {
            setSyncing(false);
            setSyncStatus("error");
        }
    };

    const steps = [
        {
            title: "Download Extension",
            description: "Install the AERO Chrome Extension from the Web Store.",
            icon: Download,
            link: "#", // Placeholder
            linkText: "Visit Chrome Web Store"
        },
        {
            title: "Pin to Toolbar",
            description: "Click the puzzle icon in Chrome and pin AERO for easy access.",
            icon: Chrome,
        },
        {
            title: "Sync with Dashboard",
            description: "Click the sync button below to connect your account to the extension.",
            icon: RefreshCw,
        }
    ];

    if (!user) return null;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-12">
            <header className="text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 transform hover:rotate-12 transition-transform">
                    <Chrome className="text-primary" size={32} />
                </div>
                <h1 className="text-5xl font-bold font-outfit tracking-tight">Extension Setup</h1>
                <p className="text-muted font-inter text-lg max-w-xl mx-auto">
                    Master your productivity by connecting the AERO Chrome Extension to your dashboard.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {steps.map((step, index) => (
                    <div key={index} className="glass-card p-8 flex flex-col items-center text-center space-y-6 hover:border-primary/30 transition-all duration-500 group">
                        <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                            <step.icon className="text-muted group-hover:text-primary transition-colors" size={24} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold font-outfit text-lg">Step {index + 1}: {step.title}</h3>
                            <p className="text-sm text-muted font-inter leading-relaxed">{step.description}</p>
                        </div>
                        {step.link && (
                            <a href={step.link} className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                                {step.linkText}
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                ))}
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-12 flex flex-col items-center space-y-8 text-center bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold font-outfit">Ready to Sync?</h2>
                        <p className="text-muted font-inter text-sm max-w-md">
                            Once you have installed the extension, click below to sync your secure access token.
                        </p>
                    </div>

                    <button
                        onClick={handleManualSync}
                        disabled={syncing}
                        className="relative group overflow-hidden px-12 py-5 rounded-3xl font-bold bg-primary text-background shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-500 active:scale-95 disabled:opacity-50"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            {syncing ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                            {syncing ? "Syncing Account..." : "Sync Extension Now"}
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    </button>

                    {syncStatus === "success" && (
                        <div className="flex items-center gap-2 text-green-500 font-bold font-outfit animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle2 size={20} />
                            Extension Synced Successfully!
                        </div>
                    )}

                    {syncStatus === "error" && (
                        <div className="flex flex-col items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-md animate-in fade-in zoom-in-95">
                            <div className="flex items-center gap-2 text-red-500 font-bold font-outfit">
                                <AlertCircle size={20} />
                                Sync Failed
                            </div>
                            <p className="text-[11px] text-muted font-inter">
                                Make sure the extension is installed and active in your browser. If you just installed it, try refreshing this page.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
