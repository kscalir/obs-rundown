// =============================================
// /src/hooks/usePanelResize.js
// Handles left/right resizable panels
// =============================================
import { useEffect, useRef, useState } from "react";

// Helper to get panel widths from localStorage
function getStoredPanelWidths(initialLeft, initialRight) {
  try {
    const stored = localStorage.getItem("panelWidths");
    if (stored) {
      const obj = JSON.parse(stored);
      if (
        typeof obj === "object" &&
        obj !== null &&
        typeof obj.left === "number" &&
        typeof obj.right === "number"
      ) {
        return { left: obj.left, right: obj.right };
      }
    }
  } catch (e) {}
  return { left: initialLeft, right: initialRight };
}

export function usePanelResize(initialLeft = 220, initialRight = 300) {
  // On mount, read from localStorage
  const [leftW, setLeftW] = useState(() => getStoredPanelWidths(initialLeft, initialRight).left);
  const [rightW, setRightW] = useState(() => getStoredPanelWidths(initialLeft, initialRight).right);
  const dragging = useRef(null); // 'left' | 'right' | null
  const startX = useRef(0);
  const start = useRef({ left: leftW, right: rightW });

  // Persist widths to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("panelWidths", JSON.stringify({ left: leftW, right: rightW }));
    } catch (e) {}
  }, [leftW, rightW]);

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      if (dragging.current === "left") setLeftW(Math.max(120, Math.min(400, start.current.left + dx)));
      if (dragging.current === "right") setRightW(Math.max(120, start.current.right - dx));
      document.body.style.cursor = "ew-resize";
    };
    const onUp = () => {
      dragging.current = null;
      document.body.style.cursor = "";
      // After drag stops, persist widths (handled by effect above)
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDrag(which, e) {
    dragging.current = which;
    startX.current = e.clientX;
    start.current = { left: leftW, right: rightW };
    document.body.style.cursor = "ew-resize";
    e.preventDefault();
  }

  return { leftW, rightW, setLeftW, setRightW, startDrag };
}
