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

// Get placeholders for a specific template
router.get('/:id/placeholders', async (req, res) => {
  try {
    const { id } = req.params;
    const placeholders = templateRegistry.getPlaceholders(id);
    return res.json(placeholders);
  } catch (err) {
    console.error('Error getting placeholders:', err);
    res.status(500).json({ error: 'Failed to load placeholders' });
  }
});

// Screenshot template with data
router.get('/:id/screenshot', async (req, res) => {
  try {
    const puppeteer = require('puppeteer');
    const templateId = req.params.id;
    const data = req.query.data ? JSON.parse(req.query.data) : {};
    
    console.log(`Screenshot request for template: ${templateId} with data:`, data);
    
    const templatePath = templateRegistry.getTemplatePath(templateId);
    if (!templatePath) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Load template
      await page.goto(`file://${templatePath}`);
      
      // Inject template data if provided
      if (Object.keys(data).length > 0) {
        await page.evaluate((templateData) => {
          if (window.updateFields) {
            window.updateFields(templateData);
          } else if (window.updateTemplateData) {
            window.updateTemplateData(templateData);
          } else if (window.update) {
            window.update(templateData);
          }
          
          if (window.play) {
            window.play();
          }
        }, data);
      }
      
      // Wait for rendering
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false
      });
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
      res.send(screenshot);
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (err) {
    console.error('Error generating template screenshot:', err);
    res.status(500).json({ error: 'Failed to generate screenshot', details: err.message });
  }
});

// Rescan templates directory
router.post('/rescan', async (req, res) => {
  try {
    const templates = await templateRegistry.rescan();
    res.json({ templates, refreshed: true });
  } catch (err) {
    console.error('Error rescanning templates:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;