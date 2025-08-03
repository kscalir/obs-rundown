import React from "react";

export default function PropertiesPanel(props) {
  // Display properties for the selected rundown item
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "1.5px dashed #b1c7e7",
        borderRadius: 10,
        color: "#7c7c7c",
        background: "#fafdff",
        fontSize: 17,
        fontWeight: 500,
        padding: 24,
        textAlign: "center",
        opacity: 0.88,
        boxSizing: "border-box",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      Properties panel (select a rundown item)
    </div>
  );
}