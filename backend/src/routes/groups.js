const express = require('express');
const router = express.Router();
const db = require('../../services/database');

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
  
  try {
    const rows = db.executeQuery(sql);
    res.json(rows);
  } catch (err) {
    return db.handleError(res, err, 'query groups');
  }
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
  
  try {
    const result = db.executeRun(sql, values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Return the updated group
    const row = db.executeGet(`
      SELECT 
        id,
        segment_id,
        name as title,
        position,
        created_at,
        updated_at
      FROM rundown_groups 
      WHERE id = ?
    `, [id]);
    
    console.log('Updated group result:', row);
    res.json(row);
  } catch (err) {
    return db.handleError(res, err, 'update group');
  }
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
  
  try {
    const result = db.executeRun(sql, [segment_id, name, groupPosition]);
    
    // Fetch the created group
    const row = db.executeGet('SELECT * FROM rundown_groups WHERE id = ?', [result.lastInsertRowid]);
    
    console.log('Created group:', row);
    res.status(201).json(row);
  } catch (err) {
    return db.handleError(res, err, 'create group');
  }
});
// Delete group by ID
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.executeRun('DELETE FROM rundown_groups WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    return db.handleError(res, err, 'delete group');
  }
});

module.exports = router;