"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";

const ThemeContext = createContext(null);

export function Providers({ children }) {
    const [theme, setTheme] = useState(() => {
        if (typeof window === "undefined") return "dark";
        return localStorage.getItem("theme") || "dark";
    });
    const hydratedRef = useRef(false);

    useEffect(() => {
        hydratedRef.current = true;
    }, []);

    useEffect(() => {
        if (!hydratedRef.current) return;
        localStorage.setItem("theme", theme);
        // Toggle 'light' class because 'dark' is the default root style in globals.css
        document.documentElement.classList.toggle("light", theme === "light");
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === "dark" ? "light" : "dark");
    };

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
        return { theme: "dark", setTheme: () => { }, toggleTheme: () => { } };
    }
    return context;
};

