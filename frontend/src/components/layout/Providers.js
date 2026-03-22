"use client";

import { useState, useEffect, createContext, useContext } from "react";

const ThemeContext = createContext(null);

export function Providers({ children }) {
    const [theme, setTheme] = useState("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "dark";
        setTheme(savedTheme);
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("theme", theme);
        // Toggle 'light' class because 'dark' is the default root style in globals.css
        document.documentElement.classList.toggle("light", theme === "light");
    }, [theme, mounted]);

    const toggleTheme = () => {
        setTheme(prev => prev === "dark" ? "light" : "dark");
    };

    if (!mounted) {
        return <div style={{ visibility: "hidden" }}>{children}</div>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        // Fallback to avoid crash in Sidebar if it's rendered outside or during weird HMR
        return { theme: "dark", setTheme: () => {}, toggleTheme: () => {} };
    }
    return context;
};

