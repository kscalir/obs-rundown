import React, { useState } from "react";
import ShowsHome from "./components/ShowsHome";
import MainPanel from "./components/MainPanel";

export default function App() {
  // Load selected show from localStorage on mount
  const [selectedShow, setSelectedShow] = useState(() => {
    const savedShow = localStorage.getItem("obsRundownShow");
    return savedShow ? JSON.parse(savedShow) : null;
  });

  // When a show is selected, save to localStorage for persistence
  const handleShowSelected = (show) => {
    setSelectedShow(show);
    if (show && show.id) {
      localStorage.setItem("obsRundownShow", JSON.stringify(show));
    }
  };

  // Back to show list handler
  const handleBackToShows = () => {
    setSelectedShow(null);
    localStorage.removeItem("obsRundownShow");
  };

  // If no show selected, show the home page
  if (!selectedShow) {
    return <ShowsHome onShowSelected={handleShowSelected} />;
  }

  // If show selected, render the main panel full-page with back button
  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px", background: "#f5f7fa", borderBottom: "1.5px solid #e1e6ec", display: "flex", alignItems: "center", gap: "32px" }}>
        <button
          onClick={handleBackToShows}
          style={{
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "999px",
            padding: "8px 22px",
            fontWeight: 600,
            fontSize: "1.08rem",
            cursor: "pointer",
            boxShadow: "0 1px 4px rgba(25, 118, 210, 0.10)",
            marginRight: 0
          }}
        >
          Back to Show List
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontWeight: 700, fontSize: "1.32rem", color: "#1976d2", letterSpacing: "-0.5px" }}>
            {selectedShow.name}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <MainPanel showId={selectedShow.id} />
      </div>
    </div>
  );
}
