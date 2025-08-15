

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * PresenterNote
 * A simple long-text editor intended for presenter-only notes.
 *
 * UX rules (per spec):
 *  - No explicit Save button; persist on blur (or Cmd/Ctrl+Enter).
 *  - Show lightweight status (idle / saving / saved / error).
 *  - Accept initial data via props and keep in sync if external updates arrive.
 *
 * Props:
 *  - item: (optional) rundown item the note belongs to; used to reset on id changes
 *  - data: { text?: string } current saved value
 *  - onSave: async function(payload) -> should persist { text }
 */
export default function PresenterNote({ item, data, onSave }) {
  const initial = useMemo(() => (data?.text ?? ""), [data?.text]);
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState("idle"); // idle | dirty | saving | saved | error
  const [errorMsg, setErrorMsg] = useState("");
  const textareaRef = useRef(null);
  const latestSavedRef = useRef(initial);
  const isSavingRef = useRef(false);

  // Keep local state in sync when parent changes the value (e.g., selecting a different rundown item)
  useEffect(() => {
    setText(initial);
    latestSavedRef.current = initial;
    setStatus("idle");
    setErrorMsg("");
  }, [initial, item?.id]);

  const handleChange = (e) => {
    setText(e.target.value);
    // Mark dirty only if different from last saved to avoid flicker
    if (e.target.value !== latestSavedRef.current && status !== "dirty") {
      setStatus("dirty");
    }
  };

  const commitSave = async () => {
    if (!onSave) return; // graceful no-op
    const trimmed = text; // do not auto-trim; keep exact spacing user typed
    if (trimmed === latestSavedRef.current) return; // nothing to do
    if (isSavingRef.current) return; // avoid double-fire

    try {
      isSavingRef.current = true;
      setStatus("saving");
      setErrorMsg("");
      await onSave({ text: trimmed });
      latestSavedRef.current = trimmed;
      setStatus("saved");
      // fade back to idle after a short moment
      const t = setTimeout(() => setStatus("idle"), 1200);
      return () => clearTimeout(t);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.message || "Failed to save note");
    } finally {
      isSavingRef.current = false;
    }
  };

  const onBlur = async () => {
    if (status === "dirty") {
      await commitSave();
    }
  };

  const onKeyDown = (e) => {
    // Cmd/Ctrl+Enter to save
    const isCmdEnter = (e.key === "Enter") && (e.metaKey || e.ctrlKey);
    if (isCmdEnter) {
      e.preventDefault();
      // blur first so parent panels that listen to blur are consistent
      textareaRef.current?.blur();
      // commit (blur handler will also run, but commitSave guards duplicates)
      commitSave();
    }
  };

  return (
    <div className="presenter-note-editor" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label htmlFor="presenter-note-text" style={{ fontSize: 12, opacity: 0.9 }}>Presenter Note</label>
      <textarea
        id="presenter-note-text"
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder="Type notes for the presenter…"
        rows={8}
        style={{
          width: "100%",
          resize: "vertical",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--panel-border, #2f2f2f)",
          background: "var(--panel-bg, #121212)",
          color: "var(--panel-fg, #eaeaea)",
          lineHeight: 1.4,
          fontSize: 14,
          outline: "none",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, opacity: 0.8 }}>
        <span>
          {status === "saving" && "Saving…"}
          {status === "saved" && "Saved"}
          {status === "dirty" && "Unsaved changes"}
          {status === "error" && (
            <span style={{ color: "#ff6b6b" }}>Save failed{errorMsg ? `: ${errorMsg}` : ""}</span>
          )}
          {status === "idle" && " "}
        </span>
        <span>{text.length.toLocaleString()} chars</span>
      </div>

      {/* Helper hint */}
      <div style={{ fontSize: 11, opacity: 0.6 }}>
        Tip: blur the field to save, or press <kbd>Cmd/Ctrl</kbd>+<kbd>Enter</kbd>.
      </div>
    </div>
  );
}