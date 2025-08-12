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
    if (this.connected || this.connecting) {
      while (this.connecting && !this.connected) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 50));
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
    } catch (err) {
      this.connected = false;
      throw err;
    } finally {
      this.connecting = false;
    }
  }

  // --- High-level API used by routes ---

  async getVideoSettings() {
    await this.ensureConnected();
    try {
      const { baseWidth, baseHeight, outputWidth, outputHeight } = await this.obs.call('GetVideoSettings');
      return { baseWidth, baseHeight, outputWidth, outputHeight };
    } catch (_) {
      return { baseWidth: undefined, baseHeight: undefined, outputWidth: undefined, outputHeight: undefined };
    }
  }

  async getScenes() {
    await this.ensureConnected();
    const { scenes } = await this.obs.call('GetSceneList');
    const { currentProgramSceneName } = await this.obs.call('GetCurrentProgramScene');
    // Hide the internal utility scene from the toolbox
    const filteredScenes = scenes.filter(s => s.sceneName !== 'GFX-SOURCES');
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

  async getSceneScreenshot(sceneName, { width = 640, height, format = 'png' } = {}) {
    await this.ensureConnected();
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
  async getScenePlaceholders(sceneName) {
    await this.ensureConnected();
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
   * Backward-compatible helper that ensures the GFX-SOURCES scene (with CG-1..4)
   * exists. Uses the existing ensureGfxSourcesScene() method.
   */
  async ensureGfxSceneExists() {
    await this.ensureConnected();
    await this.ensureGfxSourcesScene({ sceneName: 'GFX-SOURCES', channels: 4 });
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
   * Copy the full transform (including bounds/crop/scale/position/alignment/rotation)
   * from one scene item to another, both in the same scene.
   */
  async copyTransformBetweenItems(sceneName, fromSceneItemId, toSceneItemId) {
    await this.ensureConnected();
    if (!sceneName || !fromSceneItemId || !toSceneItemId) {
      throw new Error('sceneName, fromSceneItemId and toSceneItemId are required');
    }

    const { sceneItemTransform } = await this.obs.call('GetSceneItemTransform', {
      sceneName,
      sceneItemId: fromSceneItemId
    });

    // Apply exactly the same transform to the target item
    await this.obs.call('SetSceneItemTransform', {
      sceneName,
      sceneItemId: toSceneItemId,
      sceneItemTransform: {
        positionX: sceneItemTransform.positionX,
        positionY: sceneItemTransform.positionY,
        rotation: sceneItemTransform.rotation,
        alignment: sceneItemTransform.alignment,
        scaleX: sceneItemTransform.scaleX,
        scaleY: sceneItemTransform.scaleY,
        width: sceneItemTransform.width,
        height: sceneItemTransform.height,
        boundsType: sceneItemTransform.boundsType,
        boundsAlignment: sceneItemTransform.boundsAlignment,
        boundsWidth: sceneItemTransform.boundsWidth,
        boundsHeight: sceneItemTransform.boundsHeight,
        cropLeft: sceneItemTransform.cropLeft,
        cropRight: sceneItemTransform.cropRight,
        cropTop: sceneItemTransform.cropTop,
        cropBottom: sceneItemTransform.cropBottom
      }
    });

    return { ok: true };
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
}
// Export a singleton instance used by routes
module.exports = new ObsService();