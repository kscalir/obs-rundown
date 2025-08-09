import React, { useEffect, useState, useRef } from "react";
// Simple SVG gear icon
const GearIcon = ({ size = 22, color = "#b1c7e7" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="2" />
    <path d="M19.4 15.1l1.1 1.9c.2.3.1.7-.2.9l-1.2 1.2c-.2.2-.6.3-.9.2l-1.9-1.1a7.1 7.1 0 0 1-2.1.9l-.3 2.1c0 .4-.4.7-.8.7h-1.7c-.4 0-.8-.3-.8-.7l-.3-2.1a7.1 7.1 0 0 1-2.1-.9l-1.9 1.1c-.3.2-.7.1-.9-.2l-1.2-1.2c-.2-.2-.3-.6-.2-.9l1.1-1.9a7.1 7.1 0 0 1-.9-2.1l-2.1-.3c-.4 0-.7-.4-.7-.8v-1.7c0-.4.3-.8.7-.8l2.1-.3a7.1 7.1 0 0 1 .9-2.1l-1.1-1.9c-.2-.3-.1-.7.2-.9l1.2-1.2c.2-.2.6-.3.9-.2l1.9 1.1a7.1 7.1 0 0 1 2.1-.9l.3-2.1c0-.4.4-.7.8-.7h1.7c.4 0 .8.3.8.7l.3 2.1a7.1 7.1 0 0 1 2.1.9l1.9-1.1c.3-.2.7-.1.9.2l1.2 1.2c.2.2.3.6.2.9l-1.1 1.9a7.1 7.1 0 0 1 .9 2.1l2.1.3c.4 0 .7.4.7.8v1.7c0 .4-.3.8-.7.8l-2.1.3a7.1 7.1 0 0 1-.9 2.1z" stroke={color} strokeWidth="1.5" />
  </svg>
);
import { API_BASE_URL } from "../config";

// Simple, modern styles
const STYLES = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(120deg, #e3f2fd 0%, #f9f9f9 100%)",
    fontFamily: "Inter, Arial, sans-serif"
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(25,118,210,0.10)",
    padding: "48px 64px",
    minWidth: "520px",
    maxWidth: "700px",
    width: "100%",
    margin: "0 auto"
  },
  title: {
    fontSize: "2.4rem",
    fontWeight: 700,
    color: "#1976d2",
    marginBottom: "28px",
    textAlign: "center",
    letterSpacing: "-1px"
  },
  showList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    marginBottom: "28px",
    maxHeight: "340px",
    overflowY: "auto",
    border: "1px solid #e3f2fd",
    background: "#fafdff",
    boxShadow: "0 1px 4px rgba(25, 118, 210, 0.04)",
    borderRadius: "10px"
  },
  showItem: {
    background: "#f5faff",
    borderRadius: "10px",
    padding: "18px 28px",
    marginBottom: "14px",
    fontSize: "1.18rem",
    color: "#333",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    cursor: "pointer",
    transition: "box-shadow 0.2s, background 0.2s",
    boxShadow: "0 2px 8px rgba(25, 118, 210, 0.07)",
    border: "1.5px solid #e3f2fd"
  },
  goButton: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "8px 22px",
    fontWeight: 600,
    fontSize: "1.08rem",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(25, 118, 210, 0.10)",
    marginLeft: "auto"
  },
  gearIcon: {
    marginLeft: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  addShow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "18px"
  },
  button: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 28px",
    fontWeight: 600,
    fontSize: "1.08rem",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(25, 118, 210, 0.07)"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(25, 118, 210, 0.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  modal: {
    background: "#fff",
    borderRadius: "14px",
    boxShadow: "0 4px 24px rgba(25,118,210,0.18)",
    padding: "36px 44px",
    minWidth: "340px",
    maxWidth: "90vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: "1.4rem",
    fontWeight: 600,
    color: "#1976d2",
    marginBottom: "18px"
  },
  modalInput: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1.5px solid #b1c7e7",
    fontSize: "1.08rem",
    width: "100%",
    marginBottom: "18px"
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    width: "100%",
    justifyContent: "center"
  }
};

