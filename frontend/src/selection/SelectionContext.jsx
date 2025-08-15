import React, { createContext, useContext, useMemo, useEffect, useState } from "react";

// parse helper
function readIdsFromUrl() {
  try {
    const u = new URL(window.location.href);
    const nx = v => (v == null ? null : (isNaN(+v) ? null : +v));
    return {
      showId: nx(u.searchParams.get("showId")),
      episodeId: nx(u.searchParams.get("episodeId")),
      itemId: nx(u.searchParams.get("itemId")),
    };
  } catch {
    return { showId: null, episodeId: null, itemId: null };
  }
}

// write helper that preserves other params
function writeIdsToUrl({ showId, episodeId, itemId }) {
  try {
    const u = new URL(window.location.href);
    
    // Clean up any existing duplicates first
    u.searchParams.delete("showId");
    u.searchParams.delete("episodeId");
    u.searchParams.delete("itemId");
    
    // Set new values
    if (showId != null) u.searchParams.set("showId", String(showId));
    if (episodeId != null) u.searchParams.set("episodeId", String(episodeId));
    if (itemId != null) u.searchParams.set("itemId", String(itemId));
    
    window.history.replaceState({}, "", u.toString());
  } catch {}
}

const SelectionContext = createContext(null);

export function SelectionProvider({ children, initial }) {
  // 1) boot from URL; fall back to optional `initial` (e.g., from localStorage)
  const url = readIdsFromUrl();
  const [showId, setShowId] = useState(url.showId ?? initial?.showId ?? null);
  const [episodeId, setEpisodeId] = useState(url.episodeId ?? initial?.episodeId ?? null);
  const [itemId, setItemId] = useState(url.itemId ?? initial?.itemId ?? null);

  // 2) keep URL in sync when state changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      writeIdsToUrl({ showId, episodeId, itemId });
    }, 10); // Small delay to batch multiple rapid changes
    return () => clearTimeout(timeoutId);
  }, [showId, episodeId, itemId]);

  // 3) react to back/forward or other external URL changes
  useEffect(() => {
    const onPop = () => {
      const u = readIdsFromUrl();
      setShowId(u.showId);
      setEpisodeId(u.episodeId);
      setItemId(u.itemId);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 4) value
  const value = useMemo(() => ({
    showId, setShowId,
    episodeId, setEpisodeId,
    itemId, setItemId,
  }), [showId, episodeId, itemId]);

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within <SelectionProvider>");
  return ctx;
}