import React, { useState } from "react";
import ShowsHome from "./components/ShowsHome";
import MainPanel from "./components/MainPanel";

export default function App() {
  // Load selected show and tab from localStorage on mount
  const [selectedShow, setSelectedShow] = useState(() => {
    const savedShow = localStorage.getItem("obsRundownShow");
    return savedShow ? JSON.parse(savedShow) : null;
  });
  const [selectedTab, setSelectedTab] = useState(() => {
    const savedTab = localStorage.getItem("obsRundownLastTab");
    return savedTab || "rundown";
  });

  // When a show is selected, restore last tab for that show
  const handleShowSelected = (show) => {
    setSelectedShow(show);
    if (show && show.id) {
      localStorage.setItem("obsRundownShow", JSON.stringify(show));
      // Try to restore last tab for this show
      const tabStateRaw = localStorage.getItem("obsRundownTabState");
      let tab = "rundown";
      if (tabStateRaw) {
        try {
          const tabState = JSON.parse(tabStateRaw);
          if (tabState && tabState[String(show.id)]) {
            tab = tabState[String(show.id)];
          }
        } catch {}
      }
      setSelectedTab(tab);
      localStorage.setItem("obsRundownLastTab", tab);
    }
  };

  // Back to show list handler
  const handleBackToShows = () => {
    setSelectedShow(null);
    localStorage.removeItem("obsRundownShow");
  };

  // Track tab changes from MainPanel
  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    localStorage.setItem("obsRundownLastTab", tab);
    if (selectedShow && selectedShow.id) {
      // Update per-show tab state
      const tabStateRaw = localStorage.getItem("obsRundownTabState");
      let tabState = {};
      if (tabStateRaw) {
        try {
          tabState = JSON.parse(tabStateRaw);
        } catch {}
      }
      tabState[String(selectedShow.id)] = tab;
      localStorage.setItem("obsRundownTabState", JSON.stringify(tabState));
    }
  };

  // If no show selected, show the home page (no header)
  if (!selectedShow) {
    return <ShowsHome onShowSelected={handleShowSelected} />;
  }

  // Debug: log selectedTab to verify state changes
  console.log('Current selectedTab:', selectedTab);

  // If show selected, render the main panel full-page with header and tab bar at the top
  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "#fafdff" }}>
      {/* Header with back button and show name */}
      <div style={{
        position: "relative",
        zIndex: 100,
        background: "#fafdff",
        borderBottom: "1.5px solid #e1e6ec",
        display: "flex",
        alignItems: "center",
        padding: "0 0 0 16px",
        height: 48,
        boxSizing: "border-box"
      }}>
        <button
          onClick={handleBackToShows}
          style={{
            background: "#e3f2fd",
            color: "#1976d2",
            border: "1px solid #b1c7e7",
            borderRadius: 12,
            padding: "6px 22px",
            fontWeight: 500,
            fontSize: 15,
            marginRight: 18,
            marginTop: 2,
            cursor: "pointer",
            boxShadow: "none",
            transition: "background 0.15s, border 0.15s"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#d2e6fa';
            e.currentTarget.style.border = '1.5px solid #1976d2';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#e3f2fd';
            e.currentTarget.style.border = '1px solid #b1c7e7';
          }}
        >
          ← Back to Shows
        </button>
        <span style={{ fontWeight: 700, fontSize: 20, color: "#1976d2", letterSpacing: 0.2 }}>{selectedShow.name}</span>
      </div>
      {/* Tab Bar at the top of the page */}
      <div style={{
        display: "flex",
        borderBottom: "1.5px solid #e1e6ec",
        gap: 0,
        height: 56,
        alignItems: "center",
        paddingLeft: 18,
        paddingRight: 12,
        flexShrink: 0,
        background: "#e3f2fd"
      }}>
        <button
          onClick={() => handleTabChange("media")}
          style={{
            background: selectedTab === "media" ? "#d2e6fa" : "#e3f2fd",
            color: selectedTab === "media" ? "#1976d2" : "#7c7c7c",
            border: selectedTab === "media" ? "1.5px solid #1976d2" : "1px solid #b1c7e7",
            borderBottom: selectedTab === "media" ? "3px solid #1976d2" : "none",
            borderRadius: 12,
            padding: "6px 22px",
            fontWeight: selectedTab === "media" ? 700 : 500,
            fontSize: 16,
            marginRight: 18,
            marginLeft: 0,
            marginTop: 0,
            marginBottom: 0,
            cursor: "pointer",
            boxShadow: "none",
            transition: "background 0.15s, border 0.15s"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#d2e6fa';
            e.currentTarget.style.border = '1.5px solid #1976d2';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = selectedTab === "media" ? '#d2e6fa' : '#e3f2fd';
            e.currentTarget.style.border = selectedTab === "media" ? '1.5px solid #1976d2' : '1px solid #b1c7e7';
          }}
        >
          Media Ingest
        </button>
        <button
          onClick={() => handleTabChange("rundown")}
          style={{
            background: selectedTab === "rundown" ? "#d2e6fa" : "#e3f2fd",
            color: selectedTab === "rundown" ? "#1976d2" : "#7c7c7c",
            border: selectedTab === "rundown" ? "1.5px solid #1976d2" : "1px solid #b1c7e7",
            borderBottom: selectedTab === "rundown" ? "3px solid #1976d2" : "none",
            borderRadius: 12,
            padding: "6px 22px",
            fontWeight: selectedTab === "rundown" ? 700 : 500,
            fontSize: 16,
            marginRight: 0,
            marginLeft: 0,
            marginTop: 0,
            marginBottom: 0,
            cursor: "pointer",
            boxShadow: "none",
            transition: "background 0.15s, border 0.15s"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#d2e6fa';
            e.currentTarget.style.border = '1.5px solid #1976d2';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = selectedTab === "rundown" ? '#d2e6fa' : '#e3f2fd';
            e.currentTarget.style.border = selectedTab === "rundown" ? '1.5px solid #1976d2' : '1px solid #b1c7e7';
          }}
        >
          Rundown
        </button>
      </div>
      {/* MainPanel only renders the content for the selected tab */}
      <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <MainPanel 
          showId={selectedShow.id} 
          showName={selectedShow.name}
          onBackToShows={handleBackToShows}
          selectedTab={selectedTab}
        />
      </div>
    </div>
  );
}
