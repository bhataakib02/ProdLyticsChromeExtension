import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";
import { Providers } from "@/components/layout/Providers";
import AppFrame from "@/components/layout/AppFrame";
import { PwaRegister } from "@/components/pwa/PwaRegister";

export const metadata = {
  title: "ProdLytics | AI Productivity Platform",
  description: "Advanced time tracking and productivity analytics",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/pwa-512.png",
    apple: "/icons/pwa-512.png",
  },
  appleWebApp: {
    capable: true,
    title: "ProdLytics",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#6d28d9",
};

const themeInitScript = `(function(){try{var k='theme',t=localStorage.getItem(k);if(t==='light')document.documentElement.classList.add('light');else document.documentElement.classList.remove('light');}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-outfit">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Providers>
          <PwaRegister />
          <AuthProvider>
            <AppFrame>{children}</AppFrame>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
