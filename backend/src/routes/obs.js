const express = require('express');
const router = express.Router();
const obsService = require('../../services/obs');

// GET /api/obs/scenes - List all scenes
router.get('/scenes', async (req, res) => {
  try {
    const { scenes, currentProgramSceneName } = await obsService.getScenes();
    res.json({ scenes, currentProgramSceneName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obs/sources/:sceneName - List sources for a scene
router.get('/sources/:sceneName', async (req, res) => {
  try {
    const sceneName = decodeURIComponent(req.params.sceneName);
    const sources = await obsService.getSourcesForScene(sceneName);
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
