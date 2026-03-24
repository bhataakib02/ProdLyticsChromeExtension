import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [siteTimes, setSiteTimes] = useState({})
  const [activeTab, setActiveTab] = useState(null)

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
      chrome.storage.local.get(["siteTimes", "activeTab", "startTime", "lastSaveTime"], (data) => {
        let times = data.siteTimes || {};

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

  useEffect(() => {
    updateUI();
    const interval = setInterval(updateUI, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDashboard = () => {
    chrome.tabs.create({ url: "http://localhost:3000" });
  }

  const handleClearData = () => {
    chrome.storage.local.set({ siteTimes: {} }, () => {
      chrome.runtime.sendMessage({ action: "resetTracking" });
      updateUI();
    });
  }

  const sortedSites = Object.entries(siteTimes).sort((a, b) => b[1] - a[1]);

  return (
    <div className="container">
      <header className="tracker-header">
        <h2 className="title">Time Tracker</h2>
        <div className="theme-toggle">
          <span>Dark Mode</span>
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
