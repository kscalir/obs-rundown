import React, { useState, useEffect, useMemo } from "react";
import ShowsHome from "./components/ShowsHome";
import MainPanel from "./components/MainPanel";
import { SelectionProvider, useSelection } from "./selection/SelectionContext.jsx";
import { createApi } from "./api/client";
import { useEpisodes } from "./hooks/useEpisodes";

// If you want localStorage fallback for first load:
const boot = {
  showId: (() => {
    const savedShow = localStorage.getItem("obsRundownShow");
    try {
      return savedShow ? JSON.parse(savedShow).id : null;
    } catch {
      return null;
    }
  })(),
};

function AppInner() {
  // Use centralized selection state
  const { showId, setShowId } = useSelection();
  
  // API instance
  const API_BASE_URL = window.API_BASE_URL || "http://localhost:5050";
  const api = useMemo(() => createApi(API_BASE_URL), []);
  
  // Load selected show and tab from localStorage on mount
  const [selectedShow, setSelectedShow] = useState(() => {
    const savedShow = localStorage.getItem("obsRundownShow");
    return savedShow ? JSON.parse(savedShow) : null;
  });
  
  const [selectedTab, setSelectedTab] = useState(() => {
    const savedTab = localStorage.getItem("obsRundownLastTab");
    return savedTab || "rundown";
  });
  
  // Episodes hook - using a shared instance key to ensure sync across components
  const { episodes, selectedEpisode } = useEpisodes(api, showId, "obsSelectedEpisode");
  
  // Sync selectedShow with centralized showId
  useEffect(() => {
    if (showId) {
      const savedShow = localStorage.getItem("obsRundownShow");
      if (savedShow) {
        try {
          const parsed = JSON.parse(savedShow);
          if (parsed.id === showId) {
            setSelectedShow(parsed);
            return;
          }
        } catch {}
      }
      // If we have showId but no matching localStorage, create minimal show object
      setSelectedShow({ id: showId, name: `Show ${showId}` });
    } else {
      setSelectedShow(null);
    }
  }, [showId]);

  // When a show is selected, restore last tab for that show
  const handleShowSelected = (show) => {
    if (show && show.id) {
      setShowId(Number(show.id)); // Update centralized state
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
    setShowId(null); // Update centralized state
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#666" }}>Show:</span>
          <span style={{ fontWeight: 700, fontSize: 20, color: "#1976d2", letterSpacing: 0.2 }}>{selectedShow.name}</span>
          {selectedEpisode && (
            <>
              <span style={{ fontWeight: 700, fontSize: 18, color: "#666", marginLeft: '16px' }}>Episode:</span>
              <span style={{ fontWeight: 700, fontSize: 20, color: "#1976d2", letterSpacing: 0.2 }}>{selectedEpisode.name}</span>
            </>
          )}
        </div>
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
            e.currentTarget.style.background = selectedTab === "rundown" ? '#d2e6fa' : '#e3f2fd';
            e.currentTarget.style.border = selectedTab === "rundown" ? '1.5px solid #1976d2' : '1px solid #b1c7e7';
          }}
        >
          Rundown
        </button>
        <button
          onClick={() => handleTabChange("control")}
          style={{
            background: selectedTab === "control" ? "#d2e6fa" : "#e3f2fd",
            color: selectedTab === "control" ? "#1976d2" : "#7c7c7c",
            border: selectedTab === "control" ? "1.5px solid #1976d2" : "1px solid #b1c7e7",
            borderBottom: selectedTab === "control" ? "3px solid #1976d2" : "none",
            borderRadius: 12,
            padding: "6px 22px",
            fontWeight: selectedTab === "control" ? 700 : 500,
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
            e.currentTarget.style.background = selectedTab === "control" ? '#d2e6fa' : '#e3f2fd';
            e.currentTarget.style.border = selectedTab === "control" ? '1.5px solid #1976d2' : '1px solid #b1c7e7';
          }}
        >
          Live Control
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

export default function App() {
  return (
    <SelectionProvider initial={boot}>
      <AppInner />
    </SelectionProvider>
  );
}
