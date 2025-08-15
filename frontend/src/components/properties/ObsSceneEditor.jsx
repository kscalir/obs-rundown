import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import GraphicsTemplateEditor from "./GraphicsTemplateEditor.jsx";
import SlotSelector from "./SlotSelector.jsx";
import MediaPicker from "../MediaPicker.jsx";
import YouTubePicker from "../YouTubePicker.jsx";
import { useSlotSelection } from "../../hooks/useSlotSelection.js";
import { useSelection } from "../../selection/SelectionContext.jsx";


const API_BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:5050';

async function fetchSceneItems(sceneName) {
  const res = await fetch(`${API_BASE_URL}/api/obs/placeholders?scene=${encodeURIComponent(sceneName)}`);
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();

  // Normalize possible shapes from backend
  const baseWidth = json?.baseWidth ?? 1920;
  const baseHeight = json?.baseHeight ?? 1080;

  let raw = json?.placeholders ?? json?.items ?? json;
  let list;
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    list = Array.isArray(raw.items) ? raw.items : Object.values(raw);
  } else {
    list = [];
  }

  const items = (list || []).filter(Boolean).map(p => {
    const hasNorm = typeof p?.norm?.x === "number" && typeof p?.norm?.y === "number";
    const px = hasNorm ? (p.norm.x * baseWidth)  : (p.x ?? p?.transform?.positionX ?? 0);
    const py = hasNorm ? (p.norm.y * baseHeight) : (p.y ?? p?.transform?.positionY ?? 0);
    const pw = hasNorm ? ((p.norm.w ?? 0) * baseWidth)  : (p.w ?? 0);
    const ph = hasNorm ? ((p.norm.h ?? 0) * baseHeight) : (p.h ?? 0);
    return {
      sceneItemId: p?.sceneItemId ?? p?.id ?? null,
      isPlaceholder: p?.isPlaceholder !== false,
      transform: { positionX: px, positionY: py },
      rect: { x: px, y: py, w: pw, h: ph },
    };
  });

  return { items, baseWidth, baseHeight };
}

async function fetchVideoSources(sceneName = "ALL-SOURCES") {
  try {
    const res = await fetch(`${API_BASE_URL}/api/obs/sources?scene=${encodeURIComponent(sceneName)}`);
    if (!res.ok) return [];

    const json = await res.json().catch(() => ({}));
    const raw = Array.isArray(json) ? json : (json.sources || []);

    // Only keep real inputs (exclude scene containers / groups)
    const seen = new Set();
    const out = [];
    for (const s of raw) {
      const type = (s?.sourceType || "").toString().toLowerCase();
      if (type !== "input") continue;
      const name = String(s?.name ?? s?.sourceName ?? s?.inputName ?? s?.id ?? "");
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ name });
    }

    // Sort for nicer UX
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  } catch (err) {
    console.warn("fetchVideoSources fallback (returning []):", err);
    return [];
  }
}

async function fetchSceneScreenshot(sceneName, w = 640) {
  const res = await fetch(`${API_BASE_URL}/api/obs/screenshot?scene=${encodeURIComponent(sceneName)}&width=${w}`);
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();

  let shot = json?.screenshot ?? null;
  if (!shot) return null;
  if (typeof shot !== "string") shot = String(shot);

  // If a double data-URL was returned, keep only the last prefix
  const marker = "data:image";
  const lastIdx = shot.lastIndexOf(marker);
  if (lastIdx > 0) shot = shot.slice(lastIdx);

  // Prefix raw base64 if needed
  if (!shot.startsWith("data:image")) {
    const maybeB64 = /^[A-Za-z0-9+/=]+$/.test(shot.slice(0, 100));
    if (maybeB64) shot = `data:image/png;base64,${shot}`;
  }

  return shot;
}
// --------------------------------------------------------------------

