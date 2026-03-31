"use client";

import { createContext, useContext, useState } from "react";

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [activitySearchQuery, setActivitySearchQuery] = useState("");

    return (
        <DashboardContext.Provider
            value={{ activeTab, setActiveTab, activitySearchQuery, setActivitySearchQuery }}
        >
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const ctx = useContext(DashboardContext);
    if (!ctx) {
        return {
            activeTab: "overview",
            setActiveTab: () => {},
            activitySearchQuery: "",
            setActivitySearchQuery: () => {},
        };
    }
    return ctx;
}
