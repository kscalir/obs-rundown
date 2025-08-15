import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import ObsSceneEditor from "./properties/ObsSceneEditor";
import FullScreenGraphic from "./FullScreenGraphic";
import FullScreenVideo from "./FullScreenVideo";
import FullScreenYouTube from "./FullScreenYouTube";
import FullScreenPdfImage from "./FullScreenPdfImage";
import PresenterNote from "./PresenterNote";
import AudioControllerItem from "./AudioControllerItem";

export default function PropertiesPanel({
  segments,
  itemId,
}) {
  const [selectedItem, setSelectedItem] = useState(null);

  // Find selected item from segments by id
  useEffect(() => {
    if (itemId == null) {
      setSelectedItem(null);
      return;
    }
    if (!segments || segments.length === 0) {
      setSelectedItem(null);
      return;
    }
    let found = null;
    for (const segment of segments) {
      if (found) break;
      for (const group of (segment.groups || [])) {
        if (found) break;
        const match = (group.items || []).find(i => String(i.id) === String(itemId));
        if (match) {
          found = match;
          break;
        }
      }
    }
    setSelectedItem(found || null);
  }, [itemId, segments]);

  const rawType = selectedItem?.type ?? selectedItem?.data?.type ?? selectedItem?.item_type;

  // Normalize various casing/word-separator variants into a single token
  function normalizeType(val) {
    if (!val) return "";
    return String(val).toLowerCase().replace(/[\s_-]+/g, "");
  }

  const t = normalizeType(rawType);
  const cmd = selectedItem?.command || selectedItem?.data?.command;


  const hasSceneData =
    !!(selectedItem?.data?.scene ||
       selectedItem?.data?.parameters?.sceneName ||
       selectedItem?.scene);

  const isObsScene =
    t === "obsscene" ||
    t === "obscommand" ||
    (t === "obscommand" && (cmd === "SetCurrentProgramScene" || hasSceneData)) ||
    cmd === "SetCurrentProgramScene" ||
    hasSceneData;

  // Check for FullScreen component types (normalized)
  const isFullScreenGraphic = t === "fullscreengraphic";
  const isFullScreenVideo = t === "fullscreenvideo";
  const isFullScreenYouTube = t === "fullscreenyoutube";
  const isFullScreenPdfImage = t === "fullscreenpdfimage";
  const isPresenterNote = t === "presenternote";
  const isAudioCue = t === "audiocue";


  // Merge a partial item patch into the currently selected item
  function applyLocalPatch(prevItem, patch) {
    if (!prevItem || !patch) return prevItem;
    const next = { ...prevItem, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, "data")) {
      if (patch.data && typeof patch.data === "object" && !Array.isArray(patch.data)) {
        next.data = { ...(prevItem?.data || {}), ...(patch.data || {}) };
      } else {
        next.data = patch.data; // allow explicit replacement
      }
    }
    return next;
  }

  return (
    <div style={{ flex: 1, background: "#f8fafd", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "15px", borderBottom: "1px solid #e1e6ec", flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Properties</h2>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {(!itemId || !selectedItem) ? (
          <div style={{
            width: "100%",
            height: "100%",
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
          }}>
            Properties panel (select a rundown item)
          </div>
        ) : (
          <>
            {isObsScene ? (
              <div style={{ padding: 12 }}>
                <ObsSceneEditor
                  key={`obs-${String(selectedItem.id)}-${t}`}
                  item={selectedItem}
                  itemId={selectedItem.id}
                  onPatch={async (partial) => {
                    // 1) Persist to backend
                    const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(partial),
                    });
                    if (!res.ok) {
                      const t = await res.text().catch(() => "");
                      throw new Error(t || `Failed to save item ${selectedItem.id}`);
                    }

                    // 2) Optimistically merge into local PropertiesPanel state
                    setSelectedItem((prev) => applyLocalPatch(prev, partial));

                    // 3) Notify the app so the parent can sync its segments state (no prop changes required)
                    try {
                      window.dispatchEvent(
                        new CustomEvent("rundown:item-patched", {
                          detail: { itemId: selectedItem.id, patch: partial },
                        })
                      );
                    } catch (_) {
                      // no-op if CustomEvent is unavailable
                    }
                  }}
                />
              </div>
            ) : isFullScreenGraphic ? (
              <FullScreenGraphic
                key={`graphic-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  const partial = { data };
                  const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(partial),
                  });
                  if (!res.ok) {
                    const t = await res.text().catch(() => "");
                    throw new Error(t || `Failed to save item ${selectedItem.id}`);
                  }
                  setSelectedItem((prev) => applyLocalPatch(prev, partial));
                  try {
                    window.dispatchEvent(
                      new CustomEvent("rundown:item-patched", {
                        detail: { itemId: selectedItem.id, patch: partial },
                      })
                    );
                  } catch (_) {}
                }}
              />
            ) : isFullScreenVideo ? (
              <FullScreenVideo
                key={`video-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  const partial = { data };
                  const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(partial),
                  });
                  if (!res.ok) {
                    const t = await res.text().catch(() => "");
                    throw new Error(t || `Failed to save item ${selectedItem.id}`);
                  }
                  setSelectedItem((prev) => applyLocalPatch(prev, partial));
                  try {
                    window.dispatchEvent(
                      new CustomEvent("rundown:item-patched", {
                        detail: { itemId: selectedItem.id, patch: partial },
                      })
                    );
                  } catch (_) {}
                }}
              />
            ) : isFullScreenYouTube ? (
              <FullScreenYouTube
                key={`youtube-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  const partial = { data };
                  const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(partial),
                  });
                  if (!res.ok) {
                    const t = await res.text().catch(() => "");
                    throw new Error(t || `Failed to save item ${selectedItem.id}`);
                  }
                  setSelectedItem((prev) => applyLocalPatch(prev, partial));
                  try {
                    window.dispatchEvent(
                      new CustomEvent("rundown:item-patched", {
                        detail: { itemId: selectedItem.id, patch: partial },
                      })
                    );
                  } catch (_) {}
                }}
              />
            ) : isFullScreenPdfImage ? (
              <FullScreenPdfImage
                key={`pdfimage-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  const partial = { data };
                  const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(partial),
                  });
                  if (!res.ok) {
                    const t = await res.text().catch(() => "");
                    throw new Error(t || `Failed to save item ${selectedItem.id}`);
                  }
                  setSelectedItem((prev) => applyLocalPatch(prev, partial));
                  try {
                    window.dispatchEvent(
                      new CustomEvent("rundown:item-patched", {
                        detail: { itemId: selectedItem.id, patch: partial },
                      })
                    );
                  } catch (_) {}
                }}
              />
            ) : isPresenterNote ? (
              <PresenterNote
                key={`presenter-${String(selectedItem.id)}-${t}`}
                selectedItem={selectedItem}
                itemData={selectedItem?.data}
                onSave={async (data) => {
                  const partial = { data };
                  const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(partial),
                  });
                  if (!res.ok) {
                    const t = await res.text().catch(() => "");
                    throw new Error(t || `Failed to save item ${selectedItem.id}`);
                  }
                  setSelectedItem((prev) => applyLocalPatch(prev, partial));
                  try {
                    window.dispatchEvent(new CustomEvent("rundown:item-patched", { detail: { itemId: selectedItem.id, patch: partial } }));
                  } catch (_) {}
                }}
              />
            ) : isAudioCue ? (
              <AudioControllerItem
                key={`audiocue-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  const partial = { data };
                  const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(partial),
                  });
                  if (!res.ok) {
                    const t = await res.text().catch(() => "");
                    throw new Error(t || `Failed to save item ${selectedItem.id}`);
                  }
                  setSelectedItem((prev) => applyLocalPatch(prev, partial));
                  try {
                    window.dispatchEvent(new CustomEvent("rundown:item-patched", { detail: { itemId: selectedItem.id, patch: partial } }));
                  } catch (_) {}
                }}
              />
            ) : (
              <div style={{ padding: 12, color: "#666" }}>
                This item type isn't supported in the new properties panel yet.
                <div style={{ marginTop: 6, fontSize: 12, color: "#999" }}>
                  Item type: <code>{String(rawType || "(unknown)")}</code>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}