function useDebouncedCallback(fn, delay = 400) {
  const timer = React.useRef();
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function ObsSceneEditor({ item, onPatch, applyToObs = false }) {
  // Use centralized selection state
  const { episodeId } = useSelection();
  // Keep a stable numeric item id to hand off to child editors
  const itemId = (item && (item.id ?? item.itemId) != null)
    ? Number(item.id ?? item.itemId)
    : undefined;
  // `item` is the full item object; `onPatch(partial)` should PATCH /api/items/:id
  // Expected data shape; tolerate missing fields gracefully - EXCLUDE template data
  const initial = useMemo(() => ({
    scene: "",
    transition: { type: "cut", durationSec: 0 },
    slots: [],   // [{slot, replaceable, selectedSource, sourceProps}]
    notes: "",
  }), []);

  const [data, setData] = useState(initial);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  // Guard saves while hydrating a newly-selected item
  const isHydratingRef = useRef(false);
  
  // Use dedicated slot selection hook
  const { 
    slots, 
    isLoading: slotsLoading, 
    updateSlotSource, 
    updateSlotMediaData,
    updateSlotGenericType,
    mergeWithSceneLayout 
  } = useSlotSelection(itemId);
  const [sceneItems, setSceneItems] = useState([]);
  const [videoSources, setVideoSources] = useState([]);
  // Memo: filter out system/utility sources so operators only see their real inputs
  const userObsSources = useMemo(() => {
    const HIDE_PREFIXES = ["__UTIL_", "obsrundown-", "vmix-util-", "__POOL_", "GFX-", "VID-", "CG-"];
    return (videoSources || []).filter(s => {
      const n = String(s?.name || "");
      if (!n) return false;
      return !HIDE_PREFIXES.some(p => n.startsWith(p));
    });
  }, [videoSources]);
  const [screenshot, setScreenshot] = useState(null);
  const [loadingScene, setLoadingScene] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [orderedPlaceholders, setOrderedPlaceholders] = useState([]);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);
  const wrapperRef = useRef(null);
  const [lastShotWidth, setLastShotWidth] = useState(720);
  const [baseDims, setBaseDims] = useState({ width: 1920, height: 1080 });

  // --------------------
  // GENERIC TYPE (ephemeral, editor-only):
  // We keep a local map of slotNumber -> generic type label for incremental rollout.
  // This does NOT persist and does NOT affect runtime. It lets us validate UX safely.
  // --------------------
  const [genericTypesBySlot, setGenericTypesBySlot] = useState({});

  // Ephemeral selection of a graphic per slot (UI-only until we add persistence)
const [selectedGraphicBySlot, setSelectedGraphicBySlot] = useState({});


// Simple modal state for picking a graphic
const [gfxModal, setGfxModal] = useState({ open: false, slot: null });
const [gfxList, setGfxList] = useState([]);
const [gfxLoading, setGfxLoading] = useState(false);
const [gfxError, setGfxError] = useState("");
// --- Graphic editor modal state (inline editor)
const [gfxEditor, setGfxEditor] = useState({ open: false, graphicId: null, slot: null });
const keepEditorOpenOnSaveRef = useRef(false);

// --- Media picker modal state
const [mediaPickerModal, setMediaPickerModal] = useState({ open: false, slot: null });
const [selectedMediaBySlot, setSelectedMediaBySlot] = useState({});

// --- YouTube picker modal state
const [youtubePickerModal, setYoutubePickerModal] = useState({ open: false, slot: null });
const [selectedYouTubeBySlot, setSelectedYouTubeBySlot] = useState({});

// --- PDF/Image picker modal state  
const [pdfImagePickerModal, setPdfImagePickerModal] = useState({ open: false, slot: null });
const [selectedPdfImageBySlot, setSelectedPdfImageBySlot] = useState({});

// Load media, YouTube, and PDF/Image selections from database when slots change
useEffect(() => {
  const mediaSelections = {};
  const youtubeSelections = {};
  const pdfImageSelections = {};
  
  (slots || []).forEach(slot => {
    if (slot.mediaData) {
      
      // Check data type and route to appropriate state
      if (slot.mediaData.youtube) {
        youtubeSelections[slot.slot] = slot.mediaData;
      } else if (slot.mediaData.pdfImage) {
        pdfImageSelections[slot.slot] = slot.mediaData;
      } else if (slot.mediaData.media) {
        mediaSelections[slot.slot] = slot.mediaData;
      }
    }
  });
  
  
  setSelectedMediaBySlot(mediaSelections);
  setSelectedYouTubeBySlot(youtubeSelections);
  setSelectedPdfImageBySlot(pdfImageSelections);
}, [slots]);

const openGraphicEditor = (row, slotNumber) => {
  setGfxEditor({
    open: true,
    graphicId: row?.id ?? null,
    slot: slotNumber ?? gfxModal.slot ?? null
  });
};

const _closeGraphicEditor = () => {
  setGfxEditor({ open: false, graphicId: null, slot: null });
};

const closeGraphicEditor = () => {
  if (keepEditorOpenOnSaveRef.current) {
    // consume the flag and keep editor open
    keepEditorOpenOnSaveRef.current = false;
    return;
  }
  _closeGraphicEditor();
};

const onGraphicSaved = (updatedRow) => {
  // Normalize and update lists/selection so titles/fields refresh in UI
  const norm = normalizeGraphicRow(updatedRow || {});
  if (!norm.id) return;

  // Signal that if child tries to close immediately after save, we ignore it once.
  keepEditorOpenOnSaveRef.current = true;

  setGfxList(prev => prev.map(r => (r.id === norm.id ? { ...r, ...norm } : r)));

  setSelectedGraphicBySlot(prev => {
    const s = gfxEditor.slot;
    if (!s) return prev;
    const curr = prev[s];
    if (curr && curr.id === norm.id) {
      return { ...prev, [s]: { ...curr, ...norm } };
    }
    return prev;
  });
};


  // Simple scene data save (no slots - handled by useSlotSelection)
  const saveSceneData = useCallback(async (sceneData) => {
    try {
      if (isHydratingRef.current) {
        return;
      }
      // Merge with existing item.data so we don't clobber slots or other keys
      // Always include current slots when saving scene data, because the backend
      // may upsert slots from the incoming payload. If we omit them, it can clear them.
      const existing = (item && item.data) ? item.data : {};
      let mergedData = {
        ...existing,
        ...sceneData,
        ...(Array.isArray(slots) ? { slots } : {})
      };

      // If scene fields haven't changed, skip writing entirely
      const prevScene = {
        scene: existing.scene ?? '',
        transition: existing.transition ?? null,
        notes: existing.notes ?? ''
      };
      const nextScene = {
        scene: mergedData.scene ?? '',
        transition: mergedData.transition ?? null,
        notes: mergedData.notes ?? ''
      };
      if (JSON.stringify(prevScene) === JSON.stringify(nextScene)) {
        return;
      }


      if (typeof onPatch === 'function') {
        await onPatch({ data: mergedData });
      } else {
        // Fallback: direct PATCH if no onPatch provided
        if (!itemId) throw new Error('Missing itemId for scene save');
        const res = await fetch(`${API_BASE_URL}/api/items/${String(itemId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: mergedData })
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `Failed to save scene data for item ${itemId}`);
        }
      }
    } catch (err) {
      console.error('[ObsSceneEditor] Scene data save failed:', err);
      toast.error(err?.message || "Save failed");
    }
  }, [onPatch, item, itemId, toast, slots]);

  const debouncedSaveSceneData = useDebouncedCallback(saveSceneData, 120);

  // EFFECT (post-paint): fetch list of OBS inputs once. Triggers re-render when set.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const vids = await fetchVideoSources();
        if (!alive) return;
        setVideoSources(vids || []);
      } catch (e) {
        // If ALL-SOURCES isn't available yet, don't toast; just log.
        console.warn("OBS sources not available yet; continuing without dropdown list.", e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // EFFECT (post-paint): fetch item scene data (excluding slots). Guarded by isHydratingRef.
  useEffect(() => {
    if (!itemId) {
      setData(initial);
      return;
    }

    let alive = true;
    isHydratingRef.current = true;
    setIsLoadingItem(true);

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`);
        if (!response.ok) throw new Error('Failed to fetch item data');
        
        const itemData = await response.json();
        
        if (!alive) return;
        
        // Extract only scene data, excluding slots and template data
        const { templateId, templateData, slots: _, ...sceneData } = itemData.data || {};
        
        setData({
          ...initial,
          ...sceneData
        });
        
      } catch (err) {
        console.error('[ObsSceneEditor] Failed to fetch scene data:', err);
        if (alive) {
          setData(initial);
        }
      } finally {
        if (alive) setIsLoadingItem(false);
        isHydratingRef.current = false;
      }
    })();
    
    return () => { alive = false; };
  }, [itemId, initial]);

  // If scene is missing (e.g., item created from a scene module and only title was set),
  // initialize it once from the best available fallback and persist.
  const guessedSceneName = useMemo(() => {
    // Prefer explicit data first, then try to parse from legacy title format "Switch to Scene: XYZ"
    const fromData = (data.scene && String(data.scene)) || (item?.data?.sceneName && String(item.data.sceneName)) || "";
    if (fromData) return fromData;
    const t = item?.title ? String(item.title) : "";
    const m = t.match(/^Switch to Scene:\s*(.+)$/i);
    return m ? m[1].trim() : "";
  }, [data.scene, item?.data?.sceneName, item?.title]);

  // EFFECT (post-paint): whenever scene changes, load placeholders + screenshot.
  useEffect(() => {
    if (!data.scene && guessedSceneName) {
      setData(prev => ({ ...prev, scene: guessedSceneName }));
    }
  }, [data.scene, guessedSceneName]);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const normalizeSceneName = useCallback((name) => (name == null ? "" : String(name).trim()), []);

  const loadSceneLayout = useCallback(
    async (opts = {}) => {
      const { silent = false, retries = 3, width = 720 } = opts;
      const sceneName = normalizeSceneName(data.scene);
      if (!sceneName) {
        setSceneItems([]);
        setScreenshot(null);
        return;
      }

      let attempt = 0;
      let lastErr = null;
      setLoadingScene(true);
      try {
        while (attempt <= retries) {
          try {
            const [{ items, baseWidth, baseHeight }, shot] = await Promise.all([
              fetchSceneItems(sceneName),
              fetchSceneScreenshot(sceneName, width).catch(() => null),
            ]);

            setSceneItems(items || []);
            setBaseDims({ width: baseWidth || 1920, height: baseHeight || 1080 });
            setScreenshot(shot);
            const ordered = [...(items || [])].sort((a, b) => {
              const ay = a.transform?.positionY ?? 0,
                ax = a.transform?.positionX ?? 0;
              const by = b.transform?.positionY ?? 0,
                bx = b.transform?.positionX ?? 0;
              if (ay !== by) return ay - by;
              return ax - bx;
            });
            setOrderedPlaceholders(ordered);
            setLastShotWidth(width);

            const nextSlots = ordered.map((it, idx) => {
              const slotNum = idx + 1;
              const existing = (slots || []).find((s) => s.slot === slotNum);

              // Extract placeholder rect in scene pixel coords
              const rectX = (it?.rect?.x ?? it?.transform?.positionX ?? 0);
              const rectY = (it?.rect?.y ?? it?.transform?.positionY ?? 0);
              const rectW = (it?.rect?.w ?? 0);
              const rectH = (it?.rect?.h ?? 0);

              const placeholder = { x: rectX, y: rectY, w: rectW, h: rectH };
              const base = { w: baseWidth || 1920, h: baseHeight || 1080 };

              const existingSP = existing?.sourceProps || {};
              const mergedSP = {
                ...existingSP,
                placeholder, // scene-space rect for this slot
                base,        // template/native canvas size
                fit: existingSP.fit ?? "contain"
              };

              return {
                slot: slotNum,
                replaceable: it?.isPlaceholder !== false,
                selectedSource: existing?.selectedSource ?? "",
                sourceProps: mergedSP,
              };
            });

            // Update slots via the hook's merge function
            // The hook will only merge if no DB data has been loaded yet
            mergeWithSceneLayout(nextSlots);

            if (!loadedOnce) setLoadedOnce(true);
            return; // success
          } catch (e) {
            lastErr = e;
            attempt += 1;
            if (attempt > retries) break;
            // exponential-ish backoff: 200ms, 400ms, 800ms...
            await sleep(200 * Math.pow(2, attempt - 1));
          }
        }

        if (!silent) {
          toast.error("Failed to load scene layout");
          console.error(lastErr);
        }
      } finally {
        setLoadingScene(false);
      }
    },
    [data, mergeWithSceneLayout, loadedOnce, normalizeSceneName]
  );

  useEffect(() => {
    // On first set after drop, try silently with a few retries to avoid scary toasts.
    loadSceneLayout({ silent: true, retries: 4, width: 720 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.scene]);

  // EFFECT (post-paint): sync ephemeral generic types when slots change (read-only bootstrap).
  // This runs after slots are merged/loaded. Always sync with database values.
  useEffect(() => {
    if (!Array.isArray(slots) || slots.length === 0) return;
    setGenericTypesBySlot(prev => {
      const next = { ...prev };
      for (const s of slots) {
        if (!s || typeof s.slot !== 'number') continue;
        // Always sync with the database value to ensure consistency
        next[s.slot] = s.genericType || deriveSlotType(s);
      }
      return next;
    });
  }, [slots]);

  // EFFECT: Preload graphics list
  useEffect(() => {

    // Check if we need to load graphics (if any slot has a GRAPHIC: selection but gfxList is empty)
    const needsGraphicsLoad = gfxList.length === 0 && slots.some(slot => 
      slot?.selectedSource?.startsWith('GRAPHIC:')
    );

    if (!needsGraphicsLoad) return;

    const loadGraphics = async () => {
      try {
        setGfxLoading(true);
        const episodeId = data.episodeId || data.episode_id || '1.0'; // fallback episode
        const url = `${API_BASE_URL}/api/graphics?episodeId=${encodeURIComponent(episodeId)}&limit=100`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn('Failed to load graphics:', res.statusText);
          return;
        }
        const list = await res.json();
        const rows = Array.isArray(list) ? list : (list?.rows || list?.data || []);
        const norm = (rows || []).map(normalizeGraphicRow).filter(r => r.id != null);
        setGfxList(norm);
      } catch (err) {
        console.warn('Failed to preload graphics:', err);
      } finally {
        setGfxLoading(false);
      }
    };
    loadGraphics();
  }, [slots, gfxList.length, data.episodeId, data.episode_id]);

  // EFFECT (layout reaction): track image/container size to position overlay labels correctly.
  useEffect(() => {
    const imgEl = imgRef.current;
    const wrapEl = wrapperRef.current;
    // The right-pane resizer changes the parent width; observe it too
    const parentEl = wrapEl?.parentElement || null;

    const computeSize = () => {
      // Use getBoundingClientRect to react to flex/grid resizes precisely
      const w = (wrapEl?.getBoundingClientRect?.().width
        || imgEl?.getBoundingClientRect?.().width
        || imgEl?.clientWidth
        || 0);
      const ratio = (baseDims?.width && baseDims?.height)
        ? (baseDims.height / baseDims.width)
        : ((imgEl?.naturalWidth && imgEl?.naturalHeight)
            ? (imgEl.naturalHeight / imgEl.naturalWidth)
            : (1080 / 1920));
      const h = Math.round(w * ratio);

      // Avoid state churn if unchanged
      setImgSize(prev => (prev.width === w && prev.height === h) ? prev : { width: w, height: h });
    };

    // Prefer ResizeObserver but fall back to window.resize if unavailable
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => computeSize());
      if (wrapEl) ro.observe(wrapEl);
      if (imgEl) ro.observe(imgEl);
      if (parentEl) ro.observe(parentEl);
      // initial
      computeSize();
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', computeSize);
      computeSize();
      return () => window.removeEventListener('resize', computeSize);
    }
  }, [baseDims.width, baseDims.height]);

  // helpers

// Simplified ID resolution - prioritize centralized state
function getEpisodeIdFromAnywhere(item, episodeIdFromContext) {
  // Centralized episodeId takes priority
  if (episodeIdFromContext != null) return Number(episodeIdFromContext);
  
  // Simple fallback to item data
  const fallbackId = item?.episode_id ?? item?.episodeId ?? item?.data?.episode_id ?? item?.data?.episodeId ?? null;
  return fallbackId ? Number(fallbackId) : null;
}

// Returns a numeric show_id from anywhere we can find it (item or URL)
function getShowIdFromAnywhere(item) {
  // Try direct show_id references first
  const directShowId =
    item?.show_id ??
    item?.showId ??
    item?.data?.show_id ??
    item?.data?.showId ??
    item?.show?.id ??
    null;

  if (directShowId != null && directShowId !== '') return Number(directShowId);

  // Try to get from episode data if no direct show reference
  const resolvedEpisodeId = getEpisodeIdFromAnywhere(item, episodeId);
  if (resolvedEpisodeId) {
    // For now, assume episode ID is the same as show ID
    // This might need adjustment based on your data model
    return Number(resolvedEpisodeId);
  }

  // Try URL parameters
  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has('show')) return Number(sp.get('show'));
  } catch (_) { /* SSR/no-window safe */ }

  // Try localStorage (same key as used in App.jsx)
  try {
    const savedShowId = localStorage.getItem("obsRundownShowId");
    if (savedShowId) return Number(savedShowId);
  } catch (_) { /* SSR/no-localStorage safe */ }

  return null;
}

  // Derive a generic slot label for read-only display (no persistence yet)
  const deriveSlotType = (slot) => {
    const name = String(slot?.selectedSource || "").trim();
    if (!name) return 'None';
    if (/^CG-\d+$/i.test(name)) return 'Graphics';
    // If it matches a known OBS input from our filtered list, treat as Existing
    if (userObsSources.some(s => s?.name === name)) return 'Existing Source';
    // TODO: later detect media player naming to show 'Video' when applicable
    return 'Existing Source';
  };

// Persist only the slots array to the item.data without touching other fields
// Note: persistSlots function removed - now using useSlotSelection hook functions

// Persisted setter for Generic Type (saved into item.data.slots[*].genericType)
const setGenericTypeForSlot = (slotNumber, typeLabel) => {
  // update UI immediately
  setGenericTypesBySlot(prev => ({ ...prev, [slotNumber]: typeLabel }));

  // Find slot index and update through the hook
  const slotIndex = (slots || []).findIndex(s => s && s.slot === slotNumber);
  
  if (slotIndex !== -1) {
    // Use the hook's function to update and persist the generic type
    updateSlotGenericType(slotIndex, typeLabel);
  }
};

