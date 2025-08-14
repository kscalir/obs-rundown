const express = require('express');
const router = express.Router();
const db = require('../../services/database');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

function mapGraphicsRow(row) {
  if (!row) return row;
  // Normalize field names and parse JSON if needed
  const out = {
    id: row.id,
    episode_id: row.episode_id ?? row.episodeId ?? null,
    title: row.title || null,
    type: row.type || null,
    template_id: row.template_id ?? row.templateId ?? null,
    template_data: row.template_data ?? row.templateData ?? null,
    status: row.status || null,
    pinned: (row.pinned ?? 0) | 0,
    created_at: row.created_at ?? row.createdAt ?? null,
    updated_at: row.updated_at ?? row.updatedAt ?? null,
    thumbnail: row.thumbnail || null,
  };
  if (typeof out.template_data === 'string') {
    try { out.template_data = JSON.parse(out.template_data); } catch (_) {}
  }
  return out;
}

// Templates are now handled by /api/templates - removed duplicate functionality

// -------------------------
// Graphics Channels (WS introspection)
// -------------------------
// GET /api/graphics/channels - list connected preview/live channels (WS)
router.get('/channels', (_, res) => {
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

router.post('/', (req, res) => {
  try {
    const { episode_id, title, type, template_id, template_data, status, pinned } = req.body || {};
    const epiId = episode_id ?? null;
    const tmplId = template_id ?? null;
    const tmplDataRaw = template_data ?? null;

    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });

    const safeType = (type && String(type)) || null;
    const safeTemplateId = (tmplId && String(tmplId)) || null;
    const safeStatus = (status && String(status)) || 'OFF';
    const safePinned = Number.isFinite(parseInt(pinned, 10)) ? parseInt(pinned, 10) : 0;

    let templateDataStr = null;
    if (tmplDataRaw != null) {
      if (typeof tmplDataRaw === 'string') {
        try { JSON.parse(tmplDataRaw); templateDataStr = tmplDataRaw; }
        catch { return res.status(400).json({ error: 'template_data must be valid JSON' }); }
      } else {
        try { templateDataStr = JSON.stringify(tmplDataRaw); }
        catch { return res.status(400).json({ error: 'template_data must be JSON-serializable' }); }
      }
    }

    const insertSql = `INSERT INTO graphics
      (episode_id, title, type, template_id, template_data, status, pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

    const result = db.executeRun(insertSql, [epiId, title, safeType, safeTemplateId, templateDataStr, safeStatus, safePinned]);
    const newId = result.lastInsertRowid;

    const row = db.executeGet(`
      SELECT id, episode_id, title, type,
             template_id, template_data,
             status, pinned, created_at, updated_at, thumbnail
      FROM graphics WHERE id = ?`, [newId]);
    
    res.json(mapGraphicsRow(row));
  } catch (err) {
    return db.handleError(res, err, 'create graphic');
  }
});

// -------------------------
// Graphics Library (DB-backed)
// -------------------------
// GET /api/graphics?episodeId=1&q=smith&limit=50&offset=0
router.get('/', (req, res) => {
  const coerceInt = (v, d = null) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
  };
  try {

    let { episodeId, itemId, q, limit, offset } = req.query || {};
    const lim = Math.max(0, Math.min(parseInt(limit || 100, 10) || 100, 500));
    const off = Math.max(0, parseInt(offset || 0, 10) || 0);

    // If itemId is provided but episodeId is not, try to infer episodeId from items table
    if (!episodeId && itemId) {
      try {
        const row = db.executeGet(`
          SELECT rs.episode_id 
          FROM rundown_items ri 
          JOIN rundown_groups rg ON ri.group_id = rg.id 
          JOIN rundown_segments rs ON rg.segment_id = rs.id 
          WHERE ri.id = ?
        `, [coerceInt(itemId)]);
        if (row && row.episode_id != null) episodeId = String(row.episode_id);
      } catch (_) { /* noop */ }
    }

    console.log('[graphics GET] episodeId:', episodeId || null, 'itemId:', itemId || null, 'q:', q || null);

    const likeQ = (q && String(q).trim() !== '') ? `%${String(q).trim()}%` : null;

    // Only use the correct columns for SELECT
    const selectCols = [
      'id',
      'episode_id',
      'title',
      'type',
      'template_id',
      'template_data',
      'status',
      'pinned',
      'created_at',
      'updated_at',
      'thumbnail'
    ].join(', ');

    const whereParts = [];
    const params = [];

    if (episodeId != null && episodeId !== '') {
      whereParts.push(`episode_id = ?`);
      params.push(coerceInt(episodeId));
    }

    if (likeQ) {
      const likeParts = [
        `title LIKE ?`,
        `type LIKE ?`,
        `template_id LIKE ?`
      ];
      whereParts.push(`(${likeParts.join(' OR ')})`);
      for (let i = 0; i < likeParts.length; i++) params.push(likeQ);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const orderCol = 'updated_at';

    const sql = `SELECT ${selectCols} FROM graphics ${whereSql} ORDER BY ${orderCol} DESC, id DESC LIMIT ? OFFSET ?`;
    const finalParams = params.concat([lim, off]);

    const rows = db.executeQuery(sql, finalParams);
    return res.json(rows.map(mapGraphicsRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// TEMP DEBUG: verify DB file and row counts
// GET /api/graphics/__debug
router.get('/__debug', (req, res) => {
  try {
    const result = {
      client: 'better-sqlite3',
      databaseList: [],
      graphicsCount: null,
      itemsCount: null,
    };

    // file paths
    result.databaseList = db.executeQuery('PRAGMA database_list');

    // table presence & counts
    const g = db.executeGet('SELECT COUNT(1) AS c FROM graphics');
    result.graphicsCount = g && g.c != null ? g.c : g;
    
    const i = db.executeGet("SELECT COUNT(1) AS c FROM sqlite_master WHERE type='table' AND name='rundown_items'");
    result.itemsTableExists = !!(i && i.c > 0);
    
    let itemsCount = null;
    if (result.itemsTableExists) {
      const ic = db.executeGet('SELECT COUNT(1) AS c FROM rundown_items');
      itemsCount = ic && ic.c != null ? ic.c : ic;
    }
    result.itemsCount = itemsCount;

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------
// AMCP-style graphics control (normalized for our player)
// -------------------------
router.post('/control', (req, res) => {
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

// -------------------------
// UPDATE a graphic
// PATCH/PUT /api/graphics/:id
const updateGraphicHandler = (req, res) => {
  try {

    const id = req.params.id;
    const {
      episode_id,
      title,
      type,
      template_id,
      template_data,
      status,
      pinned
    } = req.body || {};

    // Build SET clause dynamically only for provided fields
    const setParts = [];
    const params = [];

    const pushSet = (col, val) => { setParts.push(`${col} = ?`); params.push(val); };

    if (episode_id !== undefined) pushSet('episode_id', episode_id);
    if (title !== undefined) pushSet('title', title);
    if (type !== undefined) pushSet('type', type);
    if (template_id !== undefined) pushSet('template_id', template_id);
    if (template_data !== undefined) {
      let td = null;
      if (template_data === null) {
        td = null;
      } else if (typeof template_data === 'string') {
        // Validate string is JSON if it looks like JSON; otherwise store as-is
        try { JSON.parse(template_data); } catch (_) {}
        td = template_data;
      } else {
        try { td = JSON.stringify(template_data); } catch (e) { return res.status(400).json({ error: 'template_data must be JSON-serializable' }); }
      }
      pushSet('template_data', td);
    }
    if (status !== undefined) pushSet('status', status);
    if (pinned !== undefined) pushSet('pinned', Number.isFinite(parseInt(pinned, 10)) ? parseInt(pinned, 10) : 0);

    // Always bump updated_at
    setParts.push('updated_at = CURRENT_TIMESTAMP');

    if (setParts.length === 1) {
      // Only updated_at would be set — nothing to update
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const sql = `UPDATE graphics SET ${setParts.join(', ')} WHERE id = ?`;

    const result = db.executeRun(sql, [...params, id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Not Found' });
    
    const row = db.executeGet(`
      SELECT id, episode_id, title, type, template_id, template_data, status, pinned, created_at, updated_at, thumbnail
      FROM graphics WHERE id = ?`, [id]);
    
    return res.json(mapGraphicsRow(row));
  } catch (err) {
    const code = err && err.statusCode ? err.statusCode : 500;
    return res.status(code).json({ error: err.message || String(err) });
  }
};

router.patch('/:id', updateGraphicHandler);
router.put('/:id', updateGraphicHandler);

// -------------------------
// GET /api/graphics/:id  -> ALWAYS look up by `id` first; optional fallback to template_id for convenience
// Placed at the end so it won't capture literal routes like /channels, /__debug, /control
router.get('/:id', (req, res) => {
  try {
    const key = req.params.id;
    const selectCols = [
      'id','episode_id','title','type','template_id','template_data',
      'status','pinned','created_at','updated_at','thumbnail'
    ].join(', ');

    // Primary: lookup by id (ALWAYS), regardless of format (GUIDs, strings, numbers)
    let row = db.executeGet(`SELECT ${selectCols} FROM graphics WHERE id = ?`, [key]);

    // Optional: fallback to template_id for convenience with legacy callers
    if (!row) {
      row = db.executeGet(`SELECT ${selectCols} FROM graphics WHERE template_id = ?`, [key]);
    }

    if (!row) return res.status(404).json({ error: 'Not Found' });
    return res.json(mapGraphicsRow(row));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Generate thumbnail for a graphic
async function generateThumbnail(graphicId, templateData, templateId) {
  console.log('Generating thumbnail for graphic:', graphicId, 'template:', templateId);
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    
    // Set viewport for thumbnail generation (16:9 ratio)
    await page.setViewport({ width: 640, height: 360 });
    
    // Construct template HTML path
    const templatePath = path.join(__dirname, '../../templates', templateId, 'index.html');
    console.log('Looking for template at:', templatePath);
    
    try {
      await fs.access(templatePath);
      console.log('Template file exists');
    } catch (err) {
      console.error('Template not found:', templatePath);
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Load template
    console.log('Loading template in browser...');
    await page.goto(`file://${templatePath}`);
    
    // Inject template data
    console.log('Injecting template data:', templateData);
    await page.evaluate((data) => {
      console.log('Available functions:', Object.keys(window).filter(k => typeof window[k] === 'function'));
      console.log('Template data being injected:', data);
      
      // Try multiple possible function names
      if (window.updateFields) {
        window.updateFields(data);
        console.log('Template data updated via updateFields');
      } else if (window.updateTemplateData) {
        window.updateTemplateData(data);
        console.log('Template data updated via updateTemplateData');
      } else if (window.update) {
        window.update(data);
        console.log('Template data updated via update');
      } else {
        console.warn('No template update function found');
      }
      
      // Force show the graphic if it has play/show functionality
      if (window.play) {
        window.play();
        console.log('Called play() function');
      }
    }, templateData);
    
    // Wait for any animations/rendering
    console.log('Waiting for rendering...');
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take screenshot
    console.log('Taking screenshot...');
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false // Capture viewport only, don't clip to specific area
    });
    
    // Save thumbnail
    const thumbsDir = path.join(__dirname, '../../media/thumbs');
    await fs.mkdir(thumbsDir, { recursive: true });
    
    const thumbnailPath = path.join(thumbsDir, `graphic_${graphicId}.png`);
    await fs.writeFile(thumbnailPath, screenshot);
    
    console.log('Thumbnail saved to:', thumbnailPath);
    return `graphic_${graphicId}.png`;
    
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// POST /api/graphics/:id/thumbnail - Generate thumbnail for a graphic
router.post('/:id/thumbnail', async (req, res) => {
  try {
    const graphicId = req.params.id;
    
    // Get graphic data
    const graphic = db.executeGet('SELECT * FROM graphics WHERE id = ?', [graphicId]);
    if (!graphic) {
      return res.status(404).json({ error: 'Graphic not found' });
    }
    
    // Parse template data
    let templateData = {};
    try {
      templateData = typeof graphic.template_data === 'string' 
        ? JSON.parse(graphic.template_data) 
        : graphic.template_data || {};
    } catch (err) {
      console.warn('Failed to parse template data:', err);
    }
    
    // Generate thumbnail
    const thumbnailFilename = await generateThumbnail(graphicId, templateData, graphic.template_id);
    
    // Update graphics record with thumbnail
    db.executeRun(
      'UPDATE graphics SET thumbnail = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [thumbnailFilename, graphicId]
    );
    
    res.json({ 
      success: true, 
      thumbnail: thumbnailFilename,
      url: `/media/thumbs/${thumbnailFilename}`
    });
    
  } catch (err) {
    console.error('Thumbnail generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/graphics/:id/thumbnail - Get or generate thumbnail
router.get('/:id/thumbnail', async (req, res) => {
  try {
    const graphicId = req.params.id;
    
    // Check if thumbnail already exists
    const graphic = db.executeGet('SELECT thumbnail FROM graphics WHERE id = ?', [graphicId]);
    if (!graphic) {
      return res.status(404).json({ error: 'Graphic not found' });
    }
    
    if (graphic.thumbnail) {
      // Return existing thumbnail
      const thumbnailPath = path.join(__dirname, '../../media/thumbs', graphic.thumbnail);
      try {
        await fs.access(thumbnailPath);
        return res.json({ 
          thumbnail: graphic.thumbnail,
          url: `/media/thumbs/${graphic.thumbnail}`
        });
      } catch (err) {
        // Thumbnail file missing, regenerate
        console.log('Thumbnail file missing, regenerating...');
      }
    }
    
    // Generate new thumbnail (fallback)
    const fullGraphic = db.executeGet('SELECT * FROM graphics WHERE id = ?', [graphicId]);
    let templateData = {};
    try {
      templateData = typeof fullGraphic.template_data === 'string' 
        ? JSON.parse(fullGraphic.template_data) 
        : fullGraphic.template_data || {};
    } catch (err) {
      console.warn('Failed to parse template data:', err);
    }
    
    const thumbnailFilename = await generateThumbnail(graphicId, templateData, fullGraphic.template_id);
    
    // Update graphics record
    db.executeRun(
      'UPDATE graphics SET thumbnail = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [thumbnailFilename, graphicId]
    );
    
    res.json({ 
      thumbnail: thumbnailFilename,
      url: `/media/thumbs/${thumbnailFilename}`
    });
    
  } catch (err) {
    console.error('Thumbnail fetch/generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;