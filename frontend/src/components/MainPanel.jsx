import React from "react";
import MediaTab from "./MediaTab";
import RundownView from "./RundownView";
import ShowsHome from "./ShowsHome";
import ControlPageRefactored from "./control/ControlPageRefactored";
import GraphicsTab from "./GraphicsTab";

// --- Styles ---
const STYLES = {
  container: {
    minWidth: 0,
    height: "100%",
    display: "flex",
    flexDirection: "column"
  },
  content: {
    flex: 1,
    minHeight: 0,
    minWidth: 0
  }
};

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
        ) : selectedTab === "graphics" ? (
          <GraphicsTab showId={showId} />
        ) : selectedTab === "control" ? (
          <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
            <ControlPageRefactored />
          </div>
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