const normalizeGraphicRow = (g) => {
  const rawTd = g.templateData || g.template_data || {};
  const templateDataObj = typeof rawTd === 'string' ? (() => { try { return JSON.parse(rawTd); } catch { return {}; } })() : (rawTd || {});
  const templateId = g.templateId || g.template_id || g.template || g.template_name || null;
  const displayTitle = g.title || g.name || (templateDataObj && (templateDataObj.title || templateDataObj.headline)) || `Graphic ${g.id || ''}`;
  return {
    id: g.id ?? g.graphic_id ?? g.uuid ?? null,
    type: g.type || g.template_type || templateId || 'Graphic',
    title: displayTitle,
    summary: (() => {
      const fields = Object.values(templateDataObj).filter(v => typeof v === 'string' && v.trim());
      return fields.slice(0, 2).join(' — ');
    })(),
    templateId,
    templateData: templateDataObj
  };
};
const buildGraphicsPreviewUrl = (graphic) => {
  if (!graphic) return '';
  const tplId = graphic.templateId || graphic.template_id;
  if (!tplId) return '';
  const dataObj = graphic.templateData || graphic.template_data || {};
  const q = encodeURIComponent(JSON.stringify(dataObj || {}));
  return `${API_BASE_URL}/api/templates/${encodeURIComponent(tplId)}/preview?data=${q}`;
};

