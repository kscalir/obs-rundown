import React from "react";

export default function PresenterNoteEditor({ selectedItem, itemData, setRefreshKey }) {
  // Handle title change
  const handleTitleChange = async (newTitle) => {
    if (!selectedItem) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) throw new Error("Failed to update title");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error updating title:", err);
    }
  };

  return (
    <div style={{ padding: 15 }}>
      <h3 style={{ marginTop: 0, fontSize: 18, color: "#1976d2" }}>
        Presenter Note
      </h3>
      
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
          Title:
        </label>
        <input 
          type="text"
          value={itemData?.title || selectedItem?.title || ""} 
          onChange={(e) => handleTitleChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px"
          }}
          placeholder="Enter title for this presenter note"
        />
      </div>

      <p style={{ color: "#666", fontStyle: "italic" }}>
        Presenter note editor will be implemented here.
      </p>
    </div>
  );
}