// =============================================
// /src/components/Buttons.js
// Small presentational buttons (no logic)
// =============================================
import React from "react";
export function AddButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        background: "#e3f2fd",
        border: "1px solid #b1c7e7",
        color: "#1976d2",
        borderRadius: 12,
        padding: "4px 10px",
        fontSize: 14,
        fontWeight: 600,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...props.style,
      }}
    >{children}</button>
  );
}

export function IconButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        background: "none",
        border: "none",
        color: "rgba(255,87,34,0.65)",
        cursor: "pointer",
        borderRadius: 8,
        padding: 4,
        ...props.style,
      }}
    >{children}</button>
  );
}
