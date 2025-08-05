const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const templateRegistry = require('../../services/templateRegistry');

// Get all templates
router.get('/', async (req, res) => {
  try {
    console.log('Templates API: Getting all templates');
    const templates = templateRegistry.getAllTemplates();
    console.log(`Templates API: Returning ${templates.length} templates`);
    res.json(templates);
  } catch (err) {
    console.error('Error getting templates:', err);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get specific template
router.get('/:id', async (req, res) => {
  try {
    const template = templateRegistry.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (err) {
    console.error('Error getting template:', err);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Preview template with data
router.get('/:id/preview', async (req, res) => {
  try {
    console.log(`Preview request for template: ${req.params.id}`);
    console.log(`Query data: ${req.query.data}`);
    
    const templatePath = templateRegistry.getTemplatePath(req.params.id);
    if (!templatePath) {
      console.error(`Template path not found for: ${req.params.id}`);
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log(`Reading template file: ${templatePath}`);
    
    // Read the HTML file
    let htmlContent = await fs.readFile(templatePath, 'utf8');
    
    console.log(`Template HTML loaded, length: ${htmlContent.length}`);
    
    // Set proper headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow iframe embedding
    
    // Send the HTML
    res.send(htmlContent);
  } catch (err) {
    console.error('Error serving template preview:', err);
    res.status(500).json({ error: 'Failed to load template preview', details: err.message });
  }
});

module.exports = router;