export default function ShowsHome({ onShowSelected }) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newShowName, setNewShowName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsShow, setSettingsShow] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const inputRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/shows`)
      .then(res => res.json())
      .then(data => setShows(data))
      .catch(() => setError("Failed to load shows."))
      .finally(() => setLoading(false));
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (modalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modalOpen]);

  const handleAddShow = () => {
    if (!newShowName.trim()) return;
    setModalLoading(true);
    fetch(`${API_BASE_URL}/api/shows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newShowName.trim() })
    })
      .then(res => res.json())
      .then(data => {
        setShows(prev => [...prev, data]);
        setNewShowName("");
        setModalOpen(false);
      })
      .catch(() => setError("Failed to add show."))
      .finally(() => setModalLoading(false));
  };

  const handleModalKeyDown = (e) => {
    if (e.key === "Enter") handleAddShow();
    if (e.key === "Escape") setModalOpen(false);
  };

  return (
    <div style={STYLES.container}>
      <div style={STYLES.card}>
        <div style={STYLES.title}>Select a Show</div>
        {error && <div style={{ color: "#d32f2f", marginBottom: 10 }}>{error}</div>}
        {loading ? (
          <div style={{ textAlign: "center", color: "#888" }}>Loading...</div>
        ) : (
          <ul style={STYLES.showList}>
            {shows.map(show => (
              <li
                key={show.id}
                style={STYLES.showItem}
                title="Click to select this show"
              >
                <span
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={() => onShowSelected(show)}
                >
                  {show.name}
                </span>
                <button
                  style={STYLES.goButton}
                  onClick={() => onShowSelected(show)}
                  title="Open show"
                >
                  Go
                </button>
                <span
                  style={STYLES.gearIcon}
                  title="Show settings"
                  onClick={e => {
                    e.stopPropagation();
                    setSettingsShow(show);
                    setRenameValue(show.name);
                    setSettingsOpen(true);
                    setDeleteConfirm(false);
                  }}
                >
                  <GearIcon size={16} />
                </span>
              </li>
            ))}
      {/* Settings Modal for Rename/Delete */}
      {settingsOpen && settingsShow && (
        <div style={STYLES.modalOverlay} onClick={() => setSettingsOpen(false)}>
          <div style={STYLES.modal} onClick={e => e.stopPropagation()}>
            <div style={STYLES.modalTitle}>Show Settings</div>
            {!deleteConfirm ? (
              <>
                <div style={{ width: "100%", marginBottom: 18 }}>
                  <label htmlFor="rename" style={{ fontWeight: 500, color: "#1976d2", marginBottom: 6, display: "block" }}>Rename Show</label>
                  <input
                    ref={renameInputRef}
                    id="rename"
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    style={STYLES.modalInput}
                    disabled={settingsLoading}
                  />
                </div>
                <div style={STYLES.modalActions}>
                  <button
                    style={STYLES.button}
                    onClick={async () => {
                      if (!renameValue.trim() || renameValue === settingsShow.name) return;
                      setSettingsLoading(true);
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/shows/${settingsShow.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: renameValue.trim() })
                        });
                        if (!res.ok) throw new Error("Failed to rename show");
                        const updated = await res.json();
                        setShows(shows => shows.map(s => s.id === updated.id ? { ...s, name: updated.name } : s));
                        setSettingsOpen(false);
                      } catch {
                        setError("Failed to rename show.");
                      } finally {
                        setSettingsLoading(false);
                      }
                    }}
                    disabled={settingsLoading || !renameValue.trim() || renameValue === settingsShow.name}
                  >
                    Save
                  </button>
                  <button
                    style={{ ...STYLES.button, background: "#b1c7e7", color: "#333" }}
                    onClick={() => setSettingsOpen(false)}
                    disabled={settingsLoading}
                  >
                    Cancel
                  </button>
                  <button
                    style={{ ...STYLES.button, background: "#d32f2f" }}
                    onClick={() => setDeleteConfirm(true)}
                    disabled={settingsLoading}
                  >
                    Delete Show
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ color: "#d32f2f", fontWeight: 600, marginBottom: 18, textAlign: "center" }}>
                  Are you sure you want to <u>permanently delete</u> this show?<br />
                  <span style={{ fontWeight: 400, fontSize: "1rem" }}>
                    This action cannot be undone. All segments, cues, and media will be lost.<br />
                    Type <b>DELETE</b> below to confirm.
                  </span>
                </div>
                <input
                  type="text"
                  style={STYLES.modalInput}
                  disabled={settingsLoading}
                  autoFocus
                  onChange={e => setDeleteConfirm(e.target.value === "DELETE" ? "DELETE" : e.target.value)}
                  placeholder="Type DELETE to confirm"
                />
                <div style={STYLES.modalActions}>
                  <button
                    style={{ ...STYLES.button, background: "#d32f2f" }}
                    onClick={async () => {
                      if (deleteConfirm !== "DELETE") return;
                      setSettingsLoading(true);
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/shows/${settingsShow.id}`, {
                          method: "DELETE"
                        });
                        if (!res.ok) throw new Error("Failed to delete show");
                        setShows(shows => shows.filter(s => s.id !== settingsShow.id));
                        setSettingsOpen(false);
                      } catch {
                        setError("Failed to delete show.");
                      } finally {
                        setSettingsLoading(false);
                      }
                    }}
                    disabled={settingsLoading || deleteConfirm !== "DELETE"}
                  >
                    Confirm Delete
                  </button>
                  <button
                    style={{ ...STYLES.button, background: "#b1c7e7", color: "#333" }}
                    onClick={() => setSettingsOpen(false)}
                    disabled={settingsLoading}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
            {shows.length === 0 && (
              <li style={{ color: "#888", textAlign: "center", padding: "12px" }}>
                No shows found. Add a show below.
              </li>
            )}
          </ul>
        )}
        <div style={STYLES.addShow}>
          <button
            style={STYLES.button}
            onClick={() => setModalOpen(true)}
            disabled={loading}
          >
            + Add Show
          </button>
        </div>
      </div>
      {modalOpen && (
        <div style={STYLES.modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={STYLES.modal} onClick={e => e.stopPropagation()}>
            <div style={STYLES.modalTitle}>Add New Show</div>
            <input
              ref={inputRef}
              type="text"
              value={newShowName}
              onChange={e => setNewShowName(e.target.value)}
              placeholder="Show name..."
              style={STYLES.modalInput}
              disabled={modalLoading}
              onKeyDown={handleModalKeyDown}
            />
            <div style={STYLES.modalActions}>
              <button
                style={STYLES.button}
                onClick={handleAddShow}
                disabled={modalLoading || !newShowName.trim()}
              >
                Add
              </button>
              <button
                style={{ ...STYLES.button, background: "#b1c7e7", color: "#333" }}
                onClick={() => setModalOpen(false)}
                disabled={modalLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
