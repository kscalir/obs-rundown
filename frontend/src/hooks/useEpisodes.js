// =============================================
// /src/hooks/useEpisodes.js
// Loads episodes for a show and persists last selection
// =============================================
import { useEffect, useState } from "react";

// Create a global refresh trigger that can be accessed by any component
let globalRefreshTrigger = 0;
let globalRefreshCallbacks = [];

export function triggerEpisodeRefresh() {
  globalRefreshTrigger++;
  globalRefreshCallbacks.forEach(cb => {
    cb(globalRefreshTrigger);
  });
}

export function useEpisodes(api, showId, storageKey = "obsSelectedEpisode") {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  }, [api, showId, storageKey, refreshTrigger]);

  useEffect(() => {
    if (selectedEpisode?.id) {
      localStorage.setItem(storageKey, String(selectedEpisode.id));
      // Emit a storage event to notify other tabs/windows and other hook instances
      window.dispatchEvent(new StorageEvent('storage', {
        key: storageKey,
        newValue: String(selectedEpisode.id),
        url: window.location.href
      }));
    }
  }, [selectedEpisode, storageKey]);

  // Helper functions to update episodes list
  const updateEpisodes = (updater) => {
    if (typeof updater === 'function') {
      setEpisodes(updater);
    } else {
      setEpisodes(updater);
    }
  };

  const addEpisode = (newEpisode) => {
    // Simply trigger a global refresh to reload all episodes
    // Add a small delay to ensure the backend has processed the update
    setTimeout(() => {
      triggerEpisodeRefresh();
    }, 250);
  };

  const updateEpisode = (updatedEpisode) => {
    // Simply trigger a global refresh to reload all episodes
    // Add a small delay to ensure the backend has processed the update
    setTimeout(() => {
      triggerEpisodeRefresh();
    }, 250);
  };

  const deleteEpisode = (episodeId) => {
    // Simply trigger a global refresh to reload all episodes
    // Add a small delay to ensure the backend has processed the update
    setTimeout(() => {
      triggerEpisodeRefresh();
    }, 250);
  };

  // Register for global refresh triggers
  useEffect(() => {
    const handleRefresh = (trigger) => {
      setRefreshTrigger(trigger);
    };
    globalRefreshCallbacks.push(handleRefresh);
    return () => {
      globalRefreshCallbacks = globalRefreshCallbacks.filter(cb => cb !== handleRefresh);
    };
  }, []);

  // Listen for selected episode changes from other instances
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === storageKey && e.newValue) {
        // Find the episode with this ID and select it
        const episodeId = e.newValue;
        const found = episodes.find(ep => String(ep.id) === String(episodeId));
        if (found && (!selectedEpisode || selectedEpisode.id !== found.id)) {
          setSelectedEpisode(found);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [episodes, selectedEpisode, storageKey]);

  return { 
    episodes, 
    selectedEpisode, 
    setSelectedEpisode, 
    loading,
    updateEpisodes,
    addEpisode,
    updateEpisode,
    deleteEpisode
  };
}