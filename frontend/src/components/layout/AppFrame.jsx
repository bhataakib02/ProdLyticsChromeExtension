"use client";

import { useAuth } from "@/context/AuthContext";
import { DashboardProvider } from "@/context/DashboardContext";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import DeepWorkTimerStrip from "@/components/layout/DeepWorkTimerStrip";

export default function AppFrame({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user) {
        return <div className="min-h-screen bg-background">{children}</div>;
    }

    return (
        <DashboardProvider>
            <div className="flex min-h-screen bg-background text-foreground transition-colors duration-500">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <Navbar />
                    <DeepWorkTimerStrip />
                    <main className="flex-1 overflow-auto bg-foreground/[0.02]">{children}</main>
                </div>
            </div>
        </DashboardProvider>
    );
}
