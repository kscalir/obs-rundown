import React, { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../config";

function ShowsPanel({ show, setShow }) {
  const [shows, setShows] = useState([]);
  const [newName, setNewName] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Normalize IDs to strings to avoid Number() edge cases
  const idEq = (a, b) => String(a) === String(b);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch(`${API_BASE_URL}/api/shows`, { signal: ac.signal });
        if (!r.ok) throw new Error(`Failed to load shows (HTTP ${r.status})`);
        const list = await r.json();
        setShows(Array.isArray(list) ? list : []);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const addShow = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    try {
      setCreating(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/shows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`Create failed (HTTP ${res.status})`);
      const data = await res.json();

      setShows(prev => {
        // de-dupe by id
        if (prev.some(s => idEq(s.id, data.id))) return prev;
        return [...prev, data];
      });

      setShow(data);       // select the new show
      setNewName("");      // clear input
      setShowModal(false); // close modal
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setCreating(false);
    }
  }, [newName, creating, setShow]);

  const handleChange = useCallback((e) => {
    const selectedId = e.target.value; // keep as string
    const selected = shows.find(s => idEq(s.id, selectedId));
    if (selected) setShow(selected);
  }, [shows, setShow]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setNewName("");
  }, []);

  const onModalKeyDown = useCallback((e) => {
    if (e.key === "Enter") addShow();
    if (e.key === "Escape") closeModal();
  }, [addShow, closeModal]);

  return (
    <div className="shows-panel" style={{ minWidth: 210 }}>
      <h3 style={{ marginBottom: 12 }}>Show</h3>

      <select
        value={show?.id != null ? String(show.id) : ""}
        onChange={handleChange}
        disabled={loading}
        style={{ width: "100%", fontSize: 16, marginBottom: 8, padding: 4 }}
      >
        <option value="">{loading ? "Loading…" : "Select show..."}</option>
        {shows.map(s => (
          <option key={s.id} value={String(s.id)}>
            {s.name}
          </option>
        ))}
      </select>

      {error && (
        <div style={{ color: "#b00020", fontSize: 12, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <button
        onClick={() => setShowModal(true)}
        style={{
          float: "right",
          background: "white",
          border: "1.5px solid #1976d2",
          color: "#1976d2",
          borderRadius: 22,
          padding: "4px 16px",
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.15s",
          marginBottom: 12,
          marginLeft: 8,
          outline: "none",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#e3f0fc"}
        onMouseLeave={e => e.currentTarget.style.background = "white"}
      >
        + Add Show
      </button>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal} // click backdrop closes
          style={{
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
          <div
            onClick={e => e.stopPropagation()} // don't close when clicking the card
            onKeyDown={onModalKeyDown}
            style={{
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
                marginBottom: 16,
                padding: "10px 12px",
                fontSize: 18,
                borderRadius: 7,
                border: "2px solid #2376ec",
                outline: "none"
              }}
            />

            <button
              onClick={addShow}
              disabled={creating || !newName.trim()}
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: 18,
                fontWeight: 600,
                background: creating ? "#eaeaea" : "#fafafa",
                border: "none",
                color: "#141414",
                cursor: creating ? "not-allowed" : "pointer",
                borderRadius: 7,
                transition: "background 0.13s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f1f1"}
              onMouseLeave={e => e.currentTarget.style.background = creating ? "#eaeaea" : "#fafafa"}
            >
              {creating ? "Creating…" : "Create Show"}
            </button>

            <button
              onClick={closeModal}
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
                transition: "background 0.13s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f1f1"}
              onMouseLeave={e => e.currentTarget.style.background = "#fafafa"}
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