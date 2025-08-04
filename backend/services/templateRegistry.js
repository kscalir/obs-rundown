const fs = require('fs');
const path = require('path');

class TemplateRegistry {
  constructor() {
    this.templates = {};
    this.templatesDir = path.join(__dirname, '../templates');
    console.log(`Template registry initialized with directory: ${this.templatesDir}`);
  }
  
  // Initialize registry
  async initialize() {
    console.log(`Scanning templates directory: ${this.templatesDir}`);
    
    // Create templates directory if it doesn't exist
    if (!fs.existsSync(this.templatesDir)) {
      console.log(`Creating templates directory: ${this.templatesDir}`);
      fs.mkdirSync(this.templatesDir, { recursive: true });
      
      // Create a sample template
      const sampleDir = path.join(this.templatesDir, 'lower-third');
      fs.mkdirSync(sampleDir, { recursive: true });
      
      // Create sample template.xml
      const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<template>
  <name>Lower Third</name>
  <description>Standard lower third template</description>
  <author>System</author>
  <version>1.0</version>
  <thumbnail>thumbnail.png</thumbnail>
  <html>index.html</html>
  <parameters>
    <parameter id="name" type="STRING" default="Name" info="Person's name"/>
    <parameter id="title" type="STRING" default="Title" info="Person's title"/>
    <parameter id="color" type="COLOR" default="#1976d2" info="Background color"/>
  </parameters>
</template>`;
      
      fs.writeFileSync(path.join(sampleDir, 'template.xml'), sampleXml);
      
      // Create sample index.html
      const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .lower-third { position: absolute; bottom: 100px; left: 50px; background: var(--color, #1976d2); color: white; padding: 15px; border-radius: 5px; }
    .name { font-size: 24px; font-weight: bold; }
    .title { font-size: 18px; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="lower-third" id="container">
    <div class="name" id="nameField">Name</div>
    <div class="title" id="titleField">Title</div>
  </div>
  <script>
    function updateFields(data) {
      document.getElementById('nameField').textContent = data.name || 'Name';
      document.getElementById('titleField').textContent = data.title || 'Title';
      document.documentElement.style.setProperty('--color', data.color || '#1976d2');
    }
    
    // Listen for messages from parent window
    window.addEventListener('message', function(event) {
      if (event.data && typeof event.data === 'object') {
        updateFields(event.data);
      }
    });
  </script>
</body>
</html>`;
      
      fs.writeFileSync(path.join(sampleDir, 'index.html'), sampleHtml);
    }
    
    try {
      // Add a default template to the registry
      this.templates['lower-third'] = {
        id: 'lower-third',
        name: 'Lower Third',
        description: 'Standard lower third template',
        author: 'System',
        version: '1.0',
        parameters: [
          { id: 'name', type: 'STRING', default: 'Name', info: "Person's name" },
          { id: 'title', type: 'STRING', default: 'Title', info: "Person's title" },
          { id: 'color', type: 'COLOR', default: '#1976d2', info: 'Background color' }
        ],
        thumbnail: 'thumbnail.png',
        html: 'index.html',
        path: path.join(this.templatesDir, 'lower-third')
      };
      
      console.log(`Template registry initialized with ${Object.keys(this.templates).length} templates`);
      return true;
    } catch (err) {
      console.error('Failed to initialize template registry:', err);
      return false;
    }
  }
  
  // Get all templates
  getAllTemplates() {
    console.log(`Returning ${Object.keys(this.templates).length} templates`);
    return Object.values(this.templates);
  }
  
  // Get a specific template by ID
  getTemplate(id) {
    return this.templates[id] || null;
  }
  
  // Get path to template HTML file
  getTemplatePath(id) {
    const template = this.templates[id];
    if (!template) return null;
    
    return path.join(template.path, template.html);
  }
}

// Create and export singleton instance
const templateRegistry = new TemplateRegistry();
module.exports = templateRegistry;