// Small preview that opens a modal zoom while mouse/touch is held
function HoldToZoomModalPreview({ url, containerWidth = 128, containerHeight = 72, baseWidth = 1920, baseHeight = 1080 }) {
  const [zooming, setZooming] = React.useState(false);

  // Scale used for the inline thumbnail
  const thumbScale = containerWidth / baseWidth;

  const start = (e) => { e.preventDefault(); setZooming(true); };
  const stop = () => setZooming(false);

  // Compute modal scale to fit up to 90vw x 85vh without exceeding 1:1
  const modalScale = React.useMemo(() => {
    const vw = (typeof window !== 'undefined' ? window.innerWidth : 1280) * 0.9;
    const vh = (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.85;
    const sx = vw / baseWidth;
    const sy = vh / baseHeight;
    return Math.min(1, Math.min(sx, sy));
  }, [baseWidth, baseHeight]);

  return (
    <div
      style={{ position: 'relative', width: containerWidth, height: containerHeight, overflow: 'hidden', cursor: 'zoom-in' }}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
    >
      {/* Thumbnail (always visible) */}
      <iframe
        title={`gfx-thumb-${Math.random().toString(36).slice(2)}`}
        src={url}
        style={{
          width: baseWidth,
          height: baseHeight,
          border: 0,
          display: 'block',
          transform: `scale(${thumbScale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
          borderRadius: 4
        }}
        sandbox="allow-scripts allow-same-origin"
      />

      {/* Modal zoom (shows while mouse/touch is held) */}
      {zooming && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100000 }}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchEnd={stop}
          onClick={stop}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '90vw',
              maxHeight: '85vh',
              overflow: 'hidden',
              background: '#111',
              borderRadius: 8,
              boxShadow: '0 12px 28px rgba(0,0,0,0.35)'
            }}
          >
            <iframe
              title={`gfx-zoom-${Math.random().toString(36).slice(2)}`}
              src={url}
              style={{
                width: baseWidth,
                height: baseHeight,
                border: 0,
                display: 'block',
                transform: `scale(${modalScale})`,
                transformOrigin: 'top left',
                pointerEvents: 'none'
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
// Open Graphics picker modal;

// Open Graphics picker modal; fetch list for the current episode/item context
const openGraphicsModal = async (slotNumber) => {
  setGfxError("");
  setGfxLoading(true);
  setGfxModal({ open: true, slot: slotNumber });
  try {
    const resolvedEpisodeId = getEpisodeIdFromAnywhere(item, episodeId);
    let url = `${API_BASE_URL}/api/graphics`;
    if (resolvedEpisodeId != null) {
      url += `?episodeId=${encodeURIComponent(Number(resolvedEpisodeId))}`;
    }
    const res = await fetch(url);

    if (res.status === 404) {
      setGfxList([]);
      setGfxLoading(false);
      setGfxError("");
      return;
    }

    const ct = res.headers.get('Content-Type') || '';
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Graphics endpoint error (${res.status})`);
    }

    let list;
    if (ct.includes('application/json')) {
      list = await res.json();
    } else {
      list = [];
    }

    const rows = Array.isArray(list) ? list : (list?.rows || list?.data || []);
    const norm = (rows || []).map(normalizeGraphicRow).filter(r => r.id != null);
    setGfxList(norm);
  } catch (err) {
    console.warn('openGraphicsModal failed', err);
    setGfxError(err?.message || 'Failed to load graphics');
    setGfxList([]);
  } finally {
    setGfxLoading(false);
  }
};
const createAndOpenNewGraphic = async (slotNumber) => {
  // Open editor immediately in a pending state so UX is instant
  setGfxEditor({ open: true, graphicId: '__PENDING__', slot: slotNumber ?? gfxModal.slot ?? null });

  const epId = getEpisodeIdFromAnywhere(item, episodeId);
  if (epId == null || Number.isNaN(Number(epId))) {
    setGfxError('Missing episode_id; cannot create.');
    // Keep the picker open but close the pending editor since we can't proceed
    setGfxEditor({ open: false, graphicId: null, slot: null });
    return;
  }

  // Capture pre-existing IDs so we can diff after creation even if the server returns no body
  const preIds = new Set((gfxList || []).map(r => String(r.id)));

  setGfxLoading(true);
  setGfxError('');
  try {
    const res = await fetch(`${API_BASE_URL}/api/graphics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episode_id: Number(epId),
        episodeId: Number(epId),
        title: 'Untitled',
        type: 'lower-third',
        template_id: 'lower_third_v1',
        templateId: 'lower_third_v1',
        template_data: {},
        templateData: {}
      })
    });

    if (!res.ok) {
      const t = await res.text().catch(()=> '');
      throw new Error(t || `Create failed (${res.status})`);
    }

    // --- Try multiple strategies to get the new ID/row ---
    let createdRow = null;
    let createdId = null;

    // 1) Location header
    const location = res.headers.get('Location') || res.headers.get('location');
    if (location) {
      const parts = location.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last !== 'graphics') createdId = decodeURIComponent(last);
    }

    // 2) JSON body
    const ct = res.headers.get('Content-Type') || res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        const maybe = await res.json();
        if (maybe && typeof maybe === 'object') {
          createdRow = maybe;
          if (!createdId) {
            createdId = maybe.id || maybe.graphic_id || maybe.uuid || null;
          }
        }
      } catch (_) { /* ignore */ }
    } else {
      // 3) Text body (may just be the id)
      try {
        const txt = (await res.text()).trim();
        if (txt) {
          try {
            const parsed = JSON.parse(txt);
            if (parsed && typeof parsed === 'object') {
              createdRow = parsed;
              createdId = createdId || parsed.id || parsed.graphic_id || parsed.uuid || null;
            }
          } catch {
            // plain id or uuid-like
            createdId = createdId || txt;
          }
        }
      } catch (_) { /* ignore */ }
    }

    // 4) If still no row, but we have an id, fetch it
    if (!createdRow && createdId) {
      try {
        const r2 = await fetch(`${API_BASE_URL}/api/graphics/${encodeURIComponent(createdId)}`);
        if (r2.ok && (r2.headers.get('Content-Type') || '').includes('application/json')) {
          createdRow = await r2.json().catch(() => null);
        }
      } catch (_) { /* ignore */ }
    }

    // 5) Ultimate fallback: Diff the list by episode to find the newly inserted row
    if (!createdRow && !createdId) {
      try {
        let url = `${API_BASE_URL}/api/graphics?episodeId=${encodeURIComponent(Number(epId))}`;
        const r3 = await fetch(url);
        if (r3.ok) {
          const ct3 = r3.headers.get('Content-Type') || '';
          const list = ct3.includes('application/json') ? await r3.json() : [];
          const rows = Array.isArray(list) ? list : (list?.rows || list?.data || []);
          const norm = (rows || []).map(normalizeGraphicRow).filter(r => r.id != null);

          // Find the first ID that wasn't present before the POST
          const added = norm.find(r => !preIds.has(String(r.id)));
          if (added) {
            createdRow = rows.find(r => (r.id || r.graphic_id || r.uuid) === added.id) || added;
            createdId = added.id;
          }

          // Update our list state so the new item appears immediately
          if (norm.length) {
            setGfxList(norm);
          }
        }
      } catch (_) { /* ignore */ }
    }

    // Normalize and update local state
    let norm;
    if (createdRow) {
      norm = normalizeGraphicRow(createdRow);
      if (norm.id != null) {
        setGfxList(prev => {
          const exists = prev.some(r => r.id === norm.id);
          return exists ? prev.map(r => (r.id === norm.id ? { ...r, ...norm } : r)) : [norm, ...prev];
        });
      }
    } else if (createdId) {
      // Construct a minimal norm when only id is known
      norm = { id: createdId, type: 'Graphic', title: 'Untitled', summary: '', thumb: null };
      setGfxList(prev => {
        const exists = prev.some(r => r.id === norm.id);
        return exists ? prev : [norm, ...prev];
      });
    }

    if (!norm || !norm.id) {
      // Could not determine the new id; keep the picker open for safety and show a clear message.
      setGfxError('Graphic was created but no id was returned by the server. I could not locate it in the list either.');
      // Back out the pending editor so user isn\'t stuck
      setGfxEditor({ open: false, graphicId: null, slot: null });
      return;
    }

    // Assign the created graphic to this slot without triggering modal side-effects
    const resolvedSlot = slotNumber ?? gfxModal.slot ?? null;
    if (resolvedSlot != null) {
      setSelectedGraphicBySlot(prev => ({ ...prev, [resolvedSlot]: norm }));
    }

    // Swap the pending editor to the real id (keep it OPEN)
    setGfxEditor(prev => ({
      open: true,
      graphicId: norm.id,
      slot: resolvedSlot
    }));

    // Now close the picker cleanly
    setGfxModal({ open: false, slot: null });
  } catch (err) {
    console.warn('createAndOpenNewGraphic failed', err);
    setGfxError(err?.message || 'Failed to create graphic');
    // Close the pending editor on failure so the user isn't stuck on "Creating graphic…"
    setGfxEditor({ open: false, graphicId: null, slot: null });
  } finally {
    setGfxLoading(false);
  }
};

// --- Media picker functions
const openMediaPicker = (slotNumber) => {
  setMediaPickerModal({ open: true, slot: slotNumber });
};

const closeMediaPicker = () => {
  setMediaPickerModal({ open: false, slot: null });
};

const handleMediaSelected = (media) => {
  
  const slotNumber = mediaPickerModal.slot;
  if (slotNumber) {
    const defaultProperties = {
      loop: false,
      continue: false,
      audio: false,
      volume: 100,
      fadeIn: false,
      fadeOut: false
    };
    
    const mediaDataObject = {
      media: media,
      properties: defaultProperties
    };
    
    
    // Store the media selection with default properties in local state for UI
    setSelectedMediaBySlot(prev => ({
      ...prev,
      [slotNumber]: mediaDataObject
    }));
    
    // Find slot index for the hook's updateSlotMediaData function
    const slotIndex = (slots || []).findIndex(s => s && s.slot === slotNumber);
    
    
    if (slotIndex !== -1) {
      
      // Use the hook's function to update and persist the slot media data
      updateSlotMediaData(slotIndex, mediaDataObject);
      
      // Automatically set the genericType to Video when media is selected
      updateSlotGenericType(slotIndex, 'Video');
    }
  }
  closeMediaPicker();
};

const getSelectedMediaForSlot = (slotNumber) => {
  return selectedMediaBySlot[slotNumber] || null;
};

const updateMediaProperty = (slotNumber, property, value) => {
  // Update local state immediately
  setSelectedMediaBySlot(prev => ({
    ...prev,
    [slotNumber]: {
      ...prev[slotNumber],
      properties: {
        ...prev[slotNumber].properties,
        [property]: value
      }
    }
  }));
  
  // Find slot index and update through the hook
  const slotIndex = (slots || []).findIndex(s => s && s.slot === slotNumber);
  
  if (slotIndex !== -1 && slots[slotIndex].mediaData) {
    // Use the hook's function to update and persist the slot media data
    const updatedMediaData = {
      ...slots[slotIndex].mediaData,
      properties: {
        ...slots[slotIndex].mediaData.properties,
        [property]: value
      }
    };
    
    updateSlotMediaData(slotIndex, updatedMediaData);
  }
};

// --- YouTube picker functions
const openYouTubePicker = (slotNumber) => {
  setYoutubePickerModal({ open: true, slot: slotNumber });
};

const closeYouTubePicker = () => {
  setYoutubePickerModal({ open: false, slot: null });
};

const handleYouTubeSelected = (youtubeData) => {
  
  const slotNumber = youtubePickerModal.slot;
  if (slotNumber) {
    const defaultProperties = {
      autoplay: false,
      continue: false,
      audio: false,
      volume: 100,
      fadeIn: false,
      fadeOut: false
    };
    
    const youtubeDataObject = {
      youtube: youtubeData,
      properties: defaultProperties
    };
    
    
    // Store the YouTube selection with default properties in local state for UI
    setSelectedYouTubeBySlot(prev => ({
      ...prev,
      [slotNumber]: youtubeDataObject
    }));
    
    // Find slot index for the hook's updateSlotMediaData function
    const slotIndex = (slots || []).findIndex(s => s && s.slot === slotNumber);
    
    
    if (slotIndex !== -1) {
      
      // Use the hook's function to update and persist the slot YouTube data
      updateSlotMediaData(slotIndex, youtubeDataObject);
      
      // Automatically set the genericType to YouTube when YouTube is selected
      updateSlotGenericType(slotIndex, 'YouTube');
    }
  }
  closeYouTubePicker();
};

const getSelectedYouTubeForSlot = (slotNumber) => {
  return selectedYouTubeBySlot[slotNumber] || null;
};

const updateYouTubeProperty = (slotNumber, property, value) => {
  // Update local state immediately
  setSelectedYouTubeBySlot(prev => ({
    ...prev,
    [slotNumber]: {
      ...prev[slotNumber],
      properties: {
        ...prev[slotNumber].properties,
        [property]: value
      }
    }
  }));
  
  // Find slot index and update through the hook
  const slotIndex = (slots || []).findIndex(s => s && s.slot === slotNumber);
  
  if (slotIndex !== -1 && slots[slotIndex].mediaData) {
    // Use the hook's function to update and persist the slot YouTube data
    const updatedYouTubeData = {
      ...slots[slotIndex].mediaData,
      properties: {
        ...slots[slotIndex].mediaData.properties,
        [property]: value
      }
    };
    
    updateSlotMediaData(slotIndex, updatedYouTubeData);
  }
};

// --- PDF/Image picker functions
const openPdfImagePicker = (slotNumber) => {
  setPdfImagePickerModal({ open: true, slot: slotNumber });
};

const closePdfImagePicker = () => {
  setPdfImagePickerModal({ open: false, slot: null });
};

const handlePdfImageSelected = (media) => {
  
  const slotNumber = pdfImagePickerModal.slot;
  if (slotNumber) {
    const defaultProperties = {
      fitMode: 'fit', // fit, fill, stretch, center
      opacity: 100,
      rotation: 0, // 0, 90, 180, 270
      offsetX: 0,
      offsetY: 0,
      zoom: 100,
      page: 1 // For PDFs
    };
    
    const pdfImageDataObject = {
      pdfImage: media,
      properties: defaultProperties
    };
    
    
    // Store the PDF/Image selection with default properties in local state for UI
    setSelectedPdfImageBySlot(prev => ({
      ...prev,
      [slotNumber]: pdfImageDataObject
    }));
    
    // Find slot index for the hook's updateSlotMediaData function
    const slotIndex = (slots || []).findIndex(s => s && s.slot === slotNumber);
    
    
    if (slotIndex !== -1) {
      
      // Use the hook's function to update and persist the slot PDF/Image data
      updateSlotMediaData(slotIndex, pdfImageDataObject);
      
      // Automatically set the genericType to PDF/Image when PDF/Image is selected
      updateSlotGenericType(slotIndex, 'PDF/Image');
    }
  }
  closePdfImagePicker();
};

const getSelectedPdfImageForSlot = (slotNumber) => {
  return selectedPdfImageBySlot[slotNumber] || null;
};

const updatePdfImageProperty = (slotNumber, property, value) => {
  // Update local state immediately
  setSelectedPdfImageBySlot(prev => ({
    ...prev,
    [slotNumber]: {
      ...prev[slotNumber],
      properties: {
        ...prev[slotNumber].properties,
        [property]: value
      }
    }
  }));
  
  // Find slot index and update through the hook
  const slotIndex = (slots || []).findIndex(s => s && s.slot === slotNumber);
  
  if (slotIndex !== -1 && slots[slotIndex].mediaData) {
    // Use the hook's function to update and persist the slot PDF/Image data
    const updatedPdfImageData = {
      ...slots[slotIndex].mediaData,
      properties: {
        ...slots[slotIndex].mediaData.properties,
        [property]: value
      }
    };
    
    updateSlotMediaData(slotIndex, updatedPdfImageData);
  }
};

const closeGraphicsModal = () => setGfxModal({ open: false, slot: null });

const pickGraphicForSlot = (slotNumber, row) => {

  // Update the actual slot data instead of separate state
  const slotIndex = slots.findIndex(s => s.slot === slotNumber);

  if (slotIndex >= 0) {
    // Store the graphic ID in the slot's selectedSource field
    const graphicSource = `GRAPHIC:${row.id}`;
    updateSlotSource(slotIndex, graphicSource);
    
    // Automatically set the genericType to Graphics when a graphic is selected
    updateSlotGenericType(slotIndex, 'Graphics');
  }

  // Keep the selectedGraphicBySlot for UI convenience but don't rely on it for persistence
  setSelectedGraphicBySlot(prev => ({ ...prev, [slotNumber]: row }));

  closeGraphicsModal();
};

// Get the selected graphic for a slot from actual slot data
const getSelectedGraphicForSlot = (slotNumber) => {
  
  // First check ephemeral state (for immediate UI feedback)
  const ephemeral = selectedGraphicBySlot[slotNumber];
  if (ephemeral) return ephemeral;
  
  // Then check persisted slot data
  const slot = slots.find(s => s.slot === slotNumber);
  
  if (slot?.selectedSource?.startsWith('GRAPHIC:')) {
    const graphicId = slot.selectedSource.replace('GRAPHIC:', '');
    
    // Try to find the graphic in our loaded list
    const graphic = gfxList.find(g => g.id === graphicId);
    if (graphic) return graphic;
    
    // If not found in list, try to fetch it
    
    // If not found in list, return minimal data
    return {
      id: graphicId,
      title: 'Loading...',
      type: 'Graphic',
      summary: '',
      thumb: null
    };
  }
  
  return null;
};


  const removeSourceFromScene = useCallback(async (sceneName, sourceName) => {
    if (!sceneName || !sourceName) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/obs/remove-source-from-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneName, sourceName })
      });
      if (!res.ok) throw new Error(await res.text());
      return true;
    } catch (err) {
      console.warn('removeSourceFromScene failed', err);
      return false;
    }
  }, []);

  const pastePlaceholderTransform = useCallback(async ({ sceneName, placeholderIndex, placeholderId, targetSourceName }) => {
    if (!sceneName || !targetSourceName || (placeholderIndex == null && !placeholderId)) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/obs/paste-placeholder-transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneName, placeholderIndex, placeholderId, targetSourceName })
      });
      if (!res.ok) throw new Error(await res.text());
      return true;
    } catch (err) {
      console.warn('pastePlaceholderTransform failed', err);
      toast.error('Failed to apply placeholder transform');
      return false;
    }
  }, [toast]);

  const setField = (path, value, save = true) => {
    
    setData(prev => {
      const next = structuredClone(prev);
      // tiny path setter
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;


      if (save) {
        // Save only scene data (no slots)
        const { slots: _, ...sceneData } = next;
        debouncedSaveSceneData(sceneData);
      }

      return next;
    });
  };

  // validation: if scene/source missing → revert to empty and toast (called onBlur)
  const validateSource = (slotIndex) => {
    const slot = slots[slotIndex];
    const name = slot?.selectedSource || "";
    if (!name) return;
    
    const ok = videoSources.some(s => s.name === name);
    if (!ok) {
      toast.error(`Source no longer exists: ${name}`);
      updateSlotSource(slotIndex, "");
    }
  };

  const transitionNeedsDuration = (t) => t && t.toLowerCase() !== "cut";

  const activeCgChannel = useMemo(() => {
    for (const s of slots) {
      const name = String(s?.selectedSource || "");
      const m = name.match(/^CG-(\d+)$/i);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }, [slots]);

  // Compute the active placeholder index used for transform pasting
  const activePlaceholderIndex = useMemo(() => {
    if (!activeCgChannel) return null;
    const idx = slots.findIndex(s => {
      const m = String(s?.selectedSource || "").match(/^CG-(\d+)$/i);
      return m && parseInt(m[1], 10) === activeCgChannel;
    });
    return idx === -1 ? null : idx;
  }, [activeCgChannel, slots]);

  const activePlaceholderRect = useMemo(() => {
    if (!activeCgChannel || activePlaceholderIndex == null) return null;

    const spRect = slots[activePlaceholderIndex]?.sourceProps?.placeholder || null;
    if (spRect && typeof spRect.x === "number" && typeof spRect.y === "number") {
      return spRect;
    }
    const ph = orderedPlaceholders[activePlaceholderIndex];
    if (!ph) return null;
    return {
      x: (ph?.rect?.x ?? ph?.transform?.positionX ?? 0),
      y: (ph?.rect?.y ?? ph?.transform?.positionY ?? 0),
      w: (ph?.rect?.w ?? 0),
      h: (ph?.rect?.h ?? 0),
    };
  }, [activeCgChannel, activePlaceholderIndex, slots, orderedPlaceholders]);

  const sceneForUi = normalizeSceneName(data.scene);
  const scaleX = (imgSize?.width && baseDims?.width) ? (imgSize.width / baseDims.width) : 1;
  const scaleY = (imgSize?.height && baseDims?.height) ? (imgSize.height / baseDims.height) : scaleX;

  // Callback to trigger backend copy/paste transform operation
  const fitActiveCgToPlaceholder = useCallback(async () => {
    if (!sceneForUi || !activeCgChannel || activePlaceholderIndex == null) return;
    const phId = orderedPlaceholders[activePlaceholderIndex]?.sceneItemId ?? null;
    const targetSourceName = `CG-${activeCgChannel}`;
    try {
      await pastePlaceholderTransform({
        sceneName: sceneForUi,
        placeholderIndex: activePlaceholderIndex + 1,
        placeholderId: phId,
        targetSourceName,
      });
    } catch (err) {
      console.warn('fitActiveCgToPlaceholder failed', err);
      toast.error('Failed to fit CG to placeholder');
    }
  }, [sceneForUi, activeCgChannel, activePlaceholderIndex, orderedPlaceholders, pastePlaceholderTransform]);

  // Track last applied per slot so we can remove when the selection changes
  const lastAppliedBySlotRef = useRef({});

  // EFFECT (runtime/applyToObs): in edit mode this short-circuits and only broadcasts a plan event.
  // Auto-manage placeholder replacements for ANY source selection (not just CG-#)
  useEffect(() => {
    if (!applyToObs) {
      // In edit mode, broadcast the desired plan (no side-effects). Runtime listener applies it on preview.
      // Consumers can subscribe to 'rundown:slots-plan' to know what to apply when this cue is previewed.
      try {
        window.dispatchEvent(new CustomEvent('rundown:slots-plan', {
          detail: {
            itemId,
            sceneName: sceneForUi,
            placeholders: orderedPlaceholders.map((ph, idx) => ({
              index: idx + 1,
              sceneItemId: ph?.sceneItemId ?? null
            })),
            slots: Array.isArray(slots) ? slots : []
          }
        }));
      } catch (_) { /* no-op in non-DOM envs */ }
      return; // prevent any OBS mutations in edit mode
    }
    const sceneName = sceneForUi;
    if (!sceneName || !orderedPlaceholders?.length) return;

    const run = async () => {
      const slotsArr = Array.isArray(slots) ? slots : [];
      for (let i = 0; i < slotsArr.length; i++) {
        const slot = slotsArr[i];
        if (!slot?.replaceable) continue;

        const selected = String(slot?.selectedSource || '');
        const ph = orderedPlaceholders[i];
        const placeholderId = ph?.sceneItemId ?? null;
        const placeholderIndex = i + 1; // 1-based for backend

        const prev = lastAppliedBySlotRef.current[slot.slot];

        try {
          // CASE 1: Selection cleared -> remove previously inserted source (if any)
          if (!selected) {
            if (prev) {
              await fetch(`${API_BASE_URL}/api/obs/remove-source-from-scene`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sceneName, sourceName: prev })
              }).catch(() => {});
              delete lastAppliedBySlotRef.current[slot.slot];
            }
            continue;
          }

          // CASE 2: Changed to a different source -> do atomic replace+paste on the backend
          if (prev && prev !== selected) {
            const res = await fetch(`${API_BASE_URL}/api/obs/replace-with-placeholder-transform`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sceneName,
                placeholderIndex,
                placeholderId,
                targetSourceName: selected,
                removeSourceName: prev,
                pushToTop: true,
              })
            });
            if (!res.ok) {
              // Fall back to manual remove/add if the endpoint isn't available
              await fetch(`${API_BASE_URL}/api/obs/remove-source-from-scene`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sceneName, sourceName: prev })
              }).catch(() => {});
              // await ensureSourceInScene(sceneName, selected);
              await pastePlaceholderTransform({
                sceneName,
                placeholderIndex,
                placeholderId,
                targetSourceName: selected,
              });
            }
            lastAppliedBySlotRef.current[slot.slot] = selected;
            continue;
          }

          // CASE 3: First-time apply or unchanged -> ensure present and (re)apply the transform
          // await ensureSourceInScene(sceneName, selected);
          await pastePlaceholderTransform({
            sceneName,
            placeholderIndex,
            placeholderId,
            targetSourceName: selected,
          });
          lastAppliedBySlotRef.current[slot.slot] = selected;
        } catch (err) {
          console.warn('auto-manage placeholder failed', err);
        }
      }
    };

    run();
  }, [sceneForUi, slots, orderedPlaceholders, pastePlaceholderTransform, applyToObs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, background: "#fafdff", padding: 16, borderRadius: 8 }}>
      {/* BASICS */}
      <details open style={{ background: "#f8fbff", border: "1px solid #e1e6ec", borderRadius: 8, padding: 12 }}>
        <summary style={{ fontWeight: 600, color: "#1976d2", cursor: "pointer", marginBottom: 8 }}>Basics</summary>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
          <label style={{ fontWeight: 600, color: "#222" }}>Transition</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={data.transition?.type || "cut"}
              onChange={(e) => setField("transition.type", e.target.value)}
              style={{ 
                padding: "6px 10px", 
                border: "1px solid #b1c7e7", 
                borderRadius: 6, 
                background: "#fff",
                color: "#222"
              }}
            >
              <option value="cut">Cut</option>
              <option value="fade">Fade</option>
              <option value="wipe">Wipe</option>
              <option value="stinger">Stinger</option>
            </select>
            {transitionNeedsDuration(data.transition?.type) && (
              <>
                <label style={{ alignSelf: "center", fontWeight: 600, color: "#222", fontSize: 14 }}>Duration (s)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={data.transition?.durationSec ?? 0}
                  onChange={(e) => setField("transition.durationSec", Number(e.target.value))}
                  style={{ 
                    width: 90, 
                    padding: "6px 8px", 
                    border: "1px solid #b1c7e7", 
                    borderRadius: 6, 
                    background: "#fff",
                    color: "#222"
                  }}
                />
              </>
            )}
          </div>
        </div>
      </details>

      {/* SCENE */}
      <details open style={{ background: "#f8fbff", border: "1px solid #e1e6ec", borderRadius: 8, padding: 12 }}>
        <summary style={{ fontWeight: 600, color: "#1976d2", cursor: "pointer", marginBottom: 8 }}>Scene</summary>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
          <label style={{ fontWeight: 600, color: "#222" }}>OBS Scene</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ 
              padding: "6px 10px", 
              background: "#e3f2fd", 
              borderRadius: 6, 
              color: "#1976d2",
              border: "1px solid #b1c7e7",
              fontFamily: "monospace",
              fontSize: 14
            }}>
              {sceneForUi || "(not set)"}
            </code>
            <button
              type="button"
              onClick={() => loadSceneLayout({ silent: false, retries: 0, width: 720 })}
              disabled={!data.scene || loadingScene}
              style={{
                background: "#e3f2fd",
                border: "1px solid #b1c7e7",
                color: "#1976d2",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 14,
                fontWeight: 600,
                cursor: (!data.scene || loadingScene) ? "not-allowed" : "pointer",
                opacity: (!data.scene || loadingScene) ? 0.6 : 1
              }}
            >
              {loadingScene ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div style={{ gridColumn: "1 / -1", marginTop: 12 }}>
            {loadingScene ? (
              <div style={{ color: "#777", fontStyle: "italic", padding: 8 }}>Loading scene layout…</div>
            ) : screenshot ? (
              <div
                ref={wrapperRef}
                style={{ position: "relative", display: "block", width: "100%" }}
              >
                <img
                  ref={imgRef}
                  src={screenshot}
                  alt={`Preview of ${sceneForUi}`}
                  style={{ width: "100%", border: "1px solid #ddd", borderRadius: 6, display: "block" }}
                  onLoad={() => {
                    const wrapEl = wrapperRef.current;
                    const imgEl = imgRef.current;
                    const w = (wrapEl?.clientWidth || imgEl?.clientWidth || imgEl?.naturalWidth || 0);
                    const ratio = (baseDims?.width && baseDims?.height) ? (baseDims.height / baseDims.width) : (imgEl?.naturalHeight && imgEl?.naturalWidth ? (imgEl.naturalHeight / imgEl.naturalWidth) : (1080 / 1920));
                    const h = Math.round(w * ratio);
                    setImgSize({ width: w, height: h });
                  }}
                />
                {orderedPlaceholders.map((ph, idx) => {
                  const rawX = (ph?.rect?.x ?? ph?.transform?.positionX ?? 0);
                  const rawY = (ph?.rect?.y ?? ph?.transform?.positionY ?? 0);
                  const x = rawX * scaleX + 4; // small offset so it doesn't hug the corner
                  const y = rawY * scaleY + 4;
                  const slot = (slots || [])[idx] || {};
                  const picked = getSelectedGraphicForSlot(slot.slot);
                  const selectedMedia = getSelectedMediaForSlot(slot.slot);
                  const selectedYouTube = getSelectedYouTubeForSlot(slot.slot);
                  const selectedPdfImage = getSelectedPdfImageForSlot(slot.slot);
                  const uiType = genericTypesBySlot[slot.slot] ?? 'None';
                  let labelText;
                  if (uiType === 'Graphics' && picked) {
                    labelText = `#${idx + 1}-Graphics-${picked.title || picked.id}`;
                  } else if (uiType === 'Graphics') {
                    labelText = `#${idx + 1}-Graphics-(unassigned)`;
                  } else if (uiType === 'Video' && selectedMedia) {
                    const mediaName = selectedMedia.media.displayName || selectedMedia.media.name || selectedMedia.media.filename || 'Unknown';
                    labelText = `#${idx + 1}-Video-${mediaName}`;
                  } else if (uiType === 'Video') {
                    labelText = `#${idx + 1}-Video-(unassigned)`;
                  } else if (uiType === 'YouTube' && selectedYouTube) {
                    const youtubeTitle = selectedYouTube.youtube.title || `YouTube (${selectedYouTube.youtube.videoId})`;
                    labelText = `#${idx + 1}-YouTube-${youtubeTitle}`;
                  } else if (uiType === 'YouTube') {
                    labelText = `#${idx + 1}-YouTube-(unassigned)`;
                  } else if (uiType === 'PDF/Image' && selectedPdfImage) {
                    const pdfImageName = selectedPdfImage.pdfImage.displayName || selectedPdfImage.pdfImage.name || selectedPdfImage.pdfImage.filename || 'Unknown';
                    const fileType = selectedPdfImage.pdfImage.type === 'image' ? 'Image' : 'PDF';
                    labelText = `#${idx + 1}-${fileType}-${pdfImageName}`;
                  } else if (uiType === 'PDF/Image') {
                    labelText = `#${idx + 1}-PDF/Image-(unassigned)`;
                  } else if (slot.selectedSource) {
                    labelText = `#${idx + 1} — ${String(slot.selectedSource)}`;
                  } else if (uiType === 'Existing Source') {
                    labelText = `#${idx + 1} — Existing Source (none)`;
                  } else {
                    labelText = `#${idx + 1} — choose source`;
                  }

                  return (
                    <div
                      key={`ph-${idx}`}
                      style={{
                        position: "absolute",
                        left: x,
                        top: y,
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 12,
                        lineHeight: 1.4,
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.35)"
                      }}
                    >
                      {labelText}
                    </div>
                  );
                })}
              </div>
            ) : sceneForUi ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#777", fontStyle: "italic", padding: 8 }}>
                <span>No preview available.</span>
                <button
                  type="button"
                  onClick={() => loadSceneLayout({ silent: false, retries: 2, width: 720 })}
                  disabled={loadingScene}
                  style={{
                    background: "#e3f2fd",
                    border: "1px solid #b1c7e7",
                    color: "#1976d2",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loadingScene ? "not-allowed" : "pointer",
                    opacity: loadingScene ? 0.6 : 1
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </details>

      {/* SLOTS */}
      <details open style={{ background: "#f8fbff", border: "1px solid #e1e6ec", borderRadius: 8, padding: 12 }}>
        <summary style={{ fontWeight: 600, color: "#1976d2", cursor: "pointer", marginBottom: 8 }}>Slots</summary>
        {!data.scene && <div style={{ color: "#777", marginTop: 8, padding: 8, fontStyle: "italic" }}>Select a scene to configure slots.</div>}
        {data.scene && (slots || []).length === 0 && (
          <div style={{ color: "#777", marginTop: 8, padding: 8, fontStyle: "italic" }}>No placeholders detected in this scene.</div>
        )}
        {data.scene && slots.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {userObsSources.length !== videoSources.length && (
              <div style={{ color: '#777', fontSize: 12, padding: 8, background: "#e3f2fd", borderRadius: 6, border: "1px solid #b1c7e7" }}>
                Showing {userObsSources.length} OBS sources (system sources hidden)
              </div>
            )}
            {slots.map((slot, idx) => (
              <div key={slot.slot} style={{ 
                padding: 16, 
                background: "#fff",
                border: "1px solid #e1e6ec",
                borderRadius: 8
              }}>
                {/* Slot Header */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 12, 
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid #f0f0f0"
                }}>
                  <div style={{ fontWeight: 600, color: "#1976d2", fontSize: 16 }}>#{slot.slot}</div>
                  <div style={{ 
                    padding: "4px 8px", 
                    borderRadius: 4, 
                    fontSize: 12,
                    fontWeight: 600,
                    background: slot.replaceable ? "#e8f5e8" : "#ffeaa7",
                    color: slot.replaceable ? "#2d8f3a" : "#b8860b",
                    border: slot.replaceable ? "1px solid #81c784" : "1px solid #ffcc02"
                  }}>
                    {slot.replaceable ? "Replaceable" : "Fixed"}
                  </div>
                </div>
                {!slot.replaceable && (
                  <SlotSelector
                    slot={slot}
                    slotIndex={idx}
                    videoSources={userObsSources}
                    onUpdate={updateSlotSource}
                    onValidate={validateSource}
                  />
                )}
                {slot.replaceable && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Derived type hint */}
                    {(genericTypesBySlot[slot.slot] ?? 'None') === 'None' && (
                      <div style={{ 
                        color: '#777', 
                        fontSize: 12, 
                        fontStyle: 'italic',
                        padding: 8,
                        background: '#f8f9fa',
                        borderRadius: 4,
                        border: '1px solid #e9ecef'
                      }}>
                        <em>Derived type: {deriveSlotType(slot)}</em>
                      </div>
                    )}

                    {/* Generic Type Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>Content Type</label>
                      <select
                        value={genericTypesBySlot[slot.slot] ?? 'None'}
                        onChange={(e) => setGenericTypeForSlot(slot.slot, e.target.value)}
                        style={{ 
                          padding: "8px 12px", 
                          border: "1px solid #b1c7e7", 
                          borderRadius: 6, 
                          background: "#fff",
                          color: "#222",
                          fontSize: 14,
                          maxWidth: 280
                        }}
                      >
                        <option value="Existing Source">Existing Source</option>
                        <option value="Graphics">Graphics</option>
                        <option value="Video">Video</option>
                        <option value="YouTube">YouTube</option>
                        <option value="PDF/Image">PDF/Image</option>
                        <option value="None">None</option>
                      </select>
                    </div>

                    {/* Content-specific options */}
                    {(genericTypesBySlot[slot.slot] ?? 'None') === 'Existing Source' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>OBS Source</label>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <select
                            value={slot.selectedSource || ''}
                            onChange={(e) => updateSlotSource(idx, e.target.value)}
                            style={{ 
                              flex: 1,
                              maxWidth: 280,
                              padding: "8px 12px", 
                              border: "1px solid #b1c7e7", 
                              borderRadius: 6, 
                              background: "#fff",
                              color: "#222",
                              fontSize: 14
                            }}
                          >
                            <option value="">(none)</option>
                            {userObsSources.map(s => (
                              <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                          {slot.selectedSource && (
                            <button 
                              type="button" 
                              onClick={() => updateSlotSource(idx, '')} 
                              style={{
                                background: "#fff2e0",
                                border: "1px solid #ff9800",
                                color: "#e65100",
                                borderRadius: 6,
                                padding: "6px 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {(genericTypesBySlot[slot.slot] ?? 'None') === 'Graphics' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>Graphics</label>
                        
                        {(() => {
                          const selectedGraphic = getSelectedGraphicForSlot(slot.slot);
                          return (
                            <>
                              {selectedGraphic ? (
                                // Selected Graphic Display
                                <div style={{
                                  background: '#f8fbff',
                                  border: '1px solid #b1c7e7',
                                  borderRadius: 8,
                                  padding: 12
                                }}>
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{
                                      width: 128,
                                      height: 72,
                                      background: '#e3f2fd',
                                      borderRadius: 4,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid #b1c7e7',
                                      flexShrink: 0
                                    }}>
                                      {(() => {
                                        const url = buildGraphicsPreviewUrl(selectedGraphic);
                                        return url ? (
                                          <HoldToZoomModalPreview url={url} containerWidth={128} containerHeight={72} />
                                        ) : (
                                          <span style={{ fontSize: 10, color: '#1976d2', fontWeight: 600 }}>GFX</span>
                                        );
                                      })()}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontSize: 14, 
                                        fontWeight: 600, 
                                        color: '#1976d2',
                                        marginBottom: 4
                                      }}>
                                        {selectedGraphic.title}
                                      </div>
                                      <div style={{ 
                                        fontSize: 12, 
                                        color: '#666',
                                        marginBottom: 6
                                      }}>
                                        {selectedGraphic.type}
                                      </div>
                                      {selectedGraphic.summary && (
                                        <div style={{ 
                                          fontSize: 12, 
                                          color: '#333',
                                          fontStyle: 'italic'
                                        }}>
                                          {selectedGraphic.summary}
                                        </div>
                                      )}
                                    </div>

                                    {/* Edit Button */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => openGraphicEditor(selectedGraphic, slot.slot)}
                                        style={{
                                          background: "#f3e5f5",
                                          border: "1px solid #9c27b0",
                                          color: "#6a1b99",
                                          borderRadius: 6,
                                          padding: "6px 12px",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          flexShrink: 0
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const slotIndex = slots.findIndex(s => s.slot === slot.slot);
                                          if (slotIndex >= 0) {
                                            updateSlotSource(slotIndex, "");
                                          }
                                          setSelectedGraphicBySlot(prev => {
                                            const updated = { ...prev };
                                            delete updated[slot.slot];
                                            return updated;
                                          });
                                        }}
                                        style={{
                                          background: "#fff2e0",
                                          border: "1px solid #ff9800",
                                          color: "#e65100",
                                          borderRadius: 6,
                                          padding: "6px 12px",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          flexShrink: 0
                                        }}
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                // No Graphic Selected State
                                <div style={{
                                  background: '#f8f9fa',
                                  border: '1px dashed #ddd',
                                  borderRadius: 8,
                                  padding: 16,
                                  textAlign: 'center',
                                  color: '#777',
                                  fontStyle: 'italic'
                                }}>
                                  No graphic selected
                                </div>
                              )}

                              <button 
                                type="button" 
                                onClick={() => openGraphicsModal(slot.slot)}
                                style={{
                                  background: "#e3f2fd",
                                  border: "1px solid #b1c7e7",
                                  color: "#1976d2",
                                  borderRadius: 8,
                                  padding: "10px 16px",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  alignSelf: 'flex-start'
                                }}
                              >
                                {selectedGraphic ? 'Change Graphic' : 'Pick Graphic'}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {(genericTypesBySlot[slot.slot] ?? 'None') === 'Video' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>Video Content</label>
                        
                        {(() => {
                          const selectedMedia = getSelectedMediaForSlot(slot.slot);
                          return (
                            <>
                              {selectedMedia ? (
                                // Selected Media Display
                                <div style={{
                                  background: '#f8fbff',
                                  border: '1px solid #b1c7e7',
                                  borderRadius: 8,
                                  padding: 12
                                }}>
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{
                                      width: 80,
                                      height: 45,
                                      background: '#e3f2fd',
                                      borderRadius: 4,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid #b1c7e7',
                                      flexShrink: 0
                                    }}>
                                      {selectedMedia.media.type === 'video' ? (
                                        <video
                                          src={`${API_BASE_URL}/media/${selectedMedia.media.filename}`}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                          }}
                                          muted
                                        />
                                      ) : selectedMedia.media.type === 'image' && selectedMedia.media.thumb ? (
                                        <img
                                          src={`${API_BASE_URL}/media/thumbs/${selectedMedia.media.thumb}`}
                                          alt={selectedMedia.media.displayName}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                          }}
                                        />
                                      ) : (
                                        <span style={{ fontSize: 10, color: '#1976d2', fontWeight: 600 }}>
                                          {selectedMedia.media.type?.toUpperCase() || 'MEDIA'}
                                        </span>
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontSize: 14, 
                                        fontWeight: 600, 
                                        color: '#1976d2',
                                        marginBottom: 4
                                      }}>
                                        {selectedMedia.media.displayName || selectedMedia.media.name || selectedMedia.media.filename}
                                      </div>
                                      <div style={{ 
                                        fontSize: 12, 
                                        color: '#666',
                                        marginBottom: 6
                                      }}>
                                        {selectedMedia.media.type} 
                                        {selectedMedia.media.duration && ` • ${Math.floor(selectedMedia.media.duration / 60)}:${(selectedMedia.media.duration % 60).toString().padStart(2, '0')}`}
                                      </div>
                                      
                                      {/* Properties Summary */}
                                      <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                                        {Object.entries(selectedMedia.properties).filter(([key, value]) => {
                                          if (key === 'volume') return selectedMedia.properties.audio && value !== 100;
                                          return value === true;
                                        }).map(([key, value]) => {
                                          if (key === 'volume') return `Volume: ${value}%`;
                                          return key.charAt(0).toUpperCase() + key.slice(1);
                                        }).join(' • ') || 'Default settings'}
                                      </div>
                                      
                                      {/* Properties Controls */}
                                      <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 8,
                                        fontSize: 12
                                      }}>
                                        {/* Playback Controls */}
                                        <div>
                                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginBottom: 4 }}>
                                            <input
                                              type="checkbox"
                                              checked={selectedMedia.properties.loop}
                                              onChange={(e) => updateMediaProperty(slot.slot, 'loop', e.target.checked)}
                                              style={{ margin: 0 }}
                                            />
                                            <span>Loop</span>
                                          </label>
                                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                            <input
                                              type="checkbox"
                                              checked={selectedMedia.properties.continue}
                                              onChange={(e) => updateMediaProperty(slot.slot, 'continue', e.target.checked)}
                                              style={{ margin: 0 }}
                                            />
                                            <span>Continue</span>
                                          </label>
                                        </div>
                                        
                                        {/* Audio Controls */}
                                        <div>
                                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginBottom: 4 }}>
                                            <input
                                              type="checkbox"
                                              checked={selectedMedia.properties.audio}
                                              onChange={(e) => updateMediaProperty(slot.slot, 'audio', e.target.checked)}
                                              style={{ margin: 0 }}
                                            />
                                            <span>Audio</span>
                                          </label>
                                          {selectedMedia.properties.audio && (
                                            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ minWidth: 30 }}>{selectedMedia.properties.volume}%</span>
                                                <input
                                                  type="range"
                                                  min="0"
                                                  max="100"
                                                  value={selectedMedia.properties.volume}
                                                  onChange={(e) => updateMediaProperty(slot.slot, 'volume', parseInt(e.target.value))}
                                                  style={{ flex: 1, height: 16 }}
                                                />
                                              </div>
                                              <div style={{ display: 'flex', gap: 8 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedMedia.properties.fadeIn}
                                                    onChange={(e) => updateMediaProperty(slot.slot, 'fadeIn', e.target.checked)}
                                                    style={{ margin: 0, width: 12, height: 12 }}
                                                  />
                                                  <span>Fade In</span>
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedMedia.properties.fadeOut}
                                                    onChange={(e) => updateMediaProperty(slot.slot, 'fadeOut', e.target.checked)}
                                                    style={{ margin: 0, width: 12, height: 12 }}
                                                  />
                                                  <span>Fade Out</span>
                                                </label>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Clear Button */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Clear local state
                                          setSelectedMediaBySlot(prev => {
                                            const updated = { ...prev };
                                            delete updated[slot.slot];
                                            return updated;
                                          });
                                          
                                          // Find slot index and clear media data through the hook
                                          const slotIndex = (slots || []).findIndex(s => s && s.slot === slot.slot);
                                          
                                          if (slotIndex !== -1) {
                                            // Use the hook's function to clear media data
                                            updateSlotMediaData(slotIndex, undefined);
                                          }
                                        }}
                                        style={{
                                          background: "#fff2e0",
                                          border: "1px solid #ff9800",
                                          color: "#e65100",
                                          borderRadius: 6,
                                          padding: "6px 12px",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          flexShrink: 0
                                        }}
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                // No Media Selected State
                                <div style={{
                                  background: '#f8f9fa',
                                  border: '1px dashed #ddd',
                                  borderRadius: 8,
                                  padding: 16,
                                  textAlign: 'center',
                                  color: '#777',
                                  fontStyle: 'italic'
                                }}>
                                  No media selected
                                </div>
                              )}

                              <button 
                                type="button" 
                                onClick={() => openMediaPicker(slot.slot)}
                                style={{
                                  background: "#e3f2fd",
                                  border: "1px solid #b1c7e7",
                                  color: "#1976d2",
                                  borderRadius: 8,
                                  padding: "10px 16px",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  alignSelf: 'flex-start'
                                }}
                              >
                                {selectedMedia ? 'Change Media' : 'Select Media'}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {(genericTypesBySlot[slot.slot] ?? 'None') === 'YouTube' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>YouTube Content</label>
                        
                        {(() => {
                          const selectedYouTube = getSelectedYouTubeForSlot(slot.slot);
                          return (
                            <>
                              {selectedYouTube ? (
                                // Selected YouTube Display
                                <div style={{
                                  background: '#f8fbff',
                                  border: '1px solid #b1c7e7',
                                  borderRadius: 8,
                                  padding: 12
                                }}>
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{
                                      width: 80,
                                      height: 45,
                                      background: '#ff0000',
                                      borderRadius: 4,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid #b1c7e7',
                                      flexShrink: 0,
                                      backgroundImage: `url(${selectedYouTube.youtube.thumbnail})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                      position: 'relative'
                                    }}>
                                      {/* YouTube Play Icon Overlay */}
                                      <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        color: 'white',
                                        fontSize: 16,
                                        fontWeight: 'bold'
                                      }}>
                                        ▶
                                      </div>
                                    </div>
                                    
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontWeight: 600, 
                                        fontSize: 13, 
                                        color: '#333',
                                        wordBreak: 'break-word'
                                      }}>
                                        {selectedYouTube.youtube.title}
                                      </div>
                                      <div style={{ 
                                        fontSize: 11, 
                                        color: '#666',
                                        marginTop: 2
                                      }}>
                                        YouTube Video ID: {selectedYouTube.youtube.videoId}
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => openYouTubePicker(slot.slot)}
                                        style={{
                                          background: "#e3f2fd",
                                          border: "1px solid #b1c7e7",
                                          color: "#1976d2",
                                          borderRadius: 6,
                                          padding: "6px 12px",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          flexShrink: 0
                                        }}
                                      >
                                        Change
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Clear local state
                                          setSelectedYouTubeBySlot(prev => {
                                            const updated = { ...prev };
                                            delete updated[slot.slot];
                                            return updated;
                                          });
                                          
                                          // Find slot index and clear YouTube data through the hook
                                          const slotIndex = (slots || []).findIndex(s => s && s.slot === slot.slot);
                                          
                                          if (slotIndex !== -1) {
                                            // Use the hook's function to clear YouTube data
                                            updateSlotMediaData(slotIndex, undefined);
                                          }
                                        }}
                                        style={{
                                          background: "#fff2e0",
                                          border: "1px solid #ff9800",
                                          color: "#e65100",
                                          borderRadius: 6,
                                          padding: "6px 12px",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          flexShrink: 0
                                        }}
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </div>

                                  {/* YouTube Properties */}
                                  <div style={{ 
                                    marginTop: 12, 
                                    paddingTop: 12, 
                                    borderTop: '1px solid #e1e6ec',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8
                                  }}>
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                        <input
                                          type="checkbox"
                                          checked={selectedYouTube.properties?.autoplay || false}
                                          onChange={(e) => updateYouTubeProperty(slot.slot, 'autoplay', e.target.checked)}
                                        />
                                        Auto-play
                                      </label>
                                      
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                        <input
                                          type="checkbox"
                                          checked={selectedYouTube.properties?.continue || false}
                                          onChange={(e) => updateYouTubeProperty(slot.slot, 'continue', e.target.checked)}
                                        />
                                        Continue
                                      </label>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                        <input
                                          type="checkbox"
                                          checked={selectedYouTube.properties?.audio || false}
                                          onChange={(e) => updateYouTubeProperty(slot.slot, 'audio', e.target.checked)}
                                        />
                                        Audio
                                      </label>
                                      
                                      {selectedYouTube.properties?.audio && (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                          <label style={{ fontSize: 12, color: '#666' }}>Volume:</label>
                                          <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={selectedYouTube.properties?.volume || 100}
                                            onChange={(e) => updateYouTubeProperty(slot.slot, 'volume', parseInt(e.target.value))}
                                            style={{ width: 80 }}
                                          />
                                          <span style={{ fontSize: 12, color: '#666', minWidth: 30 }}>
                                            {selectedYouTube.properties?.volume || 100}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {selectedYouTube.properties?.audio && (
                                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                          <input
                                            type="checkbox"
                                            checked={selectedYouTube.properties?.fadeIn || false}
                                            onChange={(e) => updateYouTubeProperty(slot.slot, 'fadeIn', e.target.checked)}
                                          />
                                          Fade In
                                        </label>
                                        
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                          <input
                                            type="checkbox"
                                            checked={selectedYouTube.properties?.fadeOut || false}
                                            onChange={(e) => updateYouTubeProperty(slot.slot, 'fadeOut', e.target.checked)}
                                          />
                                          Fade Out
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                // No YouTube Selected State
                                <div style={{
                                  background: '#f8f9fa',
                                  border: '1px dashed #ddd',
                                  borderRadius: 8,
                                  padding: 16,
                                  textAlign: 'center',
                                  color: '#777',
                                  fontStyle: 'italic'
                                }}>
                                  No YouTube video selected
                                </div>
                              )}

                              <button 
                                type="button" 
                                onClick={() => openYouTubePicker(slot.slot)}
                                style={{
                                  background: "#e3f2fd",
                                  border: "1px solid #b1c7e7",
                                  color: "#1976d2",
                                  borderRadius: 8,
                                  padding: "10px 16px",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  alignSelf: 'flex-start'
                                }}
                              >
                                {selectedYouTube ? 'Change YouTube Video' : 'Select YouTube Video'}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {(genericTypesBySlot[slot.slot] ?? 'None') === 'PDF/Image' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>PDF/Image Content</label>
                        
                        {(() => {
                          const selectedPdfImage = getSelectedPdfImageForSlot(slot.slot);
                          return (
                            <>
                              {selectedPdfImage ? (
                                // Selected PDF/Image Display
                                <div style={{
                                  background: '#f8fbff',
                                  border: '1px solid #b1c7e7',
                                  borderRadius: 8,
                                  padding: 12
                                }}>
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{
                                      width: 80,
                                      height: 60,
                                      background: '#e3f2fd',
                                      borderRadius: 4,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid #b1c7e7',
                                      flexShrink: 0
                                    }}>
                                      {selectedPdfImage.pdfImage.type === 'image' && selectedPdfImage.pdfImage.thumb ? (
                                        <img
                                          src={`${API_BASE_URL}/media/thumbs/${selectedPdfImage.pdfImage.thumb}`}
                                          alt={selectedPdfImage.pdfImage.displayName}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                          }}
                                        />
                                      ) : (
                                        <div style={{
                                          fontSize: 24,
                                          color: '#1976d2'
                                        }}>
                                          {selectedPdfImage.pdfImage.type === 'image' ? '🖼️' : '📄'}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontWeight: 600, 
                                        fontSize: 13, 
                                        color: '#333',
                                        wordBreak: 'break-word'
                                      }}>
                                        {selectedPdfImage.pdfImage.displayName || selectedPdfImage.pdfImage.name || selectedPdfImage.pdfImage.filename}
                                      </div>
                                      <div style={{ 
                                        fontSize: 11, 
                                        color: '#666',
                                        marginTop: 2
                                      }}>
                                        {selectedPdfImage.pdfImage.type === 'image' ? 'Image' : 'PDF'} • 
                                        Fit: {selectedPdfImage.properties?.fitMode || 'fit'}
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => openPdfImagePicker(slot.slot)}
                                        style={{
                                          background: "#e3f2fd",
                                          border: "1px solid #b1c7e7",
                                          color: "#1976d2",
                                          borderRadius: 6,
                                          padding: "6px 12px",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          flexShrink: 0
                                        }}
                                      >
                                        Change
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Clear local state
                                          setSelectedPdfImageBySlot(prev => {
                                            const updated = { ...prev };
                                            delete updated[slot.slot];
                                            return updated;
                                          });
                                          
                                          // Find slot index and clear PDF/Image data through the hook
                                          const slotIndex = (slots || []).findIndex(s => s && s.slot === slot.slot);
                                          
                                          if (slotIndex !== -1) {
                                            // Use the hook's function to clear PDF/Image data
                                            updateSlotMediaData(slotIndex, undefined);
                                          }
                                        }}
                                        style={{
                                          background: "#fff2e0",
                                          border: "1px solid #ff9800",
                                          color: "#e65100",
                                          borderRadius: 6,
                                          padding: "6px 12px",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          flexShrink: 0
                                        }}
                                      >
                                        Clear
                                      </button>
                                    </div>
                                  </div>

                                  {/* PDF/Image Properties */}
                                  <div style={{ 
                                    marginTop: 12, 
                                    paddingTop: 12, 
                                    borderTop: '1px solid #e1e6ec',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12
                                  }}>
                                    {/* Fit Mode */}
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <label style={{ fontSize: 12, color: '#666', minWidth: 60 }}>Fit Mode:</label>
                                      <select
                                        value={selectedPdfImage.properties?.fitMode || 'fit'}
                                        onChange={(e) => updatePdfImageProperty(slot.slot, 'fitMode', e.target.value)}
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: 4,
                                          border: '1px solid #b1c7e7',
                                          fontSize: 12
                                        }}
                                      >
                                        <option value="fit">Fit (maintain aspect)</option>
                                        <option value="fill">Fill (may crop)</option>
                                        <option value="stretch">Stretch (may distort)</option>
                                        <option value="center">Center (original size)</option>
                                      </select>
                                    </div>

                                    {/* Opacity and Rotation */}
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 12, color: '#666' }}>Opacity:</label>
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          value={selectedPdfImage.properties?.opacity || 100}
                                          onChange={(e) => updatePdfImageProperty(slot.slot, 'opacity', parseInt(e.target.value))}
                                          style={{ width: 80 }}
                                        />
                                        <span style={{ fontSize: 12, color: '#666', minWidth: 35 }}>
                                          {selectedPdfImage.properties?.opacity || 100}%
                                        </span>
                                      </div>
                                      
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 12, color: '#666' }}>Rotation:</label>
                                        <select
                                          value={selectedPdfImage.properties?.rotation || 0}
                                          onChange={(e) => updatePdfImageProperty(slot.slot, 'rotation', parseInt(e.target.value))}
                                          style={{
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            border: '1px solid #b1c7e7',
                                            fontSize: 12
                                          }}
                                        >
                                          <option value={0}>0°</option>
                                          <option value={90}>90°</option>
                                          <option value={180}>180°</option>
                                          <option value={270}>270°</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* Zoom and Position */}
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 12, color: '#666' }}>Zoom:</label>
                                        <input
                                          type="range"
                                          min="25"
                                          max="200"
                                          value={selectedPdfImage.properties?.zoom || 100}
                                          onChange={(e) => updatePdfImageProperty(slot.slot, 'zoom', parseInt(e.target.value))}
                                          style={{ width: 80 }}
                                        />
                                        <span style={{ fontSize: 12, color: '#666', minWidth: 35 }}>
                                          {selectedPdfImage.properties?.zoom || 100}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Position Offset */}
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 12, color: '#666' }}>Offset X:</label>
                                        <input
                                          type="number"
                                          min="-500"
                                          max="500"
                                          value={selectedPdfImage.properties?.offsetX || 0}
                                          onChange={(e) => updatePdfImageProperty(slot.slot, 'offsetX', parseInt(e.target.value))}
                                          style={{
                                            width: 60,
                                            padding: '4px 6px',
                                            borderRadius: 4,
                                            border: '1px solid #b1c7e7',
                                            fontSize: 12
                                          }}
                                        />
                                      </div>
                                      
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 12, color: '#666' }}>Offset Y:</label>
                                        <input
                                          type="number"
                                          min="-500"
                                          max="500"
                                          value={selectedPdfImage.properties?.offsetY || 0}
                                          onChange={(e) => updatePdfImageProperty(slot.slot, 'offsetY', parseInt(e.target.value))}
                                          style={{
                                            width: 60,
                                            padding: '4px 6px',
                                            borderRadius: 4,
                                            border: '1px solid #b1c7e7',
                                            fontSize: 12
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {/* PDF Page Selection */}
                                    {selectedPdfImage.pdfImage.type !== 'image' && (
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 12, color: '#666' }}>PDF Page:</label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="999"
                                          value={selectedPdfImage.properties?.page || 1}
                                          onChange={(e) => updatePdfImageProperty(slot.slot, 'page', parseInt(e.target.value))}
                                          style={{
                                            width: 60,
                                            padding: '4px 6px',
                                            borderRadius: 4,
                                            border: '1px solid #b1c7e7',
                                            fontSize: 12
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                // No PDF/Image Selected State
                                <div style={{
                                  background: '#f8f9fa',
                                  border: '1px dashed #ddd',
                                  borderRadius: 8,
                                  padding: 16,
                                  textAlign: 'center',
                                  color: '#777',
                                  fontStyle: 'italic'
                                }}>
                                  No PDF or image selected
                                </div>
                              )}

                              <button 
                                type="button" 
                                onClick={() => openPdfImagePicker(slot.slot)}
                                style={{
                                  background: "#e3f2fd",
                                  border: "1px solid #b1c7e7",
                                  color: "#1976d2",
                                  borderRadius: 8,
                                  padding: "10px 16px",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  alignSelf: 'flex-start'
                                }}
                              >
                                {selectedPdfImage ? 'Change PDF/Image' : 'Select PDF/Image'}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </details>

      {/* GRAPHICS (legacy CG panel removed under generic slots) */}

      {/* FUTURE: Test/Send button */}
      {/* <button onClick={() => testSend(data)} style={{ alignSelf: "start" }}>Test / Send</button> */}

      {/* GRAPHICS PICKER MODAL (UI-only for now) */}
      {gfxModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 680, maxHeight: '80vh', overflow: 'auto', background: '#fafdff', borderRadius: 12, boxShadow: '0 12px 28px rgba(0,0,0,0.25)', padding: 20, border: '1px solid #e1e6ec' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e1e6ec' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1976d2' }}>Pick a Graphic</h3>
              <div style={{ display:'flex', gap:8 }}>
                <button 
                  onClick={() => createAndOpenNewGraphic(gfxModal.slot)}
                  style={{
                    background: "#e8f5e8",
                    border: "1px solid #4caf50",
                    color: "#2e7d32",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  New graphic…
                </button>
                <button 
                  onClick={closeGraphicsModal}
                  style={{
                    background: "#fff2e0",
                    border: "1px solid #ff9800",
                    color: "#e65100",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            {gfxLoading && <div style={{ color: '#777', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>Loading…</div>}
            {gfxError && <div style={{ color: '#d32f2f', marginBottom: 12, padding: 12, background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: 6 }}>{gfxError}</div>}
            {!gfxLoading && !gfxError && gfxList.length === 0 && (
              <div style={{ color: '#777', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>No graphics found for this episode.</div>
            )}
            {!gfxLoading && gfxList.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                {gfxList.map(row => (
                  <div
                    key={row.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr auto',
                      columnGap: 12,
                      rowGap: 8,
                      alignItems: 'start',
                      border: '1px solid #e1e6ec',
                      padding: 12,
                      borderRadius: 8,
                      background: '#fff'
                    }}
                  >
                    <div
                      style={{
                        width: 120,
                        height: 68,
                        background: '#f3f3f3',
                        borderRadius: 4,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #b1c7e7',
                        boxSizing: 'border-box'
                      }}
                    >
                      {(() => {
                        const url = buildGraphicsPreviewUrl(row);
                        return url ? (
                          <HoldToZoomModalPreview url={url} containerWidth={120} containerHeight={68} />
                        ) : (
                          <span style={{ fontSize: 11, color: '#999' }}>no preview</span>
                        );
                      })()}
                    </div>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 600, color: '#222' }}>{row.title}</div>
                      <div style={{ fontSize: 12, color: '#777' }}>{row.type}{row.summary ? ` — ${row.summary}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => pickGraphicForSlot(gfxModal.slot, row)}
                        style={{
                          background: "#e3f2fd",
                          border: "1px solid #b1c7e7",
                          color: "#1976d2",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Use
                      </button>
                      <button
                        onClick={() => openGraphicEditor(row, gfxModal.slot)}
                        style={{
                          background: "#f3e5f5",
                          border: "1px solid #9c27b0",
                          color: "#6a1b99",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {gfxEditor.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            width: 900, maxHeight: '88vh', overflow: 'auto',
            background: '#fafdff', borderRadius: 12,
            boxShadow: '0 12px 28px rgba(0,0,0,0.25)', padding: 20, border: '1px solid #e1e6ec'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e1e6ec' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1976d2' }}>Edit Graphic</h3>
              <button 
                onClick={closeGraphicEditor}
                style={{
                  background: "#fff2e0",
                  border: "1px solid #ff9800",
                  color: "#e65100",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
            {gfxEditor.graphicId === '__PENDING__' || !gfxEditor.graphicId ? (
              <div style={{ padding: 16, color: '#777', fontStyle: 'italic', textAlign: 'center' }}>Creating graphic…</div>
            ) : (
              <GraphicsTemplateEditor
                key={gfxEditor.graphicId}
                graphicId={gfxEditor.graphicId}
                onSaved={(row) => { onGraphicSaved(row); }}
                onClose={closeGraphicEditor}
              />
            )}
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPicker
        showId={(() => {
          const showId = getShowIdFromAnywhere(item);
          return showId;
        })()}
        isOpen={mediaPickerModal.open}
        onClose={closeMediaPicker}
        onMediaSelected={handleMediaSelected}
        title={`Select Media for Slot ${mediaPickerModal.slot}`}
      />

      {/* YouTube Picker Modal */}
      <YouTubePicker
        isOpen={youtubePickerModal.open}
        onClose={closeYouTubePicker}
        onYouTubeSelected={handleYouTubeSelected}
        title={`Add YouTube Video for Slot ${youtubePickerModal.slot}`}
      />

      {/* PDF/Image Picker Modal */}
      <MediaPicker
        showId={(() => {
          const showId = getShowIdFromAnywhere(item);
          return showId;
        })()}
        isOpen={pdfImagePickerModal.open}
        onClose={closePdfImagePicker}
        onMediaSelected={handlePdfImageSelected}
        title={`Select Image/PDF for Slot ${pdfImagePickerModal.slot}`}
        typeFilter={['image', 'application']} // Filter to images and PDFs
      />

    </div>
  );
}