// backend/services/obs.js
// Centralized OBS WebSocket v5 service used by routes. Reconnects as needed.

const OBSWebSocket = require('obs-websocket-js').default;

const OBS_HOST = process.env.OBS_HOST || '127.0.0.1';
const OBS_PORT = process.env.OBS_PORT || '4455';
const OBS_PASSWORD = process.env.OBS_PASSWORD || '';
const OBS_URL = process.env.OBS_URL || `ws://${OBS_HOST}:${OBS_PORT}`;
const PLAYER_BASE_URL = process.env.PLAYER_BASE_URL || 'http://localhost:5050/player.html';

class ObsService {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.connecting = false;

    this.obs.on('ConnectionClosed', () => {
      this.connected = false;
    });
  }

  async ensureConnected() {
    if (this.connected) {
      return;
    }
    
    if (this.connecting) {
      // Wait for existing connection attempt to complete
      while (this.connecting && !this.connected) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    this.connecting = true;
    try {
      await this.obs.connect(OBS_URL, OBS_PASSWORD);
      this.connected = true;
      console.log("[ObsService] Connected to OBS at", OBS_URL);
      // Auto-create utility GFX-SOURCES scene and channels on connect (non-blocking for availability)
      try {
        await this.ensureGfxSourcesScene();
      } catch (err) {
        console.error("[ObsService] Error ensuring utility scenes on connect:", err);
      }
      // Auto-create VIDEO-PLAYBACK scene and channels on connect (non-blocking)
      try {
        await this.ensureVideoPlaybackScene();
      } catch (err) {
        console.error("[ObsService] Error ensuring video playback scene on connect:", err);
      }
    } catch (err) {
      this.connected = false;
      throw err;
    } finally {
      this.connecting = false;
    }
  }

  // --- High-level API used by routes ---

  /**
   * Resolve a scene identifier (UUID or name) to the actual scene name.
   * Returns the input if it's already a valid scene name, otherwise tries to find by UUID.
   */
  async resolveSceneName(sceneIdentifier) {
    if (!sceneIdentifier) return '';
    
    await this.ensureConnected();
    const { scenes } = await this.obs.call('GetSceneList');
    
    // First check if it's already a valid scene name
    const byName = scenes.find(s => s.sceneName === sceneIdentifier);
    if (byName) return sceneIdentifier;
    
    // Then check if it's a UUID
    const byUuid = scenes.find(s => s.sceneUuid === sceneIdentifier);
    if (byUuid) return byUuid.sceneName;
    
    // Return as-is if not found (let OBS handle the error)
    return sceneIdentifier;
  }

  async getVideoSettings() {
    await this.ensureConnected();
    try {
      const { baseWidth, baseHeight, outputWidth, outputHeight } = await this.obs.call('GetVideoSettings');
      return { baseWidth, baseHeight, outputWidth, outputHeight };
    } catch (_) {
      return { baseWidth: undefined, baseHeight: undefined, outputWidth: undefined, outputHeight: undefined };
    }
  }

  async getTransitions() {
    await this.ensureConnected();
    try {
      const { transitions, currentSceneTransitionName } = await this.obs.call('GetSceneTransitionList');
      return { transitions, currentTransition: currentSceneTransitionName };
    } catch (err) {
      console.error('[ObsService] Error getting transitions:', err);
      return { transitions: [], currentTransition: null };
    }
  }

  async getScenes() {
    await this.ensureConnected();
    const { scenes } = await this.obs.call('GetSceneList');
    const { currentProgramSceneName } = await this.obs.call('GetCurrentProgramScene');
    // Hide internal utility scenes from the toolbox
    const HIDDEN = new Set(['GFX-SOURCES', 'VIDEO-PLAYBACK']);
    const filteredScenes = scenes.filter(s => !HIDDEN.has(s.sceneName));
    return { scenes: filteredScenes, currentProgramSceneName };
  }

  async getSourcesForScene(sceneName) {
    await this.ensureConnected();

    // Virtual scene: return all video-capable inputs in OBS
    
    if (String(sceneName).toUpperCase() === 'ALL-SOURCES') {
  // Build a comprehensive catalog:
  // 1) All OBS inputs
  // 2) All unique source names referenced by scene items across all scenes
  // Then filter out audio-only and placeholder color sources (unless #KEEP)

  const nameSet = new Set();
  const results = [];

  const pushOnce = (name, kind = null, sourceType = null) => {
    if (!name) return;
    const key = String(name);
    if (nameSet.has(key)) return;
    nameSet.add(key);
    results.push({ id: key, name: key, inputKind: kind, sourceType });
  };

  // 1) Inputs
  const { inputs } = await this.obs.call('GetInputList');
  for (const inp of inputs) {
    const kind = String(inp.inputKind || '').toLowerCase();
    const nm = String(inp.inputName || '');
    pushOnce(nm, kind, 'input');
  }

  // 2) Scene items across all scenes
  const { scenes } = await this.obs.call('GetSceneList');
  for (const sc of scenes) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName: sc.sceneName });
      for (const si of sceneItems) {
        const nm = String(si.sourceName || '');
        const kind = String(si.inputKind || '').toLowerCase();
        pushOnce(nm, kind, si.sourceType || null);
      }
    } catch (_) {
      // ignore individual scene failures
    }
  }

  // Filter: remove obvious audio-only and placeholder color sources
  const isAudioish = (kind, nm) => {
    const k = String(kind || '').toLowerCase();
    const n = String(nm || '').toLowerCase();
    return (
      k.includes('wasapi') ||
      k.includes('coreaudio') ||
      k.includes('audio') ||
      /\b(mic|audio)\b/.test(n)
    );
  };

  const isPlaceholderColor = (kind, nm) => {
    const k = String(kind || '').toLowerCase();
    const n = String(nm || '').toLowerCase();
    const isColor = k === 'color_source' || k === 'color_source_v3';
    const keep = n.includes('#keep');
    return isColor && !keep;
  };

  const pruned = results.filter(r => !isAudioish(r.inputKind, r.name) && !isPlaceholderColor(r.inputKind, r.name));

  pruned.sort((a, b) => a.name.localeCompare(b.name));

  return pruned;
    }

    // Normal case: sources (scene items) for a real scene
    const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName });
    return sceneItems.map(si => ({
      id: si.sceneItemId,
      name: si.sourceName,
      inputKind: si.inputKind || null,
      sourceType: si.sourceType || null,
    }));
  }

  async getSceneScreenshot(sceneNameOrUuid, { width = 640, height, format = 'png' } = {}) {
    await this.ensureConnected();
    const sceneName = await this.resolveSceneName(sceneNameOrUuid);
    const { imageData } = await this.obs.call('GetSourceScreenshot', {
      sourceName: sceneName,
      imageFormat: format,
      imageWidth: width,
      imageHeight: height,
    });
    return `data:image/${format};base64,${imageData}`;
  }

  /**
   * Return placeholder rectangles for a scene.
   * Placeholders are Color Source inputs whose name does NOT include '#KEEP' (case-insensitive).
   * Sorted top-left to bottom-right.
   */
  async getScenePlaceholders(sceneNameOrUuid) {
    await this.ensureConnected();
    const sceneName = await this.resolveSceneName(sceneNameOrUuid);
    const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName });

    // Identify color-source placeholders (v3 and legacy), excluding #KEEP (case-insensitive)
    const PLACEHOLDER_KINDS = new Set(['color_source_v3', 'color_source']);
    const placeholders = sceneItems.filter(si => {
      const nm = String(si.sourceName || '');
      const keep = nm.toLowerCase().includes('#keep');
      const kind = String(si.inputKind || '').toLowerCase();
      return !keep && PLACEHOLDER_KINDS.has(kind);
    });

    // Get base canvas to allow callers to scale coordinates to screenshots
    let baseWidth, baseHeight;
    try {
      const vs = await this.getVideoSettings();
      baseWidth = vs.baseWidth;
      baseHeight = vs.baseHeight;
    } catch (_) {
      // optional
    }

    const rects = [];
    for (const ph of placeholders) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const { sceneItemTransform } = await this.obs.call('GetSceneItemTransform', {
          sceneName,
          sceneItemId: ph.sceneItemId,
        });

        const {
          positionX = 0,
          positionY = 0,
          scaleX = 1,
          scaleY = 1,
          width = 0,
          height = 0,
          sourceWidth = 0,
          sourceHeight = 0,
          rotation = 0,
        } = sceneItemTransform || {};

        const w = (width && width > 0 ? width : sourceWidth * scaleX) || 0;
        const h = (height && height > 0 ? height : sourceHeight * scaleY) || 0;

        const x = Number(positionX) || 0;
        const y = Number(positionY) || 0;
        const W = Number(w) || 0;
        const H = Number(h) || 0;
        const rot = Number(rotation) || 0;

        rects.push({
          id: ph.sceneItemId,
          name: ph.sourceName,
          inputKind: ph.inputKind || null,
          x,
          y,
          w: W,
          h: H,
          rotation: rot,
          aspect: H > 0 ? W / H : null
        });
      } catch (_) {
        // skip individual failures
      }
    }

    // Sort top-to-bottom, then left-to-right
    rects.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

    rects.forEach((r, idx) => {
      r.displayIndex = idx + 1;
      if (baseWidth && baseHeight) {
        r.norm = {
          x: r.x / baseWidth,
          y: r.y / baseHeight,
          w: r.w / baseWidth,
          h: r.h / baseHeight,
        };
        r.frame = { baseWidth, baseHeight };
      }
    });

    return { placeholders: rects, baseWidth, baseHeight, sceneName };
  }

  /**
   * Replace placeholder color sources in a scene according to mappings.
   * mappings: array of { sceneItemId, sourceName }.
   * NO-OP stub for now.
   */
  async replacePlaceholders(sceneName, mappings) {
    await this.ensureConnected();
    if (!Array.isArray(mappings)) throw new Error('mappings must be an array');
    return { ok: true };
  }

  /**
   * Ensure a utility scene "GFX-SOURCES" exists and contains 4 browser sources:
   * "Channel 1" .. "Channel 4" (each pointing to https://www.google.com for now).
   * Idempotent; safe to call repeatedly.
   */
  async ensureGfxSourcesScene({ sceneName = 'GFX-SOURCES', channels = 4 } = {}) {
    console.log(`[ObsService] ensureGfxSourcesScene: start (sceneName=${sceneName}, channels=${channels})`);
    // Create the scene if missing
    const { scenes } = await this.obs.call('GetSceneList');
    console.log("[ObsService] ensureGfxSourcesScene: current scenes =", scenes.map(s => s.sceneName));
    const exists = scenes.some(s => s.sceneName === sceneName);
    if (!exists) {
      console.log("[ObsService] ensureGfxSourcesScene: creating scene", sceneName);
      await this.obs.call('CreateScene', { sceneName });
    }

    // Get base canvas size to size browser sources and fill the frame
    let baseWidth = 1920, baseHeight = 1080;
    try {
      const vs = await this.getVideoSettings();
      if (vs.baseWidth) baseWidth = vs.baseWidth;
      if (vs.baseHeight) baseHeight = vs.baseHeight;
    } catch (_) {
      // keep defaults on failure
    }
    console.log("[ObsService] ensureGfxSourcesScene: base canvas", { baseWidth, baseHeight });

    // Ensure inputs exist and are present in the scene
    for (let i = 1; i <= channels; i += 1) {
      const inputName = `CG-${i}`;
      const inputKind = 'browser_source';
      console.log("[ObsService] ensureGfxSourcesScene: ensuring input", inputName);

      // 1) If the input doesn't exist globally, create it (and add to scene)
      const { inputs } = await this.obs.call('GetInputList', { inputKind });
      const presentInput = (inputs || []).find(x => String(x.inputName) === inputName);

      if (!presentInput) {
        console.log("[ObsService] ensureGfxSourcesScene: creating input", inputName);
        await this.obs.call('CreateInput', {
          sceneName,
          inputName,
          inputKind,
          inputSettings: {
            url: `${PLAYER_BASE_URL}?channel=${i}`,
            width: baseWidth,
            height: baseHeight,
            fps: 60,
            shutdown: false
          },
          sceneItemEnabled: true,
        });
      } else {
        // 2) Make sure the input is added to the GFX-SOURCES scene
        const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName });
        const inScene = (sceneItems || []).some(si => si.sourceName === inputName);
        if (!inScene) {
          console.log("[ObsService] ensureGfxSourcesScene: adding existing input to scene", { sceneName, inputName });
          await this.obs.call('CreateSceneItem', { sceneName, sourceName: inputName });
        }
        try {
          await this.obs.call('SetInputSettings', {
            inputName,
            inputSettings: {
              url: `${PLAYER_BASE_URL}?channel=${i}`,
              width: baseWidth,
              height: baseHeight,
              fps: 60,
              shutdown: false
            },
            overlay: true
          });
        } catch (err) {
          console.warn("[ObsService] ensureGfxSourcesScene: unable to update input settings for", inputName, err);
        }
      }

      // Ensure the scene item fills the frame
      try {
        const { sceneItemId } = await this.obs.call('GetSceneItemId', { sceneName, sourceName: inputName, searchOffset: 0 });
        await this.obs.call('SetSceneItemTransform', {
          sceneName,
          sceneItemId,
          sceneItemTransform: {
            positionX: 0,
            positionY: 0,
            scaleX: 1,
            scaleY: 1,
            width: baseWidth,
            height: baseHeight,
            rotation: 0,
            alignment: 5 // top-left
          }
        });
        // Push item to the bottom of the scene's source stack (index 0 is bottom in OBS)
        await this.obs.call('SetSceneItemIndex', { sceneName, sceneItemId, sceneItemIndex: 0 });
      } catch (err) {
        console.error("[ObsService] ensureGfxSourcesScene: failed sizing/reindexing", inputName, err);
      }
    }
    console.log("[ObsService] ensureGfxSourcesScene: complete for", sceneName);
    return { sceneName };
  }

  /**
   * Ensure a utility scene "VIDEO-PLAYBACK" exists and contains N media sources.
   * Each is a ffmpeg_source ("Video A", "Video B", ...). Idempotent; safe to call repeatedly.
   */
  async ensureVideoPlaybackScene({ sceneName = 'VIDEO-PLAYBACK', channels = 4, names = null } = {}) {
    console.log(`[ObsService] ensureVideoPlaybackScene: start (sceneName=${sceneName}, channels=${channels})`);
    await this.ensureConnected();

    // Ensure scene exists
    const { scenes } = await this.obs.call('GetSceneList');
    const exists = scenes.some(s => s.sceneName === sceneName);
    if (!exists) {
      console.log('[ObsService] ensureVideoPlaybackScene: creating scene', sceneName);
      await this.obs.call('CreateScene', { sceneName });
    }

    // Determine canvas size for default sizing
    let baseWidth = 1920, baseHeight = 1080;
    try {
      const vs = await this.getVideoSettings();
      if (vs.baseWidth) baseWidth = vs.baseWidth;
      if (vs.baseHeight) baseHeight = vs.baseHeight;
    } catch (_) {
      // keep defaults
    }
    console.log('[ObsService] ensureVideoPlaybackScene: base canvas', { baseWidth, baseHeight });

    // Default channel names (Video A..D) unless caller supplied names
    const defaultNames = ['Video A', 'Video B', 'Video C', 'Video D'];
    const channelNames = Array.isArray(names) && names.length >= channels
      ? names.slice(0, channels)
      : defaultNames.slice(0, channels);

    for (let i = 0; i < channels; i += 1) {
      const inputName = channelNames[i] || `Video ${i + 1}`;
      const inputKind = 'ffmpeg_source'; // OBS Media Source
      console.log('[ObsService] ensureVideoPlaybackScene: ensuring input', inputName);

      // If the input does not exist globally, create it and add to scene
      const { inputs } = await this.obs.call('GetInputList', { inputKind });
      const presentInput = (inputs || []).find(x => String(x.inputName) === inputName);

      if (!presentInput) {
        console.log('[ObsService] ensureVideoPlaybackScene: creating input', inputName);
        await this.obs.call('CreateInput', {
          sceneName,
          inputName,
          inputKind,
          inputSettings: {
            // Start as an empty media source; file can be set later via SetInputSettings
            local_file: '',
            is_local_file: true,
            loop: false,
            clear_on_media_end: false,
            close_when_inactive: false,
            restart_on_activate: true,
            hardware_decode: true,
            speed_percent: 100
          },
          sceneItemEnabled: true
        });
      } else {
        // Ensure it is present in the target scene
        const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName });
        const inScene = (sceneItems || []).some(si => si.sourceName === inputName);
        if (!inScene) {
          console.log('[ObsService] ensureVideoPlaybackScene: adding existing input to scene', { sceneName, inputName });
          await this.obs.call('CreateSceneItem', { sceneName, sourceName: inputName });
        }
        // Keep sane defaults; do not override file path if already set
        try {
          await this.obs.call('SetInputSettings', {
            inputName,
            inputSettings: {
              loop: false,
              clear_on_media_end: false,
              close_when_inactive: false,
              restart_on_activate: true,
              hardware_decode: true,
              speed_percent: 100
            },
            overlay: true
          });
        } catch (err) {
          console.warn('[ObsService] ensureVideoPlaybackScene: unable to update input settings for', inputName, err);
        }
      }

      // Size/position the scene item to fill the canvas, index it to the bottom
      try {
        const { sceneItemId } = await this.obs.call('GetSceneItemId', { sceneName, sourceName: inputName, searchOffset: 0 });
        await this.obs.call('SetSceneItemTransform', {
          sceneName,
          sceneItemId,
          sceneItemTransform: {
            positionX: 0,
            positionY: 0,
            scaleX: 1,
            scaleY: 1,
            width: baseWidth,
            height: baseHeight,
            rotation: 0,
            alignment: 5 // top-left
          }
        });
        await this.obs.call('SetSceneItemIndex', { sceneName, sceneItemId, sceneItemIndex: 0 });
      } catch (err) {
        console.error('[ObsService] ensureVideoPlaybackScene: failed sizing/reindexing', inputName, err);
      }
    }

    console.log('[ObsService] ensureVideoPlaybackScene: complete for', sceneName);
    return { sceneName };
  }

  /**
   * Backward-compatible helper that ensures the GFX-SOURCES scene (with CG-1..4)
   * exists. Uses the existing ensureGfxSourcesScene() method.
   */
  async ensureGfxSceneExists() {
    await this.ensureConnected();
    await this.ensureGfxSourcesScene({ sceneName: 'GFX-SOURCES', channels: 4 });
    return true;
  }

  /**
   * Helper that ensures the VIDEO-PLAYBACK scene (with 4 video channels) exists.
   */
  async ensureVideoSceneExists() {
    await this.ensureConnected();
    await this.ensureVideoPlaybackScene({ sceneName: 'VIDEO-PLAYBACK', channels: 4 });
    return true;
  }

  /**
   * Attach or detach the GFX-SOURCES utility scene as a source in a target scene.
   * @param {string} targetSceneName
   * @param {boolean} attach
   */
  async ensureOverlayAttachment(targetSceneName, attach) {
    if (!targetSceneName) throw new Error('targetSceneName required');
    await this.ensureConnected();
    await this.ensureGfxSceneExists();

    const overlaySourceName = 'GFX-SOURCES';

    // Does the target scene already contain the overlay?
    const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName: targetSceneName });
    const existing = (sceneItems || []).find(si => si.sourceName === overlaySourceName);

    if (attach) {
      if (!existing) {
        const created = await this.obs.call('CreateSceneItem', {
          sceneName: targetSceneName,
          sourceName: overlaySourceName,
          sceneItemEnabled: true
        });
        const sceneItemId = created.sceneItemId;

        // Push to top of stack (large index = nearer top in OBS)
        try {
          await this.obs.call('SetSceneItemIndex', {
            sceneName: targetSceneName,
            sceneItemId,
            sceneItemIndex: 9999
          });
        } catch (_) { /* noop */ }
      }
      return { ok: true, attached: true };
    } else {
      if (existing) {
        await this.obs.call('RemoveSceneItem', {
          sceneName: targetSceneName,
          sceneItemId: existing.sceneItemId
        });
      }
      return { ok: true, attached: false };
    }
  }
  /**
   * Ensure a given source exists in a target scene and return its sceneItemId.
   * Does not change transform.
   */
  async ensureSourceInScene(targetSceneName, sourceName) {
    await this.ensureConnected();
    if (!targetSceneName || !sourceName) throw new Error('targetSceneName and sourceName required');

    // Try to find an existing scene item for this source
    const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName: targetSceneName });
    const existing = (sceneItems || []).find(si => si.sourceName === sourceName);
    if (existing) return existing.sceneItemId;

    // Otherwise create a scene item
    const created = await this.obs.call('CreateSceneItem', {
      sceneName: targetSceneName,
      sourceName,
      sceneItemEnabled: true
    });
    return created.sceneItemId;
  }

  /**
   * Route helper: add an existing source into a scene (idempotent) and optionally
   * set index/visibility. Returns { sceneItemId }.
   */
  async addExistingSourceToScene(sceneName, sourceName, { index = null, visible = null } = {}) {
    await this.ensureConnected();
    if (!sceneName || !sourceName) throw new Error('sceneName and sourceName required');

    const sceneItemId = await this.ensureSourceInScene(sceneName, sourceName);

    if (typeof visible === 'boolean') {
      try {
        await this.obs.call('SetSceneItemEnabled', {
          sceneName,
          sceneItemId,
          sceneItemEnabled: visible
        });
      } catch (_) { /* optional */ }
    }

    if (typeof index === 'number') {
      try {
        await this.obs.call('SetSceneItemIndex', {
          sceneName,
          sceneItemId,
          sceneItemIndex: index
        });
      } catch (_) { /* optional */ }
    }

    return { sceneItemId };
  }

  /**
   * Copy the transform from one scene item to another in the same scene, adapting
   * for aspect ratio and scaling/cropping so the target fills the placeholder box
   * without stretching.
   */
  async copyTransformBetweenItems(sceneName, fromSceneItemId, toSceneItemId) {
    await this.ensureConnected();
    if (!sceneName || !fromSceneItemId || !toSceneItemId) {
      throw new Error('sceneName, fromSceneItemId and toSceneItemId are required');
    }

    // Read transforms for source (placeholder) and target (media/cg)
    const { sceneItemTransform: ph } = await this.obs.call('GetSceneItemTransform', {
      sceneName,
      sceneItemId: fromSceneItemId
    });
    const { sceneItemTransform: tg } = await this.obs.call('GetSceneItemTransform', {
      sceneName,
      sceneItemId: toSceneItemId
    });

    // Helper guards
    const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const gt0 = v => (typeof v === 'number' && v > 0 ? v : 0);

    // Placeholder visual box (absolute on canvas)
    const phScaleX = gt0(ph.scaleX) || 1;
    const phScaleY = gt0(ph.scaleY) || 1;
    const phW = gt0(ph.width) || (gt0(ph.sourceWidth) ? ph.sourceWidth * phScaleX : 0);
    const phH = gt0(ph.height) || (gt0(ph.sourceHeight) ? ph.sourceHeight * phScaleY : 0);
    const phX = num(ph.positionX);
    const phY = num(ph.positionY);

    if (phW <= 0 || phH <= 0) {
      throw new Error('Placeholder has no measurable size (width/height)');
    }

    // Target intrinsic size (unscaled)
    const mediaW = gt0(tg.sourceWidth);
    const mediaH = gt0(tg.sourceHeight);
    if (mediaW <= 0 || mediaH <= 0) {
      // Fallback to old behavior if we can't read the target
      const basePayload = {
        positionX: phX,
        positionY: phY,
        rotation: num(ph.rotation),
        alignment: 5, // top-left
        scaleX: 1,
        scaleY: 1,
        width: phW,
        height: phH,
        cropLeft: 0,
        cropRight: 0,
        cropTop: 0,
        cropBottom: 0,
        boundsType: 'OBS_BOUNDS_NONE',
        boundsAlignment: 0
      };
      await this.obs.call('SetSceneItemTransform', {
        sceneName,
        sceneItemId: toSceneItemId,
        sceneItemTransform: basePayload
      });
      return { ok: true, fallback: true };
    }

    const phAspect = phW / phH;
    const mediaAspect = mediaW / mediaH;
    const EPS = 1e-3;

    // We preserve aspect at all times (never stretch).
    // Strategy:
    //  - If aspect ~ equal: scale by height (or width) to fill exactly.
    //  - If media is wider than placeholder (mediaAspect > phAspect): fit by height and crop left/right equally.
    //  - If media is taller/narrower (mediaAspect < phAspect): fit by height and center horizontally (letterbox), no crop.
    //
    // Notes on OBS transform semantics:
    //  - crop values are in *source pixels prior to scaling*
    //  - scaleX/scaleY are uniform here to preserve aspect
    //  - we avoid setting width/height directly to prevent non-uniform stretching

    let scale = phH / mediaH; // default: fit by height
    let posX = phX;
    let posY = phY;
    let cropLeft = 0;
    let cropRight = 0;
    let cropTop = 0;
    let cropBottom = 0;

    if (Math.abs(mediaAspect - phAspect) <= EPS) {
      // Same aspect: scale to fill box exactly and align top-left
      scale = phH / mediaH; // same as phW/mediaW
      posX = phX;
      posY = phY;
      cropLeft = cropRight = cropTop = cropBottom = 0;
    } else if (mediaAspect > phAspect) {
      // Media is wider than placeholder -> scale to match height and crop L/R equally
      scale = phH / mediaH;
      const visualW = mediaW * scale;
      const excessW = Math.max(0, visualW - phW); // visual pixels to trim
      if (excessW > 0) {
        const cropEachSide = Math.round((excessW / 2) / scale); // convert to source pixels
        cropLeft = cropRight = cropEachSide;
      }
      posX = phX; // after crop, visual width == phW, align to placeholder left
      posY = phY;
    } else {
      // mediaAspect < phAspect -> media is taller/narrower than placeholder
      // Fit by height, center horizontally inside the placeholder (no crop)
      scale = phH / mediaH;
      const visualW = mediaW * scale;
      posX = phX + (phW - visualW) / 2;
      posY = phY;
      cropLeft = cropRight = cropTop = cropBottom = 0;
    }

    // Always disable bounds on the target so they don't conflict with our math
    const payload = {
      positionX: posX,
      positionY: posY,
      rotation: num(ph.rotation), // carry rotation from placeholder if present
      alignment: 5,               // top-left
      scaleX: scale,
      scaleY: scale,
      cropLeft,
      cropRight,
      cropTop,
      cropBottom,
      boundsType: 'OBS_BOUNDS_NONE',
      boundsAlignment: 0
    };

    await this.obs.call('SetSceneItemTransform', {
      sceneName,
      sceneItemId: toSceneItemId,
      sceneItemTransform: payload
    });

    return { ok: true };
  }

  /**
   * Route helper: copy transform from a placeholder Color Source onto a target source
   * (e.g., Browser source `CG-1`) within the same scene. You may specify either
   * `targetSourceName` directly or a `channel` number (which maps to `CG-${channel}`).
   */
  async copyTransformFromPlaceholderToSource(sceneName, {
    placeholderId = null,
    placeholderIndex = null,
    targetSourceName = null,
    channel = null
  } = {}) {
    await this.ensureConnected();
    if (!sceneName) throw new Error('sceneName required');

    // Resolve the placeholder sceneItemId
    let fromId = placeholderId;
    if (!fromId) {
      const { placeholders } = await this.getScenePlaceholders(sceneName);
      if (!Array.isArray(placeholders) || placeholders.length === 0) {
        throw new Error('No placeholders found in scene');
      }
      if (placeholderIndex != null) {
        const ph = placeholders[Number(placeholderIndex) - 1];
        if (!ph) throw new Error(`Placeholder index ${placeholderIndex} not found`);
        fromId = ph.id;
      } else {
        fromId = placeholders[0].id; // default to first placeholder
      }
    }

    // Resolve the target source name
    let sourceName = targetSourceName;
    if (!sourceName && channel != null) {
      sourceName = `CG-${channel}`;
    }
    if (!sourceName) throw new Error('targetSourceName or channel required');

    // Ensure target exists in the scene and get its sceneItemId
    const toId = await this.ensureSourceInScene(sceneName, sourceName);

    // Copy transform
    await this.copyTransformBetweenItems(sceneName, fromId, toId);

    // Optionally push to top for visibility
    try {
      await this.obs.call('SetSceneItemIndex', {
        sceneName,
        sceneItemId: toId,
        sceneItemIndex: 9999
      });
    } catch (_) { /* optional */ }

    return { ok: true, sceneName, fromId, toId, sourceName };
  }

  /**
   * Convenience: ensure CG-X exists in target scene and paste transform from a placeholder color source.
   * @param {string} sceneName
   * @param {object} opts
   * @param {number} opts.channel             - channel number (1..N) maps to source name `CG-${n}`
   * @param {number} [opts.placeholderId]     - exact sceneItemId of the placeholder to copy from
   * @param {number} [opts.placeholderIndex]  - 1-based index into placeholders as returned by getScenePlaceholders()
   */
  async pastePlaceholderTransformToChannel(sceneName, { channel = 1, placeholderId = null, placeholderIndex = null } = {}) {
    await this.ensureConnected();
    if (!sceneName) throw new Error('sceneName required');

    // Identify placeholder sceneItemId
    let fromId = placeholderId;
    if (!fromId) {
      const { placeholders } = await this.getScenePlaceholders(sceneName);
      if (!Array.isArray(placeholders) || placeholders.length === 0) {
        throw new Error('No placeholders found in scene');
      }
      if (placeholderIndex != null) {
        const ph = placeholders[Number(placeholderIndex) - 1];
        if (!ph) throw new Error(`Placeholder index ${placeholderIndex} not found`);
        fromId = ph.id;
      } else {
        // default to first placeholder
        fromId = placeholders[0].id;
      }
    }

    // Ensure the CG source exists in the target scene, capture its sceneItemId
    const sourceName = `CG-${channel}`;
    const toId = await this.ensureSourceInScene(sceneName, sourceName);

    // Copy transform from placeholder to CG-X instance
    await this.copyTransformBetweenItems(sceneName, fromId, toId);

    // Push CG to top of the stack so it appears above placeholders/content
    try {
      await this.obs.call('SetSceneItemIndex', {
        sceneName,
        sceneItemId: toId,
        sceneItemIndex: 9999
      });
    } catch (_) { /* optional */ }

    return { ok: true, sceneName, channel, fromId, toId };
  }

  /**
   * Replace (if present) an existing source in a scene with a new target source, then
   * paste a placeholder's transform onto the new source.
   * Either provide `targetSourceName` directly, or `channel` (maps to CG-${n}).
   * Optionally provide `removeSourceName` (or `removeChannel`) to be removed first.
   */
  async replaceWithPlaceholderTransform(sceneName, {
    placeholderId = null,
    placeholderIndex = null,
    targetSourceName = null,
    channel = null,
    removeSourceName = null,
    removeChannel = null,
    pushToTop = true
  } = {}) {
    await this.ensureConnected();
    if (!sceneName) throw new Error('sceneName required');

    // Resolve placeholder sceneItemId
    let fromId = placeholderId;
    if (!fromId) {
      const { placeholders } = await this.getScenePlaceholders(sceneName);
      if (!Array.isArray(placeholders) || placeholders.length === 0) {
        throw new Error('No placeholders found in scene');
      }
      if (placeholderIndex != null) {
        const ph = placeholders[Number(placeholderIndex) - 1];
        if (!ph) throw new Error(`Placeholder index ${placeholderIndex} not found`);
        fromId = ph.id;
      } else {
        fromId = placeholders[0].id;
      }
    }

    // Resolve removal source name if provided
    let removeName = removeSourceName;
    if (!removeName && removeChannel != null) {
      removeName = `CG-${removeChannel}`;
    }
    if (removeName) {
      try {
        await this.removeSourceFromScene(sceneName, removeName);
      } catch (err) {
        // non-fatal
        console.warn('[ObsService] replaceWithPlaceholderTransform: remove failed', err);
      }
    }

    // Resolve/add target source
    let addName = targetSourceName;
    if (!addName && channel != null) {
      addName = `CG-${channel}`;
    }
    if (!addName) throw new Error('targetSourceName or channel required');

    const toId = await this.ensureSourceInScene(sceneName, addName);

    // Copy transform
    await this.copyTransformBetweenItems(sceneName, fromId, toId);

    // Optionally bring to front
    if (pushToTop) {
      try {
        await this.obs.call('SetSceneItemIndex', {
          sceneName,
          sceneItemId: toId,
          sceneItemIndex: 9999
        });
      } catch (_) { /* optional */ }
    }

    return { ok: true, sceneName, fromId, toId, sourceName: addName };
  }

  /**
   * Find the sceneItemId for a given source in a scene.
   * Returns the sceneItemId or null if not found.
   */
  async findSceneItemId(sceneName, sourceName) {
    await this.ensureConnected();
    if (!sceneName || !sourceName) throw new Error('sceneName and sourceName required');
    const { sceneItems } = await this.obs.call('GetSceneItemList', { sceneName });
    const si = (sceneItems || []).find(si => si.sourceName === sourceName);
    return si ? si.sceneItemId : null;
  }

  /**
   * Remove a source from a scene by name.
   * Returns { ok: true, removed: true/false }
   */
  async removeSourceFromScene(sceneName, sourceName) {
    await this.ensureConnected();
    if (!sceneName || !sourceName) throw new Error('sceneName and sourceName required');
    const sceneItemId = await this.findSceneItemId(sceneName, sourceName);
    if (!sceneItemId) {
      return { ok: true, removed: false };
    }
    await this.obs.call('RemoveSceneItem', { sceneName, sceneItemId });
    return { ok: true, removed: true };
  }

  /**
   * Get all audio sources from OBS.
   * Returns all inputs that have audio capabilities.
   */
  async getAudioSources() {
    await this.ensureConnected();
    try {
      const { inputs } = await this.obs.call('GetInputList');
      
      // Filter for sources that have audio capabilities
      const audioSources = inputs.filter(input => {
        const kind = String(input.inputKind || '').toLowerCase();
        const name = String(input.inputName || '');
        
        // Include sources that are audio-related
        return (
          kind.includes('coreaudio') ||
          kind.includes('audio') ||
          kind.includes('capture') ||
          kind.includes('input') ||
          kind.includes('mic') ||
          kind.includes('wasapi') ||
          kind.includes('alsa') ||
          kind.includes('pulse') ||
          /\b(mic|audio|sound)\b/i.test(name) ||
          // Include media sources that might have audio
          kind.includes('ffmpeg_source') ||
          kind.includes('vlc_source') ||
          kind.includes('browser_source')
        );
      });

      // Return just the names and kinds for the frontend
      return audioSources.map(source => ({
        name: source.inputName,
        kind: source.inputKind
      }));
    } catch (err) {
      console.error('[ObsService] Error getting audio sources:', err);
      return [];
    }
  }
}
// Export a singleton instance used by routes
module.exports = new ObsService();