const express = require('express');
const router = express.Router();
const db = require('../../services/database');

// Get all items
router.get('/', (req, res) => {
  try {
    const items = db.executeQuery('SELECT * FROM rundown_items ORDER BY position');
    res.json(items);
  } catch (err) {
    return db.handleError(res, err, 'query items');
  }
});

// Get single item by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const row = db.executeGet('SELECT * FROM rundown_items WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Item not found' });

    if (row.data) {
      try {
        row.data = JSON.parse(row.data);
      } catch (e) {
        row.data = {};
      }
    }

    res.json(row);
  } catch (err) {
    return db.handleError(res, err, 'get item');
  }
});

// Update item
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { title, position, data, group_id } = req.body;
  
  console.log(`Updating item ${id} with:`, { title, position, data, group_id });
  
  try {
    // Build the update query dynamically
    let updateFields = [];
    let values = [];
    
    if (title !== undefined && title !== null) {
      updateFields.push('title = ?');
      values.push(title);
    }
    
    if (position !== undefined && position !== null) {
      updateFields.push('position = ?');
      values.push(position);
    }
    
    if (data !== undefined && data !== null) {
      // If we're updating data, we need to merge with existing data to avoid wiping out other fields
      const existingItem = db.executeGet('SELECT data FROM rundown_items WHERE id = ?', [id]);
      
      let existingData = {};
      if (existingItem && existingItem.data) {
        try {
          existingData = JSON.parse(existingItem.data);
        } catch (e) {
          existingData = {};
        }
      }
      
      // Merge new data with existing data
      const mergedData = { ...existingData, ...data };
      updateFields.push('data = ?');
      values.push(JSON.stringify(mergedData));
      
      console.log('Merging data:', { existing: existingData, incoming: data, merged: mergedData });
    }
    
    if (group_id !== undefined && group_id !== null) {
      updateFields.push('group_id = ?');
      values.push(group_id);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    
    const sql = `UPDATE rundown_items SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    console.log('Executing SQL:', sql, 'with values:', values);
    
    const result = db.executeRun(sql, values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Return the updated item
    const row = db.executeGet('SELECT * FROM rundown_items WHERE id = ?', [id]);
    
    if (row && row.data) {
      try {
        row.data = JSON.parse(row.data);
      } catch (e) {
        row.data = {};
      }
    }
    
    console.log('Updated item result:', row);
    res.json(row);
  } catch (err) {
    return db.handleError(res, err, 'update item');
  }
});

// Full item update
router.put('/:id', (req, res) => {
  const { position, group_id, type, data } = req.body;
  
  if (!group_id) {
    return db.handleError(res, new Error('group_id is required'), 'update item');
  }
  
  try {
    db.executeRun(
      'UPDATE rundown_items SET position = ?, group_id = ?, type = ?, data = ? WHERE id = ?',
      [position, group_id, type, JSON.stringify(data), req.params.id]
    );
    res.json({ id: req.params.id, position, group_id, type, data });
  } catch (err) {
    return db.handleError(res, err, 'update item');
  }
});

// Create item
router.post('/', (req, res) => {
  const { type, group_id, position, title, data } = req.body;
  
  console.log('Creating item:', { type, group_id, position, title, data });
  
  if (!type || !group_id) {
    return res.status(400).json({ error: 'Type and group_id are required' });
  }
  
  try {
    const sql = `
      INSERT INTO rundown_items (type, group_id, position, title, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const dataJson = data ? JSON.stringify(data) : '{}';
    const itemTitle = title || `New ${type}`;
    const itemPosition = position !== undefined ? position : 0;
    
    const result = db.executeRun(sql, [type, group_id, itemPosition, itemTitle, dataJson]);
    
    // Fetch the created item
    const row = db.executeGet('SELECT * FROM rundown_items WHERE id = ?', [result.lastInsertRowid]);
    
    if (row && row.data) {
      try {
        row.data = JSON.parse(row.data);
      } catch (e) {
        row.data = {};
      }
    }
    
    console.log('Created item:', row);
    res.status(201).json(row);
  } catch (err) {
    return db.handleError(res, err, 'create item');
  }
});

// Delete item by ID
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.executeRun('DELETE FROM rundown_items WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    return db.handleError(res, err, 'delete item');
  }
});

module.exports = router;