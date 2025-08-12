const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs');
// Lazy-load existing registry if available; fall back to a simple scanner
let registry;
try {
  registry = require('../../templateRegistry');
} catch (e) {
  registry = null;
}

function scanTemplatesDir() {
  const baseDir = path.resolve(__dirname, '../../templates');
  if (!fs.existsSync(baseDir)) return [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(dir => {
      const id = dir.name;
      const folder = path.join(baseDir, id);
      const xmlPath = fs.existsSync(path.join(folder, 'template.xml'))
        ? path.join(folder, 'template.xml')
        : (fs.existsSync(path.join(folder, `${id}.xml`)) ? path.join(folder, `${id}.xml`) : null);

      // defaults
      let htmlFile = `${id}.html`;
      let thumbnail = null;

      // try to read minimal hints from XML if present
      if (xmlPath) {
        const xml = fs.readFileSync(xmlPath, 'utf8');
        const htmlMatch = xml.match(/&lt;html&gt;([\s\S]*?)&lt;\/html&gt;|<html>([\s\S]*?)<\/html>/i);
        const thumbMatch = xml.match(/&lt;thumbnail&gt;([\s\S]*?)&lt;\/thumbnail&gt;|<thumbnail>([\s\S]*?)<\/thumbnail>/i);
        if (htmlMatch) {
          htmlFile = (htmlMatch[1] || htmlMatch[2] || htmlFile).trim();
        }
        if (thumbMatch) {
          thumbnail = (thumbMatch[1] || thumbMatch[2] || '').trim() || null;
        }
      }

      return {
        id,
        path: folder,
        xml: xmlPath,
        htmlFile,
        thumbnail,
      };
    });
}

// -------------------------
// Templates
// -------------------------

// GET /api/graphics/templates - list available templates with minimal metadata
router.get('/templates', async (req, res) => {
  try {
    // Prefer shared registry if available
    if (registry && typeof registry.list === 'function') {
      const list = registry.list().map(t => ({
        id: t.id,
        htmlFile: t.htmlFile || `${t.id}.html`,
        thumbnail: t.thumbnail || null,
      }));
      return res.json({ templates: list });
    }
    // Fallback to filesystem scan
    const list = scanTemplatesDir().map(t => ({
      id: t.id,
      htmlFile: t.htmlFile,
      thumbnail: t.thumbnail,
    }));
    return res.json({ templates: list });
  } catch (err) {
    console.error('Error listing templates:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/graphics/templates/rescan - refresh the registry on demand (for authoring)
router.post('/templates/rescan', async (req, res) => {
  try {
    if (registry && typeof registry.rescan === 'function') {
      await registry.rescan();
    }
    // Always return current view (registry or filesystem)
    const list = registry && typeof registry.list === 'function'
      ? registry.list().map(t => ({
          id: t.id,
          htmlFile: t.htmlFile || `${t.id}.html`,
          thumbnail: t.thumbnail || null,
        }))
      : scanTemplatesDir().map(t => ({
          id: t.id,
          htmlFile: t.htmlFile,
          thumbnail: t.thumbnail,
        }));
    res.json({ templates: list, refreshed: true });
  } catch (err) {
    console.error('Error rescanning templates:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// Graphics Channels (WS introspection)
// -------------------------
// GET /api/graphics/channels - list connected preview/live channels (WS)
router.get('/channels', (req, res) => {
  try {
    if (!global.wss) return res.json({ channels: [] });
    const chans = [];
    global.wss.clients.forEach(c => {
      if (c.readyState === 1) {
        chans.push(c.channel ?? null);
      }
    });
    res.json({ channels: Array.from(new Set(chans)).filter(v => v != null) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// AMCP-style graphics control (normalized for our player)
// -------------------------
router.post('/control', async (req, res) => {
  try {
    const { command, channel, layer, templateId, data } = req.body || {};

    console.log('AMCP Graphics command:', { command, channel, layer, templateId, data });

    // Validate required parameters
    if (!command || channel == null) {
      return res.status(400).json({ error: 'Command and channel are required' });
    }

    let amcpMessage;

    switch (String(command).toLowerCase()) {
      case 'play':
      case 'add':
      case 'cg_add':
        amcpMessage = {
          command: 'CG_ADD',
          channel: parseInt(channel),
          layer: parseInt(layer || 1),
          template: templateId,
          playOnLoad: true,
          data: formatTemplateData(data)
        };
        break;
      case 'cg_play':
        amcpMessage = { command: 'CG_PLAY', channel: parseInt(channel), layer: parseInt(layer || 1) };
        break;
      case 'stop':
      case 'clear':
      case 'cg_stop':
        amcpMessage = { command: 'CG_STOP', channel: parseInt(channel), layer: parseInt(layer || 1) };
        break;
      case 'next':
      case 'cg_next':
        amcpMessage = { command: 'CG_NEXT', channel: parseInt(channel), layer: parseInt(layer || 1) };
        break;
      case 'remove':
      case 'cg_remove':
        amcpMessage = { command: 'CG_REMOVE', channel: parseInt(channel), layer: parseInt(layer || 1) };
        break;
      case 'cg_clear':
        amcpMessage = { command: 'CG_CLEAR', channel: parseInt(channel) };
        break;
      case 'update':
      case 'cg_update':
        amcpMessage = { command: 'CG_UPDATE', channel: parseInt(channel), layer: parseInt(layer || 1), data: formatTemplateData(data) };
        break;
      case 'cg_invoke':
        amcpMessage = { command: 'CG_INVOKE', channel: parseInt(channel), layer: parseInt(layer || 1), method: data?.method || 'play' };
        break;
      default:
        return res.status(400).json({ error: `Unknown command: ${command}` });
    }

    const normalized = (amcpMessage.command || '').toLowerCase();
    const action =
      normalized.includes('add') || normalized.includes('play') ? 'play' :
      normalized.includes('update') ? 'update' :
      normalized.includes('stop') || normalized.includes('remove') || normalized.includes('clear') ? 'stop' :
      normalized.includes('next') ? 'next' :
      'invoke';

    // Broadcast to WebSocket clients
    if (global.wss) {
      const wsPayload = {
        // normalized shape used by our HTML player
        type: 'graphics',
        action,
        channel: parseInt(channel),
        layer: parseInt(layer || 1),
        templateId: templateId || null,
        data: amcpMessage.data || formatTemplateData(data),
        originalData: data || null,
        playOnLoad: !!amcpMessage.playOnLoad,

        // legacy/caspar-ish fields kept for compatibility
        command: amcpMessage.command,
        template: templateId || null
      };
      const wsMessage = JSON.stringify(wsPayload);

      console.log('Sending WebSocket message:', wsMessage);

      global.wss.clients.forEach(client => {
        if (client.readyState === 1 && client.channel === parseInt(channel)) {
          console.log(`Sending to WebSocket client on channel ${client.channel}`);
          client.send(wsMessage);
        }
      });
      console.log('Graphics WS broadcast complete.');
    } else {
      console.log('No WebSocket server available');
    }

    return res.json({
      success: true,
      amcp: amcpMessage,
      message: `${amcpMessage.command} sent to channel ${channel}${layer ? `-${layer}` : ''}`
    });

  } catch (error) {
    console.error('Graphics control error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to format template data for AMCP
function formatTemplateData(data) {
  if (!data) return '';

  // Convert simple object to XML-like format for CasparCG
  if (typeof data === 'object') {
    const xmlData = Object.keys(data).map(key => {
      const value = data[key];
      return `<componentData id="${key}"><data id="text" value="${escapeXml(value)}"/></componentData>`;
    }).join('');

    return `<templateData>${xmlData}</templateData>`;
  }

  return String(data);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = router;