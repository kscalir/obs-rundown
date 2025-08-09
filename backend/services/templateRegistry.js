const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js'); // You'll need: npm install xml2js

class TemplateRegistry {
  constructor() {
    this.templates = {};
    this.templatesDir = path.join(__dirname, '../templates');
    console.log(`Template registry initialized with directory: ${this.templatesDir}`);
  }
  
  // Parse XML template file
  async parseTemplateXml(xmlPath) {
    try {
      const xmlContent = fs.readFileSync(xmlPath, 'utf8');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlContent);
      
      const template = result.template;
      const parameters = [];
      
      if (template.parameters && template.parameters[0] && template.parameters[0].parameter) {
        template.parameters[0].parameter.forEach(param => {
          parameters.push({
            id: param.$.id,
            type: param.$.type,
            default: param.$.default || param._,
            info: param.$.info || ''
          });
        });
      }
      
      return {
        name: template.name[0],
        description: template.description[0],
        author: template.author ? template.author[0] : 'Unknown',
        version: template.version ? template.version[0] : '1.0',
        html: template.html ? template.html[0] : 'index.html',
        thumbnail: template.thumbnail ? template.thumbnail[0] : null,
        parameters
      };
    } catch (err) {
      console.error('Error parsing XML:', err);
      return null;
    }
  }
  
  // Initialize registry by scanning templates directory
  async initialize() {
    console.log(`Scanning templates directory: ${this.templatesDir}`);
    
    // Create templates directory if it doesn't exist
    if (!fs.existsSync(this.templatesDir)) {
      console.log(`Creating templates directory: ${this.templatesDir}`);
      fs.mkdirSync(this.templatesDir, { recursive: true });
      await this.createSampleTemplate();
    }
    
    try {
      // Scan for template directories
      const items = fs.readdirSync(this.templatesDir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          const templateDir = path.join(this.templatesDir, item.name);
          const xmlPath = path.join(templateDir, 'template.xml');
          
          if (fs.existsSync(xmlPath)) {
            console.log(`Found template: ${item.name}`);
            const templateData = await this.parseTemplateXml(xmlPath);
            
            if (templateData) {
              this.templates[item.name] = {
                id: item.name,
                ...templateData,
                path: templateDir
              };
              console.log(`Loaded template: ${templateData.name}`);
            }
          }
        }
      }
      
      console.log(`Template registry initialized with ${Object.keys(this.templates).length} templates`);
      return true;
    } catch (err) {
      console.error('Failed to initialize template registry:', err);
      return false;
    }
  }
  
  async createSampleTemplate() {
    const sampleDir = path.join(this.templatesDir, 'lower-third');
    console.log(`Creating sample template in: ${sampleDir}`);
    
    fs.mkdirSync(sampleDir, { recursive: true });
    
    // Create sample template.xml
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<template>
  <name>Lower Third</name>
  <description>Name and title lower third graphic</description>
  <author>Rundown App</author>
  <version>1.0</version>
  <thumbnail>thumbnail.png</thumbnail>
  <html>index.html</html>
  <parameters>
    <parameter id="f0" type="STRING" default="Name" info="Name"/>
    <parameter id="f1" type="STRING" default="Title" info="Title or description"/>
    <parameter id="color" type="COLOR" default="#1976d2" info="Background Color"/>
  </parameters>
</template>`;
    
    fs.writeFileSync(path.join(sampleDir, 'template.xml'), sampleXml);
    console.log('Created template.xml');
    
    // Create sample index.html
    const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      font-family: Arial, sans-serif; 
      background: #222;
      position: relative;
    }
    
    .lower-third { 
      position: absolute; 
      bottom: 120px;
      left: 80px;
      background: var(--color, #1976d2); 
      color: white; 
      padding: 20px 30px; 
      border-radius: 8px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      max-width: 600px;
    }
    
    .name { 
      font-size: 32px; 
      font-weight: bold; 
      margin-bottom: 8px; 
      line-height: 1.2;
    }
    
    .title { 
      font-size: 24px; 
      opacity: 0.95; 
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <div class="lower-third" id="container">
    <div class="name" id="nameField">Name</div>
    <div class="title" id="titleField">Title</div>
  </div>
  
  <script>
    console.log('Template: loaded and ready');
    
    function updateFields(data) {
      console.log('Template: data received', data);
      
      const nameField = document.getElementById('nameField');
      const titleField = document.getElementById('titleField');
      
      if (nameField) nameField.textContent = data.f0 || data.name || 'Name';
      if (titleField) titleField.textContent = data.f1 || data.title || 'Title';
      
      if (data.color) {
        document.documentElement.style.setProperty('--color', data.color);
      }
    }
    
    // Handle postMessage from parent window (for preview)
    window.addEventListener('message', function(event) {
      console.log('Template: message received', event.data);
      if (event.data && typeof event.data === 'object') {
        updateFields(event.data);
      }
    });
    
    // Parse URL parameters on load
    function parseUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const dataParam = urlParams.get('data');
      if (dataParam) {
        try {
          const data = JSON.parse(decodeURIComponent(dataParam));
          console.log('Template: URL data parsed', data);
          updateFields(data);
        } catch (err) {
          console.error('Template: Error parsing URL data', err);
        }
      }
    }
    
    // Initialize on load
    parseUrlParams();
  </script>
</body>
</html>`;
    
    fs.writeFileSync(path.join(sampleDir, 'index.html'), sampleHtml);
    console.log('Created index.html');
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
    if (!template) {
      console.log(`Template not found: ${id}`);
      return null;
    }
    
    const htmlPath = path.join(template.path, template.html);
    console.log(`Template path for ${id}: ${htmlPath}`);
    
    // Check if file exists
    if (!fs.existsSync(htmlPath)) {
      console.error(`Template HTML file not found: ${htmlPath}`);
      return null;
    }
    
    return htmlPath;
  }
  
  // Add GDD XML parsing
  parseGDDTemplate(templatePath) {
    const xmlPath = path.join(templatePath, 'templateInfo.xml');
    
    if (fs.existsSync(xmlPath)) {
      const xmlContent = fs.readFileSync(xmlPath, 'utf8');
      // Parse GDD XML and extract component definitions
      // This would need a proper XML parser for production
      
      return {
        type: 'gdd',
        xmlPath,
        components: this.extractGDDComponents(xmlContent)
      };
    }
    
    return null;
  }

  extractGDDComponents(xmlContent) {
    // Basic extraction - in production use a proper XML parser
    const components = [];
    const componentMatches = xmlContent.match(/<component id="([^"]+)"[\s\S]*?<\/component>/g) || [];
    
    componentMatches.forEach(match => {
      const idMatch = match.match(/id="([^"]+)"/);
      const nameMatch = match.match(/<name>([^<]+)<\/name>/);
      const typeMatch = match.match(/<type>([^<]+)<\/type>/);
      const valueMatch = match.match(/<value>([^<]+)<\/value>/);
      
      if (idMatch) {
        components.push({
          id: idMatch[1],
          name: nameMatch ? nameMatch[1] : idMatch[1],
          type: typeMatch ? typeMatch[1] : 'text',
          default: valueMatch ? valueMatch[1] : ''
        });
      }
    });
    
    return components;
  }
}

// Create and export singleton instance
const templateRegistry = new TemplateRegistry();
module.exports = templateRegistry;