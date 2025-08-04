import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";

function ShowsPanel({ show, setShow }) {
  const [shows, setShows] = useState([]);
  const [newName, setNewName] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/shows`)
      .then(r => r.json())
      .then(setShows)
      .catch(err => console.error("Error fetching shows:", err));
  }, []);

  const addShow = async () => {
    if (!newName.trim()) return;
    const res = await fetch(`${API_BASE_URL}/api/shows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    setShows(s => [...s, data]);
    setShow(data); // Immediately select the new show
    setNewName("");
    setShowModal(false);
  };

  const handleChange = (e) => {
    const selectedId = Number(e.target.value);
    const selectedShow = shows.find(s => s.id === selectedId);
    if (selectedShow) setShow(selectedShow);
  };

  return (
    <div className="shows-panel" style={{ minWidth: 210 }}>
      <h3 style={{ marginBottom: 12 }}>Show</h3>
      <select
        value={show?.id || ""}
        onChange={handleChange}
        style={{ width: "100%", fontSize: 16, marginBottom: 12, padding: 4 }}
      >
        <option value="">Select show...</option>
        {shows.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => setShowModal(true)}
        style={{
          float: "right",
          background: "white",
          border: "1.5px solid #1976d2",
          color: "#1976d2",
          borderRadius: "22px",
          padding: "4px 16px",
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.15s",
          marginBottom: 12,
          marginLeft: 8,
          outline: "none",
        }}
        onMouseOver={e => e.currentTarget.style.background = "#e3f0fc"}
        onMouseOut={e => e.currentTarget.style.background = "white"}
      >
        + Add Show
      </button>

      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          minHeight: "100vh",
          minWidth: "100vw"
        }}>
          <div style={{
            background: "white",
            borderRadius: 10,
            padding: 32,
            width: 440,
            boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New show name"
              style={{
                width: "100%",
                marginBottom: 32,
                padding: "10px 12px",
                fontSize: 18,
                borderRadius: 7,
                border: "2px solid #2376ec",
                outline: "none"
              }}
            />
            <button
              onClick={addShow}
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 16,
                fontSize: 18,
                fontWeight: 500,
                background: "#fafafa",
                border: "none",
                color: "#141414",
                cursor: "pointer",
                borderRadius: 7,
                transition: "background 0.13s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "#f1f1f1"}
              onMouseOut={e => e.currentTarget.style.background = "#fafafa"}
            >
              Create Show
            </button>
            <button
              onClick={() => { setShowModal(false); setNewName(""); }}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 18,
                fontWeight: 400,
                background: "#fafafa",
                border: "none",
                color: "#232323",
                cursor: "pointer",
                borderRadius: 7,
                marginTop: 0,
                transition: "background 0.13s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "#f1f1f1"}
              onMouseOut={e => e.currentTarget.style.background = "#fafafa"}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShowsPanel;