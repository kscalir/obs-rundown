import React, { useState, useEffect, useMemo } from "react";
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

  const [note, setNote] = useState("");

  // Keep a stable snapshot of existing blob so we can merge safely
  const existingMemo = useMemo(() => getExistingBlob(), [itemData, selectedItem]);

  useEffect(() => {
    setNote(existingMemo.note || "");
  }, [existingMemo]);

  const verifyUpdated = (updated) => {
    const updatedBlob = coerceToObject(updated?.data_blob) ;
    const updatedData = coerceToObject(updated?.data);
    return (updatedBlob && updatedBlob.note === note) || (updatedData && updatedData.note === note);
  };

  // Save on blur with multi-strategy PATCH to accommodate backend expectations
  const handleNoteBlur = async () => {
    const itemId = resolveItemId();
    if (!itemId) {
      console.warn("PresenterNote: missing item id; not saving.", { selectedItem, itemData });
      return;
    }

    const merged = { ...existingMemo, note: note || "" };

    const payloadCandidates = [
      // 1) Preferred: json column named data_blob
      { data_blob: merged },
      // 2) data_blob as string (TEXT column case)
      { data_blob: JSON.stringify(merged) },
      // 3) fallback to `data` json column name
      { data: merged },
      // 4) `data` as string
      { data: JSON.stringify(merged) },
      // 5) send both keys as objects
      { data_blob: merged, data: merged },
      // 6) send both as strings
      { data_blob: JSON.stringify(merged), data: JSON.stringify(merged) },
    ];

    for (let i = 0; i < payloadCandidates.length; i++) {
      const payload = payloadCandidates[i];
      try {
        const res = await fetch(`${API_BASE_URL}/api/rundown_items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn(`[PresenterNote] PATCH variant ${i+1} failed`, text);
          continue;
        }

        let updated;
        try { updated = await res.json(); } catch { updated = null; }

        if (!updated) {
          // If API doesn't return body, consider it success and force a refresh
          if (typeof setRefreshKey === "function") setRefreshKey((k) => k + 1);
          return;
        }

        if (verifyUpdated(updated)) {
          if (typeof setRefreshKey === "function") setRefreshKey((k) => k + 1);
          return;
        }
        // Try next strategy
      } catch (err) {
        console.error(`[PresenterNote] Error on PATCH variant ${i+1}:`, err);
      }
    }

    console.error("PresenterNote: all PATCH strategies tried; note may not have been saved.");
  };

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