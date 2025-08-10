// =============================================
// /src/hooks/useEpisodes.js
// Loads episodes for a show and persists last selection
// =============================================
import { useEffect, useState } from "react";

export function useEpisodes(api, showId, storageKey = "obsSelectedEpisode") {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showId) { setEpisodes([]); setSelectedEpisode(null); return; }

    const ac = new AbortController();
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const list = await api.get(`/api/shows/${showId}/episodes`, { signal: ac.signal });
        if (!alive) return;
        const safe = Array.isArray(list) ? list : [];
        setEpisodes(safe);
        const saved = localStorage.getItem(storageKey);
        const found = safe.find(e => String(e.id) === String(saved));
        setSelectedEpisode(found || safe[0] || null);
      } catch (e) {
        if (e.name === "AbortError") return; // quiet during HMR/unmount
        console.error(e);
        if (alive) { setEpisodes([]); setSelectedEpisode(null); }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; ac.abort(); };
  }, [api, showId, storageKey]);

  useEffect(() => {
    if (selectedEpisode?.id) localStorage.setItem(storageKey, String(selectedEpisode.id));
  }, [selectedEpisode, storageKey]);

  return { episodes, selectedEpisode, setSelectedEpisode, loading };
}