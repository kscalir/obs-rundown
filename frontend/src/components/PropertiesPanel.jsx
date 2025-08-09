import React, { useState, useEffect } from "react";
import GraphicsTemplateEditor from './properties/GraphicsTemplateEditor';
import ObsCommandEditor from './properties/ObsCommandEditor';
import PresenterNoteEditor from './properties/PresenterNoteEditor';
import VideoEditor from './properties/VideoEditor';
import AudioEditor from './properties/AudioEditor';

export default function PropertiesPanel({
  showId,
  selectedEpisode,
  segments,
  loading,
  mediaError,
  editingType,
  editingId,
  editingValue,
  inputRef,
  toggleSegment,
  toggleGroup,
  addSegment,
  addGroup,
  setEditingType,
  setEditingId,
  setEditingValue,
  setRefreshKey,
  selectedTab,
  setSelectedTab,
  show,
  itemId,
  itemData,
  onClose
}) {
  const [selectedItem, setSelectedItem] = useState(null);

  // Find selected item from segments
  useEffect(() => {
    if (!itemId) {
      setSelectedItem(null);
      return;
    }

    if (segments) {
      let found = null;
      segments.forEach((segment) => {
        if (found) return;
        (segment.groups || []).forEach((group) => {
          if (found) return;
          const groupItem = (group.items || []).find((i) => i.id === itemId);
          if (groupItem) found = groupItem;
        });
      });
      
      setSelectedItem(found);
    }
  }, [itemId, segments]);

  // No item selected
  if (!itemId || !itemData || !selectedItem) {
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

  // Main render
  return (
    <div style={{
      flex: 1,
      overflow: "auto",
      background: "#f8fafd",
      height: "100%",
    }}>
      <div style={{
        padding: "15px",
        borderBottom: "1px solid #e1e6ec",
      }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>
          Properties
        </h2>
      </div>

      <div style={{
        height: "calc(100% - 50px)",
        overflow: "auto",
      }}>
        {(selectedItem.type === "toolbox-graphicstemplate" || selectedItem.type === "graphicstemplate") && (
          <GraphicsTemplateEditor 
            selectedItem={selectedItem}
            itemData={itemData}
            setRefreshKey={setRefreshKey}
          />
        )}
        
        {(selectedItem.type === "toolbox-obscommand" || selectedItem.type === "obscommand") && (
          <ObsCommandEditor 
            selectedItem={selectedItem}
            itemData={itemData}
            setRefreshKey={setRefreshKey}
          />
        )}
        
        {(selectedItem.type === "toolbox-presenternote" || selectedItem.type === "presenternote") && (
          <PresenterNoteEditor 
            selectedItem={selectedItem}
            itemData={itemData}
            setRefreshKey={setRefreshKey}
          />
        )}

        {(selectedItem.type === "toolbox-video" || selectedItem.type === "video") && (
          <VideoEditor 
            selectedItem={selectedItem}
            itemData={itemData}
            setRefreshKey={setRefreshKey}
          />
        )}

        {(selectedItem.type === "toolbox-audio" || selectedItem.type === "audio") && (
          <AudioEditor 
            selectedItem={selectedItem}
            itemData={itemData}
            setRefreshKey={setRefreshKey}
          />
        )}

        {/* Add future editors here: VideoEditor, AudioEditor, etc. */}
      </div>
    </div>
  );
}