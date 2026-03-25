import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [siteTimes, setSiteTimes] = useState({})
  const [activeTab, setActiveTab] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const mRemaining = m % 60;
    return `${h}h ${mRemaining}m`;
  }

  const updateUI = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(["siteTimes", "activeTab", "startTime", "lastSaveTime", "isDarkMode", "preferences"], (data) => {
        let times = data.siteTimes || {};

        // Sync with dashboard preference if available
        if (data.preferences?.theme) {
          setIsDarkMode(data.preferences.theme === "dark");
        } else if (data.isDarkMode !== undefined) {
          setIsDarkMode(data.isDarkMode);
        }

        if (data.activeTab && data.startTime) {
          const start = data.lastSaveTime || data.startTime;
          const elapsed = (Date.now() - start) / 1000;
          times[data.activeTab] = (times[data.activeTab] || 0) + elapsed;
        }
        setSiteTimes(times);
        setActiveTab(data.activeTab);
      });
    }
  }

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    chrome.storage.local.set({ isDarkMode: newMode });
  }

  useEffect(() => {
    updateUI();
    const interval = setInterval(updateUI, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDashboard = () => {
    const dashboardUrl = "http://localhost:3000";
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: dashboardUrl });
      return;
    }
    window.open(dashboardUrl, "_blank", "noopener,noreferrer");
  }

  const handleClearData = () => {
    chrome.storage.local.set({ siteTimes: {} }, () => {
      chrome.runtime.sendMessage({ action: "resetTracking" });
      updateUI();
    });
  }

  const sortedSites = Object.entries(siteTimes).sort((a, b) => b[1] - a[1]);

  return (
    <div className={`container ${isDarkMode ? 'dark-mode' : ''}`}>
      <header className="tracker-header">
        <h2 className="title">ProdLytics Focus</h2>
        <div className="theme-toggle" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          <div className={`toggle-pill ${isDarkMode ? 'active' : ''}`}>
            <span className="pill-knob"></span>
          </div>
        </div>
      </header>

      <section className="site-list-container">
        <ul className="site-list">
          {sortedSites.length === 0 ? (
            <li style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No data yet.
            </li>
          ) : (
            sortedSites.map(([domain, seconds]) => (
              seconds >= 1 && (
                <li key={domain} className="site-item">
                  <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt={domain} />
                  <span className="site-domain">{domain}</span>
                  <span className="site-time">{formatTime(seconds)}</span>
                </li>
              )
            ))
          )}
        </ul>
      </section>

      <footer className="tracker-footer">
        <button onClick={handleDashboard} className="action-btn btn-red">View Dashboard</button>
        <button onClick={handleClearData} className="action-btn btn-green">Clear Data</button>
      </footer>
    </div>
  )
}

export default App
