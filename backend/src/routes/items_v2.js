const express = require('express');
const router = express.Router();
const db = require('../../services/database');

// Helper to parse JSON data field
function parseDataField(row) {
  if (!row) return row;
  if (row.data) {
    try {
      row.data = JSON.parse(row.data);
    } catch (e) {
      row.data = {};
    }
  }
  return row;
}

// Get all items (with optional filtering)
router.get('/', (req, res) => {
  try {
    const { group_id, parent_item_id, type, include_children } = req.query;
    
    let sql = 'SELECT * FROM rundown_items';
    const conditions = [];
    const params = [];
    
    if (group_id) {
      conditions.push('group_id = ?');
      params.push(group_id);
    }
    
    if (parent_item_id) {
      conditions.push('parent_item_id = ?');
      params.push(parent_item_id);
    }
    
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    
    // By default, exclude child items unless specifically requested
    if (!include_children && !parent_item_id) {
      conditions.push('parent_item_id IS NULL');
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY position';
    
    const items = db.executeQuery(sql, params);
    res.json(items.map(parseDataField));
  } catch (err) {
    return db.handleError(res, err, 'query items');
  }
});

// Get single item by id (with children if it's a parent)
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const { include_children } = req.query;
  
  try {
    const row = db.executeGet('SELECT * FROM rundown_items WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Item not found' });
    
    const item = parseDataField(row);
    
    // If requested, include child items (overlays)
    if (include_children) {
      const children = db.executeQuery(
        'SELECT * FROM rundown_items WHERE parent_item_id = ? ORDER BY overlay_in_point, position',
        [id]
      );
      item.overlays = children.map(parseDataField);
    }
    
    res.json(item);
  } catch (err) {
    return db.handleError(res, err, 'get item');
  }
});

// Create item (supports both regular items and overlays)
router.post('/', (req, res) => {
  const { 
    type, 
    group_id, 
    parent_item_id,
    position, 
    title, 
    data,
    // Automation fields
    automation_mode,
    automation_duration,
    use_media_duration,
    // Overlay fields
    overlay_type,
    overlay_in_point,
    overlay_duration,
    overlay_automation,
    overlay_color_index
  } = req.body;
  
  // Validate required fields
  if (!type) {
    return res.status(400).json({ error: 'Type is required' });
  }
  
  // Either group_id (for regular items) or parent_item_id (for overlays) must be provided
  if (!group_id && !parent_item_id) {
    return res.status(400).json({ error: 'Either group_id or parent_item_id is required' });
  }
  
  try {
    const sql = `
      INSERT INTO rundown_items (
        type, group_id, parent_item_id, position, title, data,
        automation_mode, automation_duration, use_media_duration,
        overlay_type, overlay_in_point, overlay_duration, overlay_automation, overlay_color_index,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const dataJson = data ? JSON.stringify(data) : '{}';
    const itemTitle = title || `New ${type}`;
    const itemPosition = position !== undefined ? position : 0;
    
    // Set defaults for automation
    const autoMode = automation_mode || 'manual';
    const autoDuration = automation_duration !== undefined ? automation_duration : 10;
    const useMediaDur = use_media_duration ? 1 : 0;
    
    // Set defaults for overlays
    const overlayInPoint = overlay_in_point !== undefined ? overlay_in_point : 0;
    const overlayAuto = overlay_automation || 'auto_out';
    
    const result = db.executeRun(sql, [
      type, 
      group_id || null,
      parent_item_id || null,
      itemPosition, 
      itemTitle, 
      dataJson,
      autoMode,
      autoDuration,
      useMediaDur,
      overlay_type || null,
      overlayInPoint,
      overlay_duration || null,
      overlayAuto,
      overlay_color_index || null
    ]);
    
    // Fetch the created item
    const row = db.executeGet('SELECT * FROM rundown_items WHERE id = ?', [result.lastInsertRowid]);
    const item = parseDataField(row);
    
    console.log('Created item:', item);
    res.status(201).json(item);
  } catch (err) {
    return db.handleError(res, err, 'create item');
  }
});

// Update item (supports partial updates)
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    // Build the update query dynamically
    const updateFields = [];
    const values = [];
    
    // Handle all possible fields
    const allowedFields = [
      'title', 'position', 'group_id', 'parent_item_id', 'type',
      'automation_mode', 'automation_duration', 'use_media_duration',
      'overlay_type', 'overlay_in_point', 'overlay_duration', 
      'overlay_automation', 'overlay_color_index'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });
    
    // Special handling for data field (merge with existing)
    if (updates.data !== undefined) {
      const existingItem = db.executeGet('SELECT data FROM rundown_items WHERE id = ?', [id]);
      
      let existingData = {};
      if (existingItem && existingItem.data) {
        try {
          existingData = JSON.parse(existingItem.data);
        } catch (e) {
          existingData = {};
        }
      }
      
      const mergedData = { ...existingData, ...updates.data };
      updateFields.push('data = ?');
      values.push(JSON.stringify(mergedData));
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Add updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const sql = `UPDATE rundown_items SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = db.executeRun(sql, values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Return the updated item with its children if it has any
    const row = db.executeGet('SELECT * FROM rundown_items WHERE id = ?', [id]);
    const item = parseDataField(row);
    
    // Check if this item has children (overlays)
    const childCount = db.executeGet(
      'SELECT COUNT(*) as count FROM rundown_items WHERE parent_item_id = ?',
      [id]
    );
    
    if (childCount && childCount.count > 0) {
      const children = db.executeQuery(
        'SELECT * FROM rundown_items WHERE parent_item_id = ? ORDER BY overlay_in_point, position',
        [id]
      );
      item.overlays = children.map(parseDataField);
    }
    
    res.json(item);
  } catch (err) {
    return db.handleError(res, err, 'update item');
  }
});

// Delete item (and its children if it's a parent)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { cascade } = req.query; // ?cascade=true to delete children too
  
  try {
    // Check if item has children
    const childCount = db.executeGet(
      'SELECT COUNT(*) as count FROM rundown_items WHERE parent_item_id = ?',
      [id]
    );
    
    if (childCount && childCount.count > 0 && !cascade) {
      return res.status(400).json({ 
        error: 'Item has child overlays. Use ?cascade=true to delete them too.',
        childCount: childCount.count
      });
    }
    
    // Delete the item (children will be deleted automatically due to ON DELETE CASCADE)
    const result = db.executeRun('DELETE FROM rundown_items WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ 
      success: true, 
      id,
      childrenDeleted: childCount ? childCount.count : 0
    });
  } catch (err) {
    return db.handleError(res, err, 'delete item');
  }
});

