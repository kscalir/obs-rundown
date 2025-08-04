const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Templates directory is at the root level
const templatesDir = path.join(__dirname, '../../templates');

router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(templatesDir);
    const templates = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(templatesDir, file), 'utf8');
        templates.push(JSON.parse(content));
      }
    }
    
    res.json(templates);
  } catch (err) {
    console.error('Error reading templates:', err);
    res.status(500).json({ error: 'Failed to read templates' });
  }
});

module.exports = router;