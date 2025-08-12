import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import GraphicsTemplateEditor from "./GraphicsTemplateEditor.jsx";

async function fetchSceneItems(sceneName) {
  const res = await fetch(`/api/obs/placeholders?scene=${encodeURIComponent(sceneName)}`);
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
    const res = await fetch(`/api/obs/sources?scene=${encodeURIComponent(sceneName)}`);
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
  const res = await fetch(`/api/obs/screenshot?scene=${encodeURIComponent(sceneName)}&width=${w}`);
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

export default function ObsSceneEditor({ item, onPatch }) {
  // Keep a stable numeric item id to hand off to child editors
  const itemId = (item && (item.id ?? item.itemId) != null)
    ? Number(item.id ?? item.itemId)
    : undefined;
  // `item` is the full item object; `onPatch(partial)` should PATCH /api/items/:id
  // Expected data shape; tolerate missing fields gracefully
  const initial = useMemo(() => ({
    scene: "",
    transition: { type: "cut", durationSec: 0 },
    slots: [],   // [{slot, replaceable, selectedSource, sourceProps}]
    notes: "",
    ...(item.data || {})
  }), [item.data]);

  const [data, setData] = useState(initial);
  const [sceneItems, setSceneItems] = useState([]);
  const [videoSources, setVideoSources] = useState([]);
  const [screenshot, setScreenshot] = useState(null);
  const [loadingScene, setLoadingScene] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [orderedPlaceholders, setOrderedPlaceholders] = useState([]);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);
  const wrapperRef = useRef(null);
  const [lastShotWidth, setLastShotWidth] = useState(720);
  const [baseDims, setBaseDims] = useState({ width: 1920, height: 1080 });

  // debounce server patch
  const debouncedPatch = useDebouncedCallback(async (partial) => {
    try {
      await onPatch({ data: partial });
    } catch (err) {
      toast.error(err?.message || "Save failed");
    }
  }, 400);

  // load sources once
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

  // when item.data changes from outside (e.g., refetch), resync local state
  useEffect(() => setData(initial), [initial]);

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

  useEffect(() => {
    if (!data.scene && guessedSceneName) {
      setData(prev => {
        const next = { ...prev, scene: guessedSceneName };
        // persist immediately so downstream hooks (preview/layout) can load
        debouncedPatch(next);
        return next;
      });
    }
  }, [data.scene, guessedSceneName, debouncedPatch]);

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
              const existing = (data.slots || []).find((s) => s.slot === slotNum);

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

            setData((d) => ({ ...d, slots: nextSlots }));
            debouncedPatch({ slots: nextSlots });

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
    [data, debouncedPatch, loadedOnce, normalizeSceneName]
  );

  useEffect(() => {
    // On first set after drop, try silently with a few retries to avoid scary toasts.
    loadSceneLayout({ silent: true, retries: 4, width: 720 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.scene]);

  // Keep overlay label positions in sync with responsive image size
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

  const ensureSourceInScene = useCallback(async (sceneName, sourceName) => {
    if (!sceneName || !sourceName) return null;
    try {
      const res = await fetch('/api/obs/add-source-to-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneName, sourceName, makeTop: true })
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json().catch(() => ({}));
      return json; // may contain sceneItemId
    } catch (err) {
      console.warn('ensureSourceInScene failed', err);
      toast.error('Failed to add source to scene');
      return null;
    }
  }, []);

  const setField = (path, value, save = true) => {
    setData(prev => {
      const next = structuredClone(prev);
      // tiny path setter
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;

      if (save) debouncedPatch(next);

      return next;
    });
  };
  const lastAutoFittedKey = useRef('');
  useEffect(() => {
    const sceneName = sceneForUi;
    const channel = activeCgChannel;
    const phIndex = activePlaceholderIndex;
    const doRun = async () => {
      if (!sceneName || !channel || phIndex == null) return;
      const key = `${sceneName}|${channel}|${phIndex}`;
      if (lastAutoFittedKey.current === key) return;

      // 1) Ensure the *browser source* (e.g., "CG-1") is added to this scene at the top
      await ensureSourceInScene(sceneName, `CG-${channel}`);
      // 2) Copy transform from placeholder and paste onto that source
      await fitActiveCgToPlaceholder();

      lastAutoFittedKey.current = key;
    };
    // Fire and forget; no toast on success
    doRun();
  }, [sceneForUi, activeCgChannel, activePlaceholderIndex, ensureSourceInScene, fitActiveCgToPlaceholder]);

  // validation: if scene/source missing → revert to empty and toast (called onBlur)
  const validateSource = (slotIndex) => {
    const name = data.slots?.[slotIndex]?.selectedSource || "";
    if (!name) return;
    const ok = videoSources.some(s => s.name === name);
    if (!ok) {
      toast.error(`Source no longer exists: ${name}`);
      setField(`slots.${slotIndex}.selectedSource`, "", true);
    }
  };

  const transitionNeedsDuration = (t) => t && t.toLowerCase() !== "cut";

  const activeCgChannel = useMemo(() => {
    const slotsArr = Array.isArray(data.slots) ? data.slots : [];
    for (const s of slotsArr) {
      const name = String(s?.selectedSource || "");
      const m = name.match(/^CG-(\d+)$/i);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }, [data.slots]);

  // Compute the active placeholder index used for transform pasting
  const activePlaceholderIndex = useMemo(() => {
    if (!activeCgChannel) return null;
    const slotsArr = Array.isArray(data.slots) ? data.slots : [];
    const idx = slotsArr.findIndex(s => {
      const m = String(s?.selectedSource || "").match(/^CG-(\d+)$/i);
      return m && parseInt(m[1], 10) === activeCgChannel;
    });
    return idx === -1 ? null : idx;
  }, [activeCgChannel, data.slots]);

  const activePlaceholderRect = useMemo(() => {
    if (!activeCgChannel || activePlaceholderIndex == null) return null;

    const slotsArr = Array.isArray(data.slots) ? data.slots : [];
    const spRect = slotsArr[activePlaceholderIndex]?.sourceProps?.placeholder || null;
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
  }, [activeCgChannel, activePlaceholderIndex, data.slots, orderedPlaceholders]);

  const sceneForUi = normalizeSceneName(data.scene);
  const scaleX = (imgSize?.width && baseDims?.width) ? (imgSize.width / baseDims.width) : 1;
  const scaleY = (imgSize?.height && baseDims?.height) ? (imgSize.height / baseDims.height) : scaleX;

  // Callback to trigger backend copy/paste transform operation
  const fitActiveCgToPlaceholder = useCallback(async () => {
    if (!sceneForUi || !activeCgChannel || activePlaceholderIndex == null) return;
    const phId = orderedPlaceholders[activePlaceholderIndex]?.sceneItemId ?? null;
    console.log('[FitCG] Request params:', {
      sceneName: sceneForUi,
      channel: activeCgChannel,
      placeholderIndex: activePlaceholderIndex + 1,
      placeholderId: phId
    });
    try {
      const res = await fetch('/api/obs/paste-placeholder-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneName: sceneForUi,
          channel: activeCgChannel,
          // backend expects 1-based index
          placeholderIndex: activePlaceholderIndex + 1,
          placeholderId: phId
        })
      });
      if (!res.ok) throw new Error(await res.text());
      // optional: quietly succeed
      // console.log('Fitted CG to placeholder');
    } catch (err) {
      console.warn('fitActiveCgToPlaceholder failed', err);
      toast.error('Failed to fit CG to placeholder');
    }
  }, [sceneForUi, activeCgChannel, activePlaceholderIndex, orderedPlaceholders]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* BASICS */}
      <details open>
        <summary style={{ fontWeight: 700 }}>Basics</summary>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, alignItems: "center", marginTop: 8 }}>
          <label>Transition</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={data.transition?.type || "cut"}
              onChange={(e) => setField("transition.type", e.target.value)}
              onBlur={() => debouncedPatch(data)}
            >
              <option value="cut">Cut</option>
              <option value="fade">Fade</option>
              <option value="wipe">Wipe</option>
              <option value="stinger">Stinger</option>
            </select>
            {transitionNeedsDuration(data.transition?.type) && (
              <>
                <label style={{ alignSelf: "center" }}>Duration (s)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={data.transition?.durationSec ?? 0}
                  onChange={(e) => setField("transition.durationSec", Number(e.target.value))}
                  onBlur={() => debouncedPatch(data)}
                  style={{ width: 90 }}
                />
              </>
            )}
          </div>
        </div>
      </details>

      {/* SCENE */}
      <details open>
        <summary style={{ fontWeight: 700 }}>Scene</summary>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, alignItems: "center", marginTop: 8 }}>
          <label>OBS Scene</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ padding: "4px 6px", background: "#f5f5f7", borderRadius: 4 }}>
              {sceneForUi || "(not set)"}
            </code>
            <button
              type="button"
              onClick={() => loadSceneLayout({ silent: false, retries: 0, width: 720 })}
              disabled={!data.scene || loadingScene}
            >
              {loadingScene ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
            {loadingScene ? (
              <div style={{ color: "#666", fontStyle: "italic" }}>Loading scene layout…</div>
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
                  const slot = (data.slots || [])[idx] || {};
                  const labelText = `#${idx + 1} — ${slot.selectedSource ? String(slot.selectedSource) : "choose source"}`;
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#666", fontStyle: "italic" }}>
                <span>No preview available.</span>
                <button
                  type="button"
                  onClick={() => loadSceneLayout({ silent: false, retries: 2, width: 720 })}
                  disabled={loadingScene}
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </details>

      {/* SLOTS */}
      <details open>
        <summary style={{ fontWeight: 700 }}>Slots</summary>
        {!data.scene && <div style={{ color: "#666", marginTop: 8 }}>Select a scene to configure slots.</div>}
        {data.scene && (data.slots || []).length === 0 && (
          <div style={{ color: "#666", marginTop: 8 }}>No placeholders detected in this scene.</div>
        )}
        {data.scene && (data.slots || []).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {data.slots.map((slot, idx) => (
              <div key={slot.slot} style={{ display: "grid", gridTemplateColumns: "80px 120px 1fr", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 600 }}>#{slot.slot}</div>
                <div>{slot.replaceable ? "Replaceable" : "Fixed"}</div>
                {slot.replaceable ? (
                  <select
                    value={slot.selectedSource || ""}
                    onChange={(e) => setField(`slots.${idx}.selectedSource`, e.target.value)}
                    onBlur={() => validateSource(idx)}
                  >
                    <option value="">— Choose source —</option>
                    {videoSources.map((s) => {
                      const nm = String(s?.name ?? "");
                      return (
                        <option key={nm} value={nm}>{nm}</option>
                      );
                    })}
                  </select>
                ) : (
                  <div style={{ color: "#777" }}>No override (uses scene’s own source)</div>
                )}
              </div>
            ))}
          </div>
        )}
      </details>

      {/* GRAPHICS (only shows when a CG-# source is selected) */}
      {activeCgChannel ? (
        <details open>
          <summary style={{ fontWeight: 700 }}>Graphics (CG-{activeCgChannel})</summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={fitActiveCgToPlaceholder}
                disabled={!sceneForUi || !activePlaceholderRect}
                title={(!sceneForUi || !activePlaceholderRect) ? 'Select a scene and a CG slot first' : 'Copy placeholder transform onto CG source in OBS'}
              >
                Fit CG to Placeholder
              </button>
            </div>
            <GraphicsTemplateEditor
              key={`gfx-${itemId ?? 'na'}-${activeCgChannel}`}
              channel={activeCgChannel}
              itemId={itemId}
              item={item}
              placeholderRect={activePlaceholderRect}
              baseDims={baseDims}
            />
          </div>
        </details>
      ) : null}

      {/* FUTURE: Test/Send button */}
      {/* <button onClick={() => testSend(data)} style={{ alignSelf: "start" }}>Test / Send</button> */}
    </div>
  );
}