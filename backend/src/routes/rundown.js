const express = require('express');
const router = express.Router();
const db = require('../../services/database');

// GET segments with groups and items
router.get('/episodes/:id/segments', (req, res) => {
  console.log('Fetching rundown for episode:', req.params.id);

  try {
    // 1. Get segments
    const segmentQuery = `
      SELECT 
        id,
        episode_id,
        name as title,
        position,
        created_at,
        updated_at
      FROM rundown_segments 
      WHERE episode_id = ? 
      ORDER BY position
    `;

    const segments = db.executeQuery(segmentQuery, [req.params.id]);
    console.log(`Found ${segments.length} segments`);
    
    if (segments.length === 0) {
      return res.json([]);
    }

    // 2. Get groups  
    const segmentIds = segments.map(s => s.id);
    const placeholders = segmentIds.map(() => '?').join(',');

    const groupQuery = `
      SELECT 
        id,
        segment_id,
        name as title,
        position,
        created_at,
        updated_at
      FROM rundown_groups 
      WHERE segment_id IN (${placeholders}) 
      ORDER BY position
    `;

    const groups = db.executeQuery(groupQuery, segmentIds);

    // 3. Get items
    const groupIds = groups.map(g => g.id);
    const itemsQuery = groupIds.length > 0 ? `
      SELECT * FROM rundown_items 
      WHERE group_id IN (${groupIds.map(() => '?').join(',')}) 
      ORDER BY position
    ` : '';

    const items = groupIds.length > 0 ? db.executeQuery(itemsQuery, groupIds) : [];

    // 4. Build hierarchical structure
    const segmentsWithGroups = segments.map(segment => ({
      ...segment,
      expanded: true,
      groups: groups.filter(g => g.segment_id === segment.id).map(group => ({
        ...group,
        expanded: true,
        items: items.filter(i => i.group_id === group.id).map(item => ({
          ...item,
          data: item.data ? JSON.parse(item.data) : {}
        }))
      }))
    }));

    res.json(segmentsWithGroups);
  } catch (err) {
    return db.handleError(res, err, 'fetch rundown');
  }
});

// POST new segment
router.post('/episodes/:id/segments', (req, res) => {
  const { name } = req.body;
  
  try {
    const result = db.executeRun(
      'INSERT INTO rundown_segments (episode_id, name, position) VALUES (?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM rundown_segments WHERE episode_id = ?))',
      [req.params.id, name, req.params.id]
    );
    
    const row = db.executeGet('SELECT * FROM rundown_segments WHERE id = ?', [result.lastInsertRowid]);
    res.json(row);
  } catch (err) {
    return db.handleError(res, err, 'create segment');
  }
});

// POST new group
router.post('/segments/:id/groups', (req, res) => {
  const { name } = req.body;
  
  try {
    const result = db.executeRun(
      'INSERT INTO rundown_groups (segment_id, name, position) VALUES (?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM rundown_groups WHERE segment_id = ?))',
      [req.params.id, name || 'Untitled Group', req.params.id]
    );
    
    const row = db.executeGet('SELECT * FROM rundown_groups WHERE id = ?', [result.lastInsertRowid]);
    res.json(row);
  } catch (err) {
    return db.handleError(res, err, 'create group');
  }
});

// POST new item
router.post('/groups/:id/items', (req, res) => {
  const { type, data } = req.body;
  
  try {
    const result = db.executeRun(
      'INSERT INTO rundown_items (group_id, type, data, position) VALUES (?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM rundown_items WHERE group_id = ?))',
      [req.params.id, type, JSON.stringify(data), req.params.id]
    );
    
    const row = db.executeGet('SELECT * FROM rundown_items WHERE id = ?', [result.lastInsertRowid]);
    
    // Parse the data JSON before sending
    if (row.data) {
      try {
        row.data = JSON.parse(row.data);
      } catch (e) {
        console.error('Error parsing item data:', e);
      }
    }
    
    res.json(row);
  } catch (err) {
    return db.handleError(res, err, 'create item');
  }
});

module.exports = router;