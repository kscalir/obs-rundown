const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Get all items
router.get('/', (req, res) => {
  db.all('SELECT * FROM rundown_items ORDER BY position',
    (err, items) => {
      if (err) return handleError(res, err, 'query items');
      res.json(items);
    }
  );
});

// Update item
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { title, position, data, group_id } = req.body; // Add group_id here
  
  console.log(`Updating item ${id} with:`, { title, position, data, group_id });
  
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
    updateFields.push('data = ?');
    values.push(JSON.stringify(data));
  }
  
  // Add this new section:
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
  
  db.run(sql, values, function(err) {
    if (err) {
      console.error('DB update item error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Return the updated item
    db.get('SELECT * FROM rundown_items WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error fetching updated item:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row && row.data) {
        try {
          row.data = JSON.parse(row.data);
        } catch (e) {
          row.data = {};
        }
      }
      
      console.log('Updated item result:', row);
      res.json(row);
    });
  });
});

// Full item update
router.put('/:id', (req, res) => {
  const { position, group_id, type, data } = req.body;
  
  if (!group_id) {
    return handleError(res, new Error('group_id is required'), 'update item');
  }
  
  db.run(
    'UPDATE rundown_items SET position = ?, group_id = ?, type = ?, data = ? WHERE id = ?',
    [position, group_id, type, JSON.stringify(data), req.params.id],
    function(err) {
      if (err) return handleError(res, err, 'update item');
      res.json({ id: req.params.id, position, group_id, type, data });
    }
  );
});

// Add this POST route if it doesn't exist:
router.post('/', (req, res) => {
  const { type, group_id, position, title, data } = req.body;
  
  console.log('Creating item:', { type, group_id, position, title, data });
  
  if (!type || !group_id) {
    return res.status(400).json({ error: 'Type and group_id are required' });
  }
  
  const sql = `
    INSERT INTO rundown_items (type, group_id, position, title, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  
  const dataJson = data ? JSON.stringify(data) : '{}';
  const itemTitle = title || `New ${type}`;
  const itemPosition = position !== undefined ? position : 0;
  
  db.run(sql, [type, group_id, itemPosition, itemTitle, dataJson], function(err) {
    if (err) {
      console.error('Error creating item:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Fetch the created item
    db.get('SELECT * FROM rundown_items WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('Error fetching created item:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row && row.data) {
        try {
          row.data = JSON.parse(row.data);
        } catch (e) {
          row.data = {};
        }
      }
      
      console.log('Created item:', row);
      res.status(201).json(row);
    });
  });
});

module.exports = router;