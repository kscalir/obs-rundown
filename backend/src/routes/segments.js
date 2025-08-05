const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Get all segments
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      id,
      episode_id,
      name as title,
      position,
      created_at,
      updated_at
    FROM rundown_segments 
    ORDER BY position
  `;
  
  db.all(sql, (err, rows) => {
    if (err) {
      console.error('Error fetching segments:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(rows);
  });
});

// Update segment position
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { title, position } = req.body;
  
  console.log(`Updating segment ${id} with:`, { title, position });
  
  // Build the update query dynamically
  let updateFields = [];
  let values = [];
  
  if (title !== undefined && title !== null) {
    updateFields.push('name = ?'); // Changed from 'title = ?' to 'name = ?'
    values.push(title);
  }
  
  if (position !== undefined && position !== null) {
    updateFields.push('position = ?');
    values.push(position);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  values.push(id);
  
  const sql = `UPDATE rundown_segments SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  
  console.log('Executing SQL:', sql, 'with values:', values);
  
  db.run(sql, values, function(err) {
    if (err) {
      console.error('DB update segment error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    // Return the updated segment
    db.get(`
      SELECT 
        id,
        episode_id,
        name as title,
        position,
        created_at,
        updated_at
      FROM rundown_segments 
      WHERE id = ?
    `, [id], (err, row) => {
      if (err) {
        console.error('Error fetching updated segment:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log('Updated segment result:', row);
      res.json(row);
    });
  });
});

// Add this POST route:
router.post('/', (req, res) => {
  const { episode_id, name, position } = req.body;
  
  console.log('Creating segment:', { episode_id, name, position });
  
  if (!episode_id || !name) {
    return res.status(400).json({ error: 'episode_id and name are required' });
  }
  
  const sql = `
    INSERT INTO rundown_segments (episode_id, name, position, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  
  const segmentPosition = position !== undefined ? position : 0;
  
  db.run(sql, [episode_id, name, segmentPosition], function(err) {
    if (err) {
      console.error('Error creating segment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Fetch the created segment
    db.get('SELECT * FROM rundown_segments WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.error('Error fetching created segment:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log('Created segment:', row);
      res.status(201).json(row);
    });
  });
});

module.exports = router;