import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import ObsSceneEditor from "./properties/ObsSceneEditor";

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
    console.debug("PropertiesPanel: resolve selectedItem", { itemId, found, segmentsCount: (segments||[]).length });
    setSelectedItem(found || null);
  }, [itemId, segments]);

  // Empty state
  if (itemId == null || !selectedItem) {
    return (
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
    );
  }

  // Be tolerant of historical types:
  // - "obs_scene" (new)
  // - "obsscene" (early UI)
  // - "obscommand" with SetCurrentProgramScene (toolbox drop)
  const rawType = selectedItem?.type ?? selectedItem?.data?.type ?? selectedItem?.item_type;
  const t = String(rawType || "").toLowerCase();
const cmd = selectedItem?.command || selectedItem?.data?.command;
const hasSceneData =
  !!(selectedItem?.data?.scene ||
     selectedItem?.data?.parameters?.sceneName ||
     selectedItem?.scene);

const isObsScene =
  t === "obs_scene" ||
  t === "obscommand" ||
  (t === "obscommand" && (cmd === "SetCurrentProgramScene" || hasSceneData)) ||
  cmd === "SetCurrentProgramScene" ||
  hasSceneData;

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#f8fafd", height: "100%" }}>
      <div style={{ padding: "15px", borderBottom: "1px solid #e1e6ec" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Properties</h2>
      </div>

      <div style={{ height: "calc(100% - 50px)", overflow: "auto", padding: 12 }}>
        {isObsScene ? (
          <ObsSceneEditor
            key={`obs-${String(selectedItem.id)}`}
            item={selectedItem}
            itemId={selectedItem.id}
            itemData={selectedItem?.data}
            onPatch={async (partial) => {
              const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(partial),
              });
              if (!res.ok) {
                const t = await res.text().catch(() => "");
                throw new Error(t || `Failed to save item ${selectedItem.id}`);
              }
            }}
          />
        ) : (
          <div style={{ padding: 12, color: "#666" }}>
            This item type isn’t supported in the new properties panel yet.
            <div style={{ marginTop: 6, fontSize: 12, color: "#999" }}>
              Item type: <code>{String(rawType || "(unknown)")}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}