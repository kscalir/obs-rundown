import React from "react";
import PropertiesPanel from "./PropertiesPanel";
import ModulesPanel from "./ModulesPanel";

export default function RightPanel(props) {
  return (
    <div
      style={{
        minWidth: 0,
        background: "#f8fafd",
        borderLeft: "1.5px solid #e1e6ec",
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 8px 0 #e4e8ed22",
        zIndex: 1,
      }}
    >
      <div style={{ flex: 1, borderBottom: "1.5px solid #e1e6ec", background: "#fff" }}>
        <PropertiesPanel {...props} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "#f8fafd" }}>
        <ModulesPanel {...props} />
      </div>
    </div>
  );
}