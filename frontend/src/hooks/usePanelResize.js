// =============================================
// /src/hooks/usePanelResize.js
// Handles left/right resizable panels
// =============================================
import { useEffect, useRef, useState } from "react";
export function usePanelResize(initialLeft = 220, initialRight = 300) {
  const [leftW, setLeftW] = useState(initialLeft);
  const [rightW, setRightW] = useState(initialRight);
  const dragging = useRef(null); // 'left' | 'right' | null
  const startX = useRef(0);
  const start = useRef({ left: initialLeft, right: initialRight });

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      if (dragging.current === "left") setLeftW(Math.max(120, Math.min(400, start.current.left + dx)));
      if (dragging.current === "right") setRightW(Math.max(120, start.current.right - dx));
      document.body.style.cursor = "ew-resize";
    };
    const onUp = () => { dragging.current = null; document.body.style.cursor = ""; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
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
