const express = require('express');
const router = express.Router();
const db = require('../../services/database');

// Add request logging middleware
router.use((req, res, next) => {
  console.log(`[SEGMENTS] ${req.method} ${req.path}`, req.body);
  next();
});

// Get all segments
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      id,
      episode_id,
      name as title,
      position,
      allotted_time,
      created_at,
      updated_at
    FROM rundown_segments 
    ORDER BY position
  `;
  
  try {
    const rows = db.executeQuery(sql);
    res.json(rows);
  } catch (err) {
    return db.handleError(res, err, 'query segments');
  }
});

// Update segment position
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  
  console.log('PATCH /segments/:id - headers:', req.headers);
  console.log('PATCH /segments/:id - body:', req.body);
  
  const { title, position, allotted_time } = req.body;
  
  console.log('allotted_time value:', allotted_time, 'type:', typeof allotted_time);
  
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
  
  if (allotted_time !== undefined) {
    updateFields.push('allotted_time = ?');
    values.push(allotted_time);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  values.push(id);
  
  const sql = `UPDATE rundown_segments SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  
  
  try {
    const result = db.executeRun(sql, values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    // Return the updated segment
    const row = db.executeGet(`
      SELECT 
        id,
        episode_id,
        name as title,
        position,
        allotted_time,
        created_at,
        updated_at
      FROM rundown_segments 
      WHERE id = ?
    `, [id]);
    
    res.json(row);
  } catch (err) {
    return db.handleError(res, err, 'update segment');
  }
});

// Add this POST route:
router.post('/', (req, res) => {
  const { episode_id, name, position } = req.body;
  
  
  if (!episode_id || !name) {
    return res.status(400).json({ error: 'episode_id and name are required' });
  }
  
  const sql = `
    INSERT INTO rundown_segments (episode_id, name, position, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  
  const segmentPosition = position !== undefined ? position : 0;
  
  try {
    const result = db.executeRun(sql, [episode_id, name, segmentPosition]);
    
    // Fetch the created segment
    const row = db.executeGet('SELECT * FROM rundown_segments WHERE id = ?', [result.lastInsertRowid]);
    
    res.status(201).json(row);
  } catch (err) {
    return db.handleError(res, err, 'create segment');
  }
});

module.exports = router;
// Delete segment by ID
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.executeRun('DELETE FROM rundown_segments WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    return db.handleError(res, err, 'delete segment');
  }
});