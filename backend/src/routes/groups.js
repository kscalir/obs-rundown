const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Get all groups
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      id,
      segment_id,
      name as title,
      position,
      created_at,
      updated_at
    FROM rundown_groups 
    ORDER BY position
  `;
  
  db.all(sql, (err, rows) => {
    if (err) {
      console.error('Error fetching groups:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(rows);
  });
});

// Update group position
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { title, position, segment_id } = req.body; // Add segment_id here
  
  console.log(`Updating group ${id} with:`, { title, position, segment_id });
  
  // Build the update query dynamically
  let updateFields = [];
  let values = [];
  
  if (title !== undefined && title !== null) {
    updateFields.push('name = ?');
    values.push(title);
  }
  
  if (position !== undefined && position !== null) {
    updateFields.push('position = ?');
    values.push(position);
  }
  
  // Add this new section:
  if (segment_id !== undefined && segment_id !== null) {
    updateFields.push('segment_id = ?');
    values.push(segment_id);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  values.push(id);
  
  const sql = `UPDATE rundown_groups SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  
  console.log('Executing SQL:', sql, 'with values:', values);
  
  db.run(sql, values, function(err) {
    if (err) {
      console.error('DB update group error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Return the updated group
    db.get(`
      SELECT 
        id,
        segment_id,
        name as title,
        position,
        created_at,
        updated_at
      FROM rundown_groups 
      WHERE id = ?
    `, [id], (err, row) => {
      if (err) {
        console.error('Error fetching updated group:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log('Updated group result:', row);
      res.json(row);
    });
  });
});

// Add this POST route:
router.post('/', (req, res) => {
  const { segment_id, name, position } = req.body;
  
  console.log('Creating group:', { segment_id, name, position });
  
  if (!segment_id || !name) {
    return res.status(400).json({ error: 'segment_id and name are required' });
  }
  
  const sql = `
    INSERT INTO rundown_groups (segment_id, name, position, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  
  const groupPosition = position !== undefined ? position : 0;
  
  db.run(sql, [segment_id, name, groupPosition], function(err) {
    if (err) {
      console.error('Error creating group:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Fetch the created group
    db.get('SELECT * FROM rundown_groups WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('Error fetching created group:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log('Created group:', row);
      res.status(201).json(row);
    });
  });
});
// Delete group by ID
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM rundown_groups WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting group:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json({ success: true, id });
  });
});

module.exports = router;