// Get items with specific automation mode
router.get('/automation/:mode', (req, res) => {
  const { mode } = req.params;
  
  if (mode !== 'manual' && mode !== 'auto') {
    return res.status(400).json({ error: 'Mode must be "manual" or "auto"' });
  }
  
  try {
    const items = db.executeQuery(
      'SELECT * FROM rundown_items WHERE automation_mode = ? AND parent_item_id IS NULL ORDER BY position',
      [mode]
    );
    res.json(items.map(parseDataField));
  } catch (err) {
    return db.handleError(res, err, 'query automation items');
  }
});

// Get all overlay items
router.get('/overlays/all', (req, res) => {
  try {
    const overlays = db.executeQuery(
      `SELECT * FROM rundown_items 
       WHERE parent_item_id IS NOT NULL 
       ORDER BY parent_item_id, overlay_in_point, position`
    );
    res.json(overlays.map(parseDataField));
  } catch (err) {
    return db.handleError(res, err, 'query overlays');
  }
});

// Attach overlay to parent item
router.post('/:parentId/overlay', (req, res) => {
  const { parentId } = req.params;
  const {
    type,
    title,
    data,
    overlay_in_point,
    overlay_duration,
    overlay_automation,
    overlay_color_index
  } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'Overlay type is required' });
  }
  
  try {
    // Verify parent exists
    const parent = db.executeGet('SELECT id, group_id FROM rundown_items WHERE id = ?', [parentId]);
    if (!parent) {
      return res.status(404).json({ error: 'Parent item not found' });
    }
    
    // Get next position for this parent's overlays
    const maxPos = db.executeGet(
      'SELECT MAX(position) as max FROM rundown_items WHERE parent_item_id = ?',
      [parentId]
    );
    const position = (maxPos && maxPos.max !== null) ? maxPos.max + 1 : 0;
    
    const sql = `
      INSERT INTO rundown_items (
        type, group_id, parent_item_id, position, title, data,
        overlay_type, overlay_in_point, overlay_duration, overlay_automation, overlay_color_index,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const result = db.executeRun(sql, [
      type,
      parent.group_id, // Use parent's group_id
      parentId,
      position,
      title || `${type} overlay`,
      JSON.stringify(data || {}),
      type, // overlay_type same as type for overlays
      overlay_in_point || 0,
      overlay_duration || null,
      overlay_automation || 'auto_out',
      overlay_color_index || null
    ]);
    
    const overlay = db.executeGet('SELECT * FROM rundown_items WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(parseDataField(overlay));
  } catch (err) {
    return db.handleError(res, err, 'attach overlay');
  }
});

module.exports = router;