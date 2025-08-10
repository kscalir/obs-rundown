import React, { useState, useEffect } from "react";
import MediaTab from "./MediaTab";
import RundownView from "./RundownView";
import ShowsHome from "./ShowsHome";
import { API_BASE_URL } from "../config";

// --- Constants ---
const LOCAL_STORAGE_TAB_STATE_KEY = "obsRundownTabState";

// --- Styles ---
const STYLES = {
  container: {
    minWidth: 0,
    height: "100%",
    display: "flex",
    flexDirection: "column"
  },
  tabBar: {
    display: "flex",
    borderBottom: "1.5px solid #e1e6ec",
    gap: 0,
    height: 56,
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 12,
    flexShrink: 0,
    background: "#f5f7fa"
  },
  tab: {
    base: {
      padding: "6px 0 8px 0",
      cursor: "pointer",
      fontSize: 18,
      transition: "color 0.2s"
    },
    active: {
      fontWeight: 700,
      color: "#1976d2",
      borderBottom: "3px solid #1976d2"
    },
    inactive: {
      fontWeight: 500,
      color: "#7c7c7c",
      borderBottom: "none"
    }
  },
  content: {
    flex: 1,
    minHeight: 0,
    minWidth: 0
  }
};

// --- Helper Functions ---
function getTabStateObject() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TAB_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTabStateObject(obj) {
  try {
    localStorage.setItem(LOCAL_STORAGE_TAB_STATE_KEY, JSON.stringify(obj));
  } catch {}
}

// --- Tab Component ---
function TabButton({ name, label, isActive, onClick }) {
  const style = {
    ...STYLES.tab.base,
    ...(isActive ? STYLES.tab.active : STYLES.tab.inactive),
    ...(name === "media" ? { marginRight: 32 } : {})
  };

  return (
    <span onClick={onClick} style={style}>
      {label}
    </span>
  );
}

// --- Main Component ---

export default function MainPanel({ showId, showName, onDragEnd, onBackToShows, selectedTab = "media" }) {
  if (!showId) {
    // If no showId, render nothing (parent controls show selection)
    return null;
  }

  return (
    <div style={STYLES.container}>
      <div style={STYLES.content}>
        {selectedTab === "media" ? (
          <MediaTab showId={showId} onBackToShows={onBackToShows} />
        ) : (
          <RundownView 
            showId={showId} 
            showName={showName}
            selectedTab={selectedTab} 
            onDragEnd={onDragEnd}
            onBackToShows={onBackToShows}
          />
        )}
      </div>
    </div>
  );
}