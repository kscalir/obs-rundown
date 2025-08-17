const express = require('express');
const router = express.Router();
const obsService = require('../../services/obs');

/**
 * OBS Routes
 * - GET  /api/obs/scenes                      -> list scenes
 * - GET  /api/obs/transitions                 -> list available transitions
 * - GET  /api/obs/sources?scene=NAME          -> list sources in a scene (query)
 * - GET  /api/obs/sources/:sceneName          -> list sources in a scene (path)
 * - GET  /api/obs/placeholders?scene=NAME     -> list placeholder boxes in scene
 * - GET  /api/obs/screenshot?scene=NAME       -> base64 PNG screenshot of scene
 * - GET  /api/obs/audio-sources               -> list all audio-capable sources
 * - POST /api/obs/add-source-to-scene         -> add existing source to a scene (body: { sceneName, sourceName, index?, visible? })
 * - POST /api/obs/replace-placeholders        -> replace placeholders (body: { sceneName, mappings })
 * - POST /api/obs/overlay/ensure              -> attach/detach overlay into a scene (body: { sceneName, attach })
 */

// GET /api/obs/transitions - List all available transitions
router.get('/transitions', async (req, res) => {
  try {
    const { transitions, currentTransition } = await obsService.getTransitions();
    res.json({ transitions, currentTransition });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/scenes - List all scenes
router.get('/scenes', async (req, res) => {
  try {
    const { scenes, currentProgramSceneName } = await obsService.getScenes();
    // Hide utility scenes from UI module lists
    const hiddenScenes = new Set(['GFX-SOURCES', 'VIDEO-PLAYBACK']);
    const filteredScenes = Array.isArray(scenes)
      ? scenes.filter((name) => !hiddenScenes.has(name))
      : [];
    res.json({ scenes: filteredScenes, currentProgramSceneName });
    return;
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/sources?scene=SceneName - List sources for a scene (query form)
router.get('/sources', async (req, res) => {
  try {
    const sceneName = req.query.scene;
    if (!sceneName) return res.status(400).json({ error: 'Missing scene query parameter' });
    const sources = await obsService.getSourcesForScene(sceneName);
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/sources/:sceneName - List sources for a scene (path form)
router.get('/sources/:sceneName', async (req, res) => {
  try {
    const sceneName = decodeURIComponent(req.params.sceneName || '');
    if (!sceneName) return res.status(400).json({ error: 'Missing scene name' });
    const sources = await obsService.getSourcesForScene(sceneName);
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/placeholders?scene=My%20Scene
router.get('/placeholders', async (req, res) => {
  try {
    const sceneName = String(req.query.scene || '');
    if (!sceneName) {
      return res.json([]); // frontend expects an array
    }

    const result = await obsService.getScenePlaceholders(sceneName);
    const { placeholders = [] } = result || {};

    // Always return an array for the frontend
    res.json(Array.isArray(placeholders) ? placeholders : []);
  } catch (err) {
    console.error('[OBS API] Error getting placeholders:', err.message);
    // On error, still return empty array to avoid .map crashes in frontend
    res.json([]);
  }
});

// GET /api/obs/screenshot?scene=SceneName[&width=...&height=...]
router.get('/screenshot', async (req, res) => {
  try {
    const scene = req.query.scene;
    if (!scene) {
      return res.status(400).json({ error: 'Missing scene query parameter' });
    }
    const width = req.query.width ? parseInt(req.query.width, 10) : undefined;
    const height = req.query.height ? parseInt(req.query.height, 10) : undefined;
    const screenshot = await obsService.getSceneScreenshot(scene, { width, height });
    res.json({ screenshot });
  } catch (err) {
    console.error('[OBS API] Error getting screenshot:', err.message);
    // Return a fallback response that won't break the frontend
    res.json({ screenshot: null, error: 'OBS connection failed' });
  }
});

// POST /api/obs/replace-placeholders
// Body: { sceneName, mappings }
router.post('/replace-placeholders', async (req, res) => {
  try {
    const { sceneName, mappings } = req.body;
    if (!sceneName || !mappings) {
      return res.status(400).json({ error: 'Missing sceneName or mappings in request body' });
    }
    await obsService.replacePlaceholders(sceneName, mappings);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obs/overlay/ensure  { sceneName: string, attach: boolean }
router.post('/overlay/ensure', async (req, res) => {
  try {
    const { sceneName, attach } = req.body;
    if (!sceneName || typeof attach !== 'boolean') {
      return res.status(400).json({ error: 'sceneName and boolean attach are required' });
    }
    const result = await obsService.ensureOverlayAttachment(sceneName, attach);
    return res.json(result); // { ok:true, attached: true/false }
  } catch (err) {
    console.error('overlay/ensure failed:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/obs/video-playback/ensure
// Ensures the VIDEO-PLAYBACK scene exists (and is positioned at the bottom) and that its 4 media player channels are created.
// Body: {}
router.post('/video-playback/ensure', async (req, res) => {
  try {
    const result = await obsService.ensureVideoPlaybackScene();
    // Expected shape from service: { ok:true, sceneName:'VIDEO-PLAYBACK', created:boolean, positionedAtBottom:boolean, playersCreated:number }
    return res.json(result);
  } catch (err) {
    console.error('video-playback/ensure failed:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/obs/add-source-to-scene
// Body: { sceneName: string, sourceName: string, index?: number, visible?: boolean }
// Adds an existing source into the specified scene. If index is provided, inserts at that position (top=0).
router.post('/add-source-to-scene', async (req, res) => {
  try {
    const { sceneName, sourceName, index, visible } = req.body || {};
    if (!sceneName || !sourceName) {
      return res.status(400).json({ error: 'sceneName and sourceName are required' });
    }

    const opts = {};
    if (typeof index === 'number') opts.index = index;
    if (typeof visible === 'boolean') opts.visible = visible;

    const result = await obsService.addExistingSourceToScene(sceneName, sourceName, opts);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('add-source-to-scene failed:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/obs/paste-placeholder-transform
// Body: { sceneName: string, targetSourceName?: string, channel?: number, placeholderIndex?: number, placeholderId?: string }
// Copies the transform from the given placeholder (by index or id) to the target source in the same scene.
// Provide either `targetSourceName` directly, or `channel` (which maps to `CG-{channel}`).
router.post('/paste-placeholder-transform', async (req, res) => {
  try {
    const { sceneName, placeholderIndex, placeholderId, channel, targetSourceName: explicitTarget } = req.body || {};

    if (!sceneName) {
      return res.status(400).json({ error: 'sceneName is required' });
    }

    const targetSourceName = explicitTarget || (typeof channel === 'number' ? `CG-${channel}` : null);
    if (!targetSourceName) {
      return res.status(400).json({ error: 'targetSourceName or channel required' });
    }

    if (typeof placeholderIndex !== 'number' && !placeholderId) {
      return res.status(400).json({
        error: 'At least one of placeholderIndex (number) or placeholderId (string) must be provided',
      });
    }

    const result = await obsService.copyTransformFromPlaceholderToSource(sceneName, {
      placeholderIndex: (typeof placeholderIndex === 'number' ? placeholderIndex : null),
      placeholderId: placeholderId ?? null,
      targetSourceName,
    });

    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('paste-placeholder-transform failed:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/obs/replace-with-placeholder-transform
router.post('/replace-with-placeholder-transform', async (req, res) => {
  try {
    const {
      sceneName,
      placeholderId,
      placeholderIndex,
      targetSourceName,
      channel,
      removeSourceName,
      removeChannel,
      pushToTop
    } = req.body || {};

    if (!sceneName) return res.status(400).json({ error: 'sceneName required' });
    if (!targetSourceName && typeof channel !== 'number') {
      return res.status(400).json({ error: 'targetSourceName or channel required' });
    }

    const result = await obsService.replaceWithPlaceholderTransform(sceneName, {
      placeholderId,
      placeholderIndex,
      targetSourceName,
      channel,
      removeSourceName,
      removeChannel,
      pushToTop
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obs/remove-source-from-scene
router.post('/remove-source-from-scene', async (req, res) => {
  try {
    const { sceneName, sourceName } = req.body || {};
    if (!sceneName || !sourceName) {
      return res.status(400).json({ error: 'sceneName and sourceName required' });
    }
    const result = await obsService.removeSourceFromScene(sceneName, sourceName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/audio-sources - List all audio sources
router.get('/audio-sources', async (req, res) => {
  try {
    const audioSources = await obsService.getAudioSources();
    res.json(audioSources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;