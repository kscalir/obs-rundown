const express = require('express');
const router = express.Router();
const obsService = require('../../services/obs');

/**
 * OBS Routes
 * - GET  /api/obs/scenes                      -> list scenes
 * - GET  /api/obs/sources?scene=NAME          -> list sources in a scene (query)
 * - GET  /api/obs/sources/:sceneName          -> list sources in a scene (path)
 * - GET  /api/obs/placeholders?scene=NAME     -> list placeholder boxes in scene
 * - GET  /api/obs/screenshot?scene=NAME       -> base64 PNG screenshot of scene
 * - POST /api/obs/replace-placeholders        -> replace placeholders (body: { sceneName, mappings })
 * - POST /api/obs/overlay/ensure              -> attach/detach overlay into a scene (body: { sceneName, attach })
 */

// GET /api/obs/scenes - List all scenes
router.get('/scenes', async (req, res) => {
  try {
    const { scenes, currentProgramSceneName } = await obsService.getScenes();
    res.json({ scenes, currentProgramSceneName });
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
    // On error, still return a consistent shape to avoid .map crashes
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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

// (removed /api/obs/overlays/ensure route)

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

// POST /api/obs/paste-placeholder-transform
// Body: { sceneName: string, channel: number, placeholderIndex?: number, placeholderId?: string }
// Copies the transform from the given placeholder (by index or id) to the CG-{channel} source in the same scene.
// Requires: sceneName (string), channel (number), and either placeholderIndex (number) or placeholderId (string)
router.post('/paste-placeholder-transform', async (req, res) => {
  try {
    const { sceneName, placeholderIndex, placeholderId, channel } = req.body || {};

    if (!sceneName || typeof channel !== 'number' || (typeof placeholderIndex !== 'number' && !placeholderId)) {
      return res.status(400).json({
        error: 'sceneName and channel are required, and at least one of placeholderIndex (number) or placeholderId (string) must be provided',
      });
    }

    // Our CG sources are named like CG-1, CG-2, etc.
    const targetSourceName = `CG-${channel}`;

    // Delegate to the service to do the OBS-side copy/paste of transform.
    // The service should handle whether placeholderIndex or placeholderId is provided.
    const result = await obsService.copyTransformFromPlaceholderToSource(
      sceneName,
      typeof placeholderIndex === 'number' ? placeholderIndex : undefined,
      targetSourceName,
      placeholderId
    );

    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('paste-placeholder-transform failed:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;