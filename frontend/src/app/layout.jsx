import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";
import { Providers } from "@/components/layout/Providers";
import { DashboardProvider } from "@/context/DashboardContext";

export const metadata = {
  title: "ProdLytics | AI Productivity Platform",
  description: "Advanced time tracking and productivity analytics",
};

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

const themeInitScript = `(function(){try{var k='theme',t=localStorage.getItem(k);if(t==='light')document.documentElement.classList.add('light');else document.documentElement.classList.remove('light');}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-outfit">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Providers>
          <AuthProvider>
            <DashboardProvider>
              <div className="flex bg-background min-h-screen text-foreground transition-colors duration-500">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                  <Navbar />
                  <main className="flex-1 overflow-auto bg-foreground/[0.02]">
                    {children}
                  </main>
                </div>
              </div>
            </DashboardProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
