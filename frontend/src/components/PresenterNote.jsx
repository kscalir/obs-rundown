import React, { useState, useEffect, useMemo, useRef } from "react";
import { API_BASE_URL } from '../config';

export default function PresenterNoteEditor({ selectedItem, itemData, setRefreshKey }) {
  const resolveItemId = () => {
    return selectedItem?.id ?? selectedItem?.itemId ?? selectedItem?.found?.id ?? itemData?.id ?? null;
  };

  const coerceToObject = (maybeJson) => {
    if (!maybeJson) return {};
    if (typeof maybeJson === 'string') {
      try { return JSON.parse(maybeJson); } catch { return {}; }
    }
    if (typeof maybeJson === 'object') return maybeJson;
    return {};
  };

  const getExistingBlob = () => {
    const blob = itemData?.data_blob ?? selectedItem?.data_blob ?? selectedItem?.found?.data_blob ?? itemData?.data ?? selectedItem?.data ?? selectedItem?.found?.data ?? {};
    return coerceToObject(blob);
  };

  // Fetch the canonical latest item from the server and hydrate state/refs
  const fetchLatestAndHydrate = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/items/${id}`, { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      if (!json || typeof json !== 'object') return;

      const src = json.item && typeof json.item === 'object' ? json.item : json;
      const raw = Object.prototype.hasOwnProperty.call(src, 'data_blob') ? src.data_blob
                : Object.prototype.hasOwnProperty.call(src, 'data') ? src.data
                : {};
      const parsed = coerceToObject(raw);

      // update refs and local state with the true latest
      prevBlobSnapshotRef.current = parsed;
      lastSavedNoteRef.current = parsed.note || '';
      setNote(parsed.note || '');
    } catch (e) {
      console.warn('[PresenterNote] fetchLatestAndHydrate error', e);
    }
  };

  // refs for autosave and tracking previous item
  const lastSavedNoteRef = useRef("");
  const autosaveTimerRef = useRef(null);
  const prevItemIdRef = useRef(null);
  const prevBlobSnapshotRef = useRef({});
  const isSavingRef = useRef(false);

  const [note, setNote] = useState("");

  // Keep a stable snapshot of existing blob so we can merge safely
  const existingMemo = useMemo(() => getExistingBlob(), [itemData, selectedItem]);

  useEffect(() => {
    setNote(existingMemo.note || ''); // optimistic
    const id = resolveItemId();
    fetchLatestAndHydrate(id); // ensure we show the canonical saved value
  }, [existingMemo]);

  // keep a snapshot of existing blob and the item id for safe save-on-switch
  useEffect(() => {
    const currentId = resolveItemId();
    prevItemIdRef.current = currentId;
    prevBlobSnapshotRef.current = existingMemo;
    lastSavedNoteRef.current = existingMemo.note || "";
  }, [existingMemo]);

  // Core save function that can target a specific item id and blob snapshot
  const saveNoteFor = async (targetItemId, noteValue, blobSnapshot) => {
    if (!targetItemId) {
      console.warn("PresenterNote: missing item id; not saving.", { selectedItem, itemData });
      return false;
    }

    const existing = blobSnapshot || existingMemo;
    const nextMerged = { ...existing, note: noteValue || "" };

    // short-circuit if nothing changed against lastSaved
    if ((lastSavedNoteRef.current || "") === (noteValue || "")) return true;

    const itemUrl = `${API_BASE_URL}/api/items/${targetItemId}`;

    // 1) Fetch the current item to detect the canonical blob key and value type
    let current;
    try {
      const res = await fetch(itemUrl, { credentials: "include" });
      if (res.ok) current = await res.json().catch(() => null);
      else console.warn("[PresenterNote] GET item failed; status:", res.status);
    } catch (e) {
      console.warn("[PresenterNote] GET item errored:", e);
    }

    let blobKey = "data_blob";
    let originalBlobValue;
    if (current && typeof current === "object") {
      const source = current.item && typeof current.item === "object" ? current.item : current;
      if (Object.prototype.hasOwnProperty.call(source, "data_blob")) {
        blobKey = "data_blob";
        originalBlobValue = source.data_blob;
      } else if (Object.prototype.hasOwnProperty.call(source, "data")) {
        blobKey = "data";
        originalBlobValue = source.data;
      }
    }

    const sendAsString = typeof originalBlobValue === "string";
    const payloadValue = sendAsString ? JSON.stringify(nextMerged) : nextMerged;
    const body = JSON.stringify({ [blobKey]: payloadValue });

    // PATCH first
    try {
      const r = await fetch(itemUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body
      });
      if (r.ok) {
        lastSavedNoteRef.current = noteValue || '';
        // keep local snapshot in sync with what we just saved
        prevBlobSnapshotRef.current = nextMerged;
        if (typeof setRefreshKey === 'function') setRefreshKey(k => k + 1);
        // also rehydrate from server to avoid any stale props
        fetchLatestAndHydrate(targetItemId);
        return true;
      } else {
        const text = await r.text().catch(() => "");
        console.warn("[PresenterNote] PATCH failed; will try PUT. Status:", r.status, "Body:", text);
      }
    } catch (e) {
      console.warn("[PresenterNote] PATCH errored; will try PUT:", e);
    }

    // PUT fallback
    try {
      const r2 = await fetch(itemUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body
      });
      if (r2.ok) {
        lastSavedNoteRef.current = noteValue || '';
        prevBlobSnapshotRef.current = nextMerged;
        if (typeof setRefreshKey === 'function') setRefreshKey(k => k + 1);
        fetchLatestAndHydrate(targetItemId);
        return true;
      } else {
        const text = await r2.text().catch(() => "");
        console.error("[PresenterNote] PUT failed. Status:", r2.status, "Body:", text);
      }
    } catch (e) {
      console.error("[PresenterNote] PUT errored:", e);
    }

    return false;
  };

  const handleNoteBlur = async () => {
    const id = resolveItemId();
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try { await saveNoteFor(id, note, existingMemo); } finally { isSavingRef.current = false; }
  };

  // Auto-save (debounced) whenever user stops typing for 1s
  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    const id = resolveItemId();
    autosaveTimerRef.current = setTimeout(async () => {
      if ((lastSavedNoteRef.current || "") !== (note || "")) {
        await saveNoteFor(id, note, existingMemo);
      }
    }, 1000);
    return () => autosaveTimerRef.current && clearTimeout(autosaveTimerRef.current);
  }, [note]);

  // Save pending changes when switching to a different rundown item
  useEffect(() => {
    const currentId = resolveItemId();
    return () => { /* on unmount */ };
  }, []);

  // watch selected item id changes
  useEffect(() => {
    const currentId = resolveItemId();
    const prevId = prevItemIdRef.current;
    if (prevId && prevId !== currentId) {
      // flush save for previous item using its snapshot
      const prevBlob = prevBlobSnapshotRef.current || {};
      const pending = note; // note belonged to previous item view
      if ((lastSavedNoteRef.current || '') !== (pending || '')) {
        saveNoteFor(prevId, pending, prevBlob);
      }
    }
    // update refs to the new item and hydrate latest from server
    prevItemIdRef.current = currentId;
    prevBlobSnapshotRef.current = existingMemo;
    lastSavedNoteRef.current = existingMemo.note || '';
    fetchLatestAndHydrate(currentId);
  }, [selectedItem, itemData]);

  // Save on component unmount if there are pending changes
  useEffect(() => {
    return () => {
      const id = prevItemIdRef.current || resolveItemId();
      const pending = note;
      if ((lastSavedNoteRef.current || "") !== (pending || "")) {
        saveNoteFor(id, pending, prevBlobSnapshotRef.current || existingMemo);
      }
    };
  }, []);

  const verifyUpdated = () => true; // kept for backward compatibility; not used in new flow

  return (
    <div style={{
      background: '#f8fbff',
      border: '1px solid #e6eef6',
      borderRadius: 10,
      boxShadow: '0 6px 18px rgba(15, 30, 60, .06)',
      overflow: 'hidden',
      marginRight: 16
    }}>
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e1e6ec',
        padding: '16px 20px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          color: '#1976d2'
        }}>
          Presenter Note
        </h3>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#222', marginBottom: 8 }}>
            Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleNoteBlur}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                const id = resolveItemId();
                saveNoteFor(id, note, existingMemo);
              }
            }}
            rows={10}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d4deea',
              borderRadius: 8,
              background: '#fff',
              fontSize: 16,
              lineHeight: '1.5',
              fontFamily: 'inherit',
              color: '#111',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            placeholder="Enter presenter note…"
          />
          <div style={{ fontSize: 12, color: '#778196', marginTop: 6 }}>
            Saves on blur.
          </div>
        </div>
      </div>
    </div>
  );
}