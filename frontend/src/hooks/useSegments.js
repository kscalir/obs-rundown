// =============================================
// /src/hooks/useSegments.js
// Loads segments+groups+items for an episode; reducer for edits
// =============================================
import { useCallback, useEffect, useMemo, useState } from "react";

// ----- helpers for localStorage JSON -----
function getJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function setJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function useSegments(api, episodeId) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Namespaced key per episode
  const EXPANDED_KEY = useMemo(
    () => `rundown_expanded:${episodeId ?? "none"}`,
    [episodeId]
  );

  // shape: { segments: { [segmentId]: boolean }, groups: { [groupId]: boolean } }
  const readExpanded = useCallback(() => getJSON(EXPANDED_KEY, { segments: {}, groups: {} }), [EXPANDED_KEY]);
  const writeExpanded = useCallback((next) => setJSON(EXPANDED_KEY, next), [EXPANDED_KEY]);

  // apply saved expanded flags onto fresh data
  const mergeExpanded = useCallback((incoming) => {
    const saved = readExpanded();
    return (incoming || []).map(seg => {
      const segExpanded = saved.segments[String(seg.id)];
      const groups = (seg.groups || []).map(g => ({
        ...g,
        expanded: saved.groups[String(g.id)] ?? true, // default open
      }));
      return {
        ...seg,
        expanded: segExpanded ?? true, // default open
        groups,
      };
    });
  }, [readExpanded]);

  // save current expanded map (call after a toggle)
  const snapshotExpanded = useCallback((list) => {
    const next = { segments: {}, groups: {} };
    (list || []).forEach(seg => {
      next.segments[String(seg.id)] = !!seg.expanded;
      (seg.groups || []).forEach(g => {
        next.groups[String(g.id)] = !!g.expanded;
      });
    });
    writeExpanded(next);
  }, [writeExpanded]);

  // load segments for episode
  useEffect(() => {
    if (!episodeId) { setSegments([]); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/api/episodes/${episodeId}/segments?include=groups,items`);
        if (!alive) return;
        const withExpanded = mergeExpanded(Array.isArray(data) ? data : []);
        setSegments(withExpanded);
      } catch (e) {
        if (e.name !== "AbortError") console.error("[useSegments] load", e);
        if (alive) setSegments([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [api, episodeId, mergeExpanded]);

  // toggles that also persist
  const toggleSegment = useCallback((segmentId) => {
    setSegments(prev => {
      const next = prev.map(s =>
        String(s.id) === String(segmentId) ? { ...s, expanded: !s.expanded } : s
      );
      // persist new state
      snapshotExpanded(next);
      return next;
    });
  }, [snapshotExpanded]);

  const toggleGroup = useCallback((segmentId, groupId) => {
    setSegments(prev => {
      const next = prev.map(s => {
        if (String(s.id) !== String(segmentId)) return s;
        return {
          ...s,
          groups: (s.groups || []).map(g =>
            String(g.id) === String(groupId) ? { ...g, expanded: !g.expanded } : g
          )
        };
      });
      // persist new state
      snapshotExpanded(next);
      return next;
    });
  }, [snapshotExpanded]);

  // expose a dispatch if you already rely on it elsewhere
  const dispatch = useCallback((updater) => {
    setSegments(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      snapshotExpanded(next);
      return next;
    });
  }, [snapshotExpanded]);

  return { segments, setSegments, loading, toggleSegment, toggleGroup, dispatch };
}