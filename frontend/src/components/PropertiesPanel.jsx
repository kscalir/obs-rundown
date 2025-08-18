import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import ObsSceneEditor from "./properties/ObsSceneEditor";
import FullScreenGraphic from "./FullScreenGraphic";
import FullScreenVideo from "./FullScreenVideo";
import FullScreenYouTube from "./FullScreenYouTube";
import FullScreenPdfImage from "./FullScreenPdfImage";
import PresenterNote from "./PresenterNote";
import AudioCue from "./AudioCue";
import ManualBlock from "./ManualBlock";
import Overlay from "./Overlay";

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
        // Search in regular items
        const match = (group.items || []).find(i => String(i.id) === String(itemId));
        if (match) {
          found = match;
          break;
        }
        
        // Search in Manual Block nested items
        for (const item of (group.items || [])) {
          if (found) break;
          if (item.type === "ManualBlock" || item.type === "manualblock" || item.type === "manual-block") {
            const nestedItems = item.data?.items || [];
            const nestedMatch = nestedItems.find(nested => String(nested.id) === String(itemId));
            if (nestedMatch) {
              found = nestedMatch;
              break;
            }
          }
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
  const isAudioCue = t === "audiocue" || t === "audio";
  const isManualBlock = t === "manualblock";
  const isOverlay = t === "overlay";


  // Check if the selected item is nested inside a Manual Block
  function findParentManualBlock(itemId) {
    if (!itemId || !segments) return null;
    
    for (const segment of segments) {
      for (const group of (segment.groups || [])) {
        for (const item of (group.items || [])) {
          if (item.type === "ManualBlock" || item.type === "manualblock" || item.type === "manual-block") {
            const nestedItems = item.data?.items || [];
            const nestedIndex = nestedItems.findIndex(nested => String(nested.id) === String(itemId));
            if (nestedIndex >= 0) {
              return { parentItem: item, nestedIndex };
            }
          }
        }
      }
    }
    return null;
  }

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
  
  // Save handler that works for both regular items and nested items
  async function saveItemData(partial) {
    if (!selectedItem) return;
    
    // Force audio cues to always be auto with 0 duration
    if (isAudioCue) {
      partial = {
        ...partial,
        automation_mode: 'auto',
        automation_duration: 0
      };
    }
    
    const parentManualBlock = findParentManualBlock(selectedItem.id);
    
    if (parentManualBlock) {
      // This is a nested item - update the parent Manual Block
      const { parentItem, nestedIndex } = parentManualBlock;
      const updatedNestedItems = [...(parentItem.data?.items || [])];
      updatedNestedItems[nestedIndex] = applyLocalPatch(updatedNestedItems[nestedIndex], partial);
      
      const parentPatch = {
        data: {
          ...parentItem.data,
          items: updatedNestedItems
        }
      };
      
      const res = await fetch(`${API_BASE_URL}/api/items/${parentItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentPatch),
      });
      
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Failed to save nested item in Manual Block ${parentItem.id}`);
      }
      
      // Update local state
      setSelectedItem((prev) => applyLocalPatch(prev, partial));
      
      // Notify the app so the parent can sync its segments state
      try {
        window.dispatchEvent(
          new CustomEvent("rundown:item-patched", {
            detail: { itemId: parentItem.id, patch: parentPatch },
          })
        );
      } catch (_) {}
    } else {
      // This is a regular item - save directly
      const res = await fetch(`${API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Failed to save item ${selectedItem.id}`);
      }

      // Update local state
      setSelectedItem((prev) => applyLocalPatch(prev, partial));

      // Notify the app so the parent can sync its segments state
      try {
        window.dispatchEvent(
          new CustomEvent("rundown:item-patched", {
            detail: { itemId: selectedItem.id, patch: partial },
          })
        );
      } catch (_) {}
    }
  }

  // Automation controls component
  const AutomationControls = ({ item, onSave }) => {
    const [automationMode, setAutomationMode] = useState(item?.automation_mode || 'manual');
    const [automationDuration, setAutomationDuration] = useState(item?.automation_duration || 10);
    const [useMediaDuration, setUseMediaDuration] = useState(item?.use_media_duration || false);
    
    // Check if this item type can have media duration
    const canUseMediaDuration = ['fullscreenvideo', 'fullscreenyoutube'].includes(normalizeType(item?.type));
    
    const handleAutomationChange = async (updates) => {
      try {
        await onSave(updates);
      } catch (err) {
        console.error('Failed to save automation settings:', err);
      }
    };
    
    return (
      <div style={{
        background: '#fff',
        border: '1px solid #e1e6ec',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#333' }}>
          Automation Settings
        </h3>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#666' }}>
            Mode
          </label>
          <select
            value={automationMode}
            onChange={(e) => {
              const newMode = e.target.value;
              setAutomationMode(newMode);
              handleAutomationChange({ automation_mode: newMode });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d4deea',
              borderRadius: 6,
              fontSize: 14,
              background: '#fff'
            }}
          >
            <option value="manual">Manual - Wait for NEXT</option>
            <option value="auto">Auto - Advance after duration</option>
          </select>
        </div>
        
        {automationMode === 'auto' && (
          <>
            {canUseMediaDuration && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={useMediaDuration}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseMediaDuration(checked);
                      handleAutomationChange({ use_media_duration: checked });
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#666' }}>
                    Use media duration
                  </span>
                </label>
              </div>
            )}
            
            {!useMediaDuration && (
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#666' }}>
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="3600"
                  value={automationDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 10;
                    setAutomationDuration(value);
                  }}
                  onBlur={() => {
                    handleAutomationChange({ automation_duration: automationDuration });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d4deea',
                    borderRadius: 6,
                    fontSize: 14
                  }}
                />
              </div>
            )}
          </>
        )}
        
        <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
          {automationMode === 'manual' ? (
            <>
              ⏸ Item will wait for operator to press NEXT
              <br />
              Displays flashing [M] indicator when LIVE
            </>
          ) : (
            <>
              ⏱ Item will auto-advance after {useMediaDuration ? 'media completes' : `${automationDuration} seconds`}
              <br />
              Displays countdown timer when LIVE
            </>
          )}
        </div>
      </div>
    );
  };

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
            {/* Always show automation controls for regular items (not manual blocks, presenter notes, overlays, or audio cues) */}
            {!isManualBlock && !isPresenterNote && !isOverlay && !isAudioCue && (
              <div style={{ padding: 12 }}>
                <AutomationControls 
                  item={selectedItem} 
                  onSave={saveItemData}
                />
              </div>
            )}
            
            {isObsScene ? (
              <div style={{ padding: 12 }}>
                <ObsSceneEditor
                  key={`obs-${String(selectedItem.id)}-${t}`}
                  item={selectedItem}
                  itemId={selectedItem.id}
                  onPatch={saveItemData}
                />
              </div>
            ) : isFullScreenGraphic ? (
              <FullScreenGraphic
                key={`graphic-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                segments={segments}
                onSave={async (data) => {
                  await saveItemData({ data });
                }}
              />
            ) : isFullScreenVideo ? (
              <FullScreenVideo
                key={`video-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  await saveItemData({ data });
                }}
              />
            ) : isFullScreenYouTube ? (
              <FullScreenYouTube
                key={`youtube-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  await saveItemData({ data });
                }}
              />
            ) : isFullScreenPdfImage ? (
              <FullScreenPdfImage
                key={`pdfimage-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  await saveItemData({ data });
                }}
              />
            ) : isPresenterNote ? (
              <PresenterNote
                key={`presenter-${String(selectedItem.id)}-${t}`}
                selectedItem={selectedItem}
                itemData={selectedItem?.data}
                onSave={async (data) => {
                  await saveItemData({ data });
                }}
              />
            ) : isAudioCue ? (
              (() => {
                const parentInfo = findParentManualBlock(selectedItem.id);
                const isManualContext = !!parentInfo;
                return (
                  <AudioCue
                    key={`audiocue-${String(selectedItem.id)}-${t}`}
                    item={selectedItem}
                    segments={segments}
                    isManualContext={isManualContext}
                    onSave={async (data) => {
                      await saveItemData({ data });
                    }}
                  />
                );
              })()
            ) : isManualBlock ? (
              <ManualBlock
                key={`manual-${String(selectedItem.id)}-${t}`}
                item={selectedItem}
                onSave={async (data) => {
                  await saveItemData({ data });
                }}
              />
            ) : isOverlay ? (
              (() => {
                const parentInfo = findParentManualBlock(selectedItem.id);
                const isManualContext = !!parentInfo;
                // If in manual block, use the nested index as color index if not already set
                const colorIndex = selectedItem.overlay_color_index ?? 
                                 selectedItem.data?.overlay_color_index ?? 
                                 (parentInfo ? parentInfo.nestedIndex : 0);
                return (
                  <Overlay
                    key={`overlay-${String(selectedItem.id)}-${t}`}
                    item={selectedItem}
                    isManualContext={isManualContext}
                    colorIndex={colorIndex}
                    onUpdate={async (updatedItem) => {
                      await saveItemData(updatedItem);
                    }}
                  />
                );
              })()
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