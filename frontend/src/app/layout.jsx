import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Providers } from "@/components/layout/Providers";
import { DashboardProvider } from "@/context/DashboardContext";

export const metadata = {
  title: "ProdLytics | AI Productivity Platform",
  description: "Advanced time tracking and productivity analytics",
};

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-outfit">
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
