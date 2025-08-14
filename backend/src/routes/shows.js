const express = require('express');
const router = express.Router();
const db = require('../../services/database');

// GET all shows
router.get('/', (req, res) => {
  try {
    const rows = db.executeQuery('SELECT * FROM shows ORDER BY id');
    res.json(rows);
  } catch (err) {
    return db.handleError(res, err, 'query shows');
  }
});

// GET episodes for a show
router.get('/:id/episodes', (req, res) => {
  try {
    const rows = db.executeQuery(
      'SELECT * FROM episodes WHERE show_id = ? ORDER BY id DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    return db.handleError(res, err, 'query episodes');
  }
});

// POST new show
router.post('/', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Show name required' });

  try {
    const result = db.executeRun('INSERT INTO shows (name) VALUES (?)', [name.trim()]);
    res.json({ id: result.lastInsertRowid, name: name.trim() });
  } catch (err) {
    return db.handleError(res, err, 'create show');
  }
});

// PATCH rename show
router.patch('/:id', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Show name required' });
  
  try {
    db.executeRun('UPDATE shows SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    res.json({ id: parseInt(req.params.id), name: name.trim() });
  } catch (err) {
    return db.handleError(res, err, 'update show');
  }
});

// DELETE show (and cascade delete episodes, segments, groups, items, media)
router.delete('/:id', (req, res) => {
  const showId = req.params.id;
  
  try {
    const database = db.getDb();
    
    // Use transaction for cascading deletes
    const deleteTransaction = database.transaction(() => {
      // Delete all items in groups in segments in episodes for this show
      database.prepare(`DELETE FROM rundown_items WHERE group_id IN (
        SELECT id FROM rundown_groups WHERE segment_id IN (
          SELECT id FROM rundown_segments WHERE episode_id IN (
            SELECT id FROM episodes WHERE show_id = ?
          )
        )
      )`).run(showId);
      
      // Delete all groups
      database.prepare(`DELETE FROM rundown_groups WHERE segment_id IN (
        SELECT id FROM rundown_segments WHERE episode_id IN (
          SELECT id FROM episodes WHERE show_id = ?
        )
      )`).run(showId);
      
      // Delete all segments
      database.prepare(`DELETE FROM rundown_segments WHERE episode_id IN (
        SELECT id FROM episodes WHERE show_id = ?
      )`).run(showId);
      
      // Delete all episodes
      database.prepare('DELETE FROM episodes WHERE show_id = ?').run(showId);
      
      // Delete all media
      database.prepare('DELETE FROM media WHERE show_id = ?').run(showId);
      
      // Delete the show itself
      database.prepare('DELETE FROM shows WHERE id = ?').run(showId);
    });
    
    deleteTransaction();
    res.json({ id: parseInt(showId), deleted: true });
  } catch (err) {
    return db.handleError(res, err, 'delete show');
  }
});
module.exports = router;