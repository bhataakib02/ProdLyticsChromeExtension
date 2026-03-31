"use client";

import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { AnimatePresence, motion } from "framer-motion";
import OverviewView from "@/components/views/OverviewView";
import AnalyticsView from "@/components/views/AnalyticsView";
import GoalsView from "@/components/views/GoalsView";
import FocusView from "@/components/views/FocusView";
import TimerView from "@/components/views/TimerView";
import InsightsView from "@/components/views/InsightsView";
import SetupView from "@/components/views/SetupView";
import LoginView from "@/components/auth/LoginView";

function DashboardSPA() {
  const { activeTab, setActiveTab } = useDashboard();

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewView onTabChange={setActiveTab} />;
      case "analytics": return <AnalyticsView />;
      case "goals": return <GoalsView />;
      case "focus": return <FocusView />;
      case "timer": return <TimerView />;
      case "insights": return <InsightsView />;
      case "setup": return <SetupView />;
      default: return <OverviewView onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="relative min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <LoginView />;
  }

  return <DashboardSPA />;
}
