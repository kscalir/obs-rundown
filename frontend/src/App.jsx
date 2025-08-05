import React, { useState, useEffect, useRef } from "react";
import ShowsPanel from "./components/ShowsPanel";
import MainPanel from "./components/MainPanel";
import { API_BASE_URL } from "./config";


function App() {
  // Initialize show as null
  const [show, setShow] = useState(null);

  // Load show ID from localStorage
  useEffect(() => {
    const savedShowId = localStorage.getItem("obsRundownShowId");
    console.log("Loaded show id from localStorage:", savedShowId);
    if (savedShowId) {
      setShow({ id: savedShowId });
    }
  }, []);

  // Save show ID to localStorage
  useEffect(() => {
    if (show && show.id) {
      localStorage.setItem("obsRundownShowId", show.id);
    }
  }, [show]);

  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingType, setEditingType] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const inputRef = useRef(null);

  const saveSegmentPositions = async (newSegments) => {
    await Promise.all(newSegments.map((seg, idx) =>
      fetch(`${API_BASE_URL}/api/segments/${seg.id}/position`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: idx }),
      })
    ));
  };

  const saveGroupPositions = async (segmentId, newGroups) => {
    await Promise.all(newGroups.map((grp, idx) =>
      fetch(`${API_BASE_URL}/api/groups/${grp.id}/position`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: idx }),
      })
    ));
  };

  const saveItemPositions = async (groupId, newItems) => {
    await Promise.all(newItems.map((item, idx) =>
      fetch(`${API_BASE_URL}/api/items/${item.id}/position`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: idx }),
      })
    ));
  };

  // Toggle expand/collapse for segment, save to localStorage
  const toggleSegment = (segId) => {
    setSegments(segs => {
      const newSegs = segs.map(seg => seg.id === segId ? { ...seg, expanded: !seg.expanded } : seg);
      try {
        const LOCAL_STORAGE_KEY = "obsRundownExpandState"; // Define it here
        const savedState = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
        savedState.segments = savedState.segments || {};
        const toggled = newSegs.find(s => s.id === segId);
        savedState.segments[segId] = toggled.expanded;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedState));
      } catch {}
      return newSegs;
    });
  };

  // Toggle expand/collapse for group, save to localStorage
  const toggleGroup = (segId, groupId) => {
    setSegments(segs => {
      const newSegs = segs.map(seg => {
        if (seg.id !== segId) return seg;
        return { ...seg, groups: seg.groups.map(grp => grp.id === groupId ? { ...grp, expanded: !grp.expanded } : grp) };
      });

      try {
        const LOCAL_STORAGE_KEY = "obsRundownExpandState"; // Define it here too
        const savedState = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
        savedState.groups = savedState.groups || {};
        const seg = newSegs.find(s => s.id === segId);
        const toggledGroup = seg?.groups.find(g => g.id === groupId);
        if (toggledGroup) {
          savedState.groups[groupId] = toggledGroup.expanded;
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedState));
        }
      } catch {}

      return newSegs;
    });
  };

  const addSegment = async () => {
    if (!show) return; // Change from 'episode' to 'show'
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/api/episodes/${show.id}/segments`, { // Change from 'episode.id' to 'show.id'
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Segment ${segments.length + 1}` }),
      });
      if (!res.ok) throw new Error("Failed to add segment");
      const segment = await res.json();
      setRefreshKey(k => k + 1);
      setTimeout(() => {
        setEditingType("segment");
        setEditingId(segment.id);
        setEditingValue(segment.name || "");
      }, 250);
    } catch (err) {
      alert("Error adding segment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addGroup = async (segId) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/api/segments/${segId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Group ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}` }),
      });
      if (!res.ok) throw new Error("Failed to add group");
      const group = await res.json();
      setRefreshKey(k => k + 1);
      setTimeout(() => {
        setEditingType("group");
        setEditingId(group.id);
        setEditingValue(group.name || "");
      }, 250);
    } catch (err) {
      alert("Error adding group: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (segId, groupId) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/api/groups/${groupId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Item ${Date.now()}` }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const item = await res.json();
      setRefreshKey(k => k + 1);
      setTimeout(() => {
        setEditingType("item");
        setEditingId(item.id);
        setEditingValue(item.name || "");
      }, 250);
    } catch (err) {
      alert("Error adding item: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSegment = async (segmentId) => {
    if (!window.confirm("Delete this segment and all its groups/items?")) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/api/segments/${segmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete segment");
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert("Error deleting segment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm("Delete this group and all its items?")) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert("Error deleting group: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm("Delete this item?")) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/api/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert("Error deleting item: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (type, id, value) => {
    setEditingType(type);
    setEditingId(id);
    setEditingValue(value || "");
  };

  const handleEditChange = (e) => setEditingValue(e.target.value);

  const handleEditCancel = () => {
    setEditingType(null);
    setEditingId(null);
    setEditingValue("");
  };

  const handleEditSave = async () => {
    if (!editingType || !editingId) return;
    const trimmed = (editingValue || "").trim();
    if (!trimmed) {
      handleEditCancel();
      return;
    }
    let url = "";
    let method = "PATCH";
    if (editingType === "segment") url = `http://localhost:5050/api/segments/${editingId}/name`;
    else if (editingType === "group") url = `http://localhost:5050/api/groups/${editingId}/name`;
    else if (editingType === "item") {
      url = `http://localhost:5050/api/items/${editingId}/name`;
      method = "PUT";
    }
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to save name");
      setRefreshKey(k => k + 1);
      handleEditCancel();
    } catch (err) {
      alert("Error saving name: " + err.message);
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      height: "100vh", 
      width: "100vw", 
      overflow: "hidden",
      boxSizing: "border-box" 
    }}>
      {/* Left panel: ShowsPanel */}
      <div style={{ width: 250, minWidth: 250, maxWidth: 250, borderRight: "1px solid #ccc", padding: 10 }}>
        <ShowsPanel show={show} setShow={setShow} />
      </div>
      {/* Main content panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {show && (
          <MainPanel
            showId={show.id}
            segments={segments}
            loading={loading}
            mediaError={mediaError}
            editingType={editingType}
            editingId={editingId}
            editingValue={editingValue}
            inputRef={inputRef}
            toggleSegment={toggleSegment}
            toggleGroup={toggleGroup}
            addSegment={addSegment}
            addGroup={addGroup}
            addItem={addItem}
            deleteSegment={deleteSegment}
            deleteGroup={deleteGroup}
            deleteItem={deleteItem}
            handleEditStart={handleEditStart}
            handleEditChange={handleEditChange}
            handleEditCancel={handleEditCancel}
            handleEditSave={handleEditSave}
          />
        )}
      </div>
      {/* Spacer */}
      <div style={{ width: 28, minWidth: 28, maxWidth: 28, background: "transparent" }} />
    </div>
  );
}

export default App;