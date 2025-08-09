const express = require('express');
const router = express.Router();
const { getDb, handleError } = require('../utils/db');

// GET all shows
router.get('/', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM shows ORDER BY id', [], (err, rows) => {
    db.close();
    if (err) return handleError(res, err, 'query');
    res.json(rows);
  });
});

// GET episodes for a show
router.get('/:id/episodes', (req, res) => {
  const db = getDb();
  db.all(
    'SELECT * FROM episodes WHERE show_id = ? ORDER BY id DESC',
    [req.params.id],
    (err, rows) => {
      db.close();
      if (err) return handleError(res, err, 'query');
      res.json(rows);
    }
  );
});

// POST new show
router.post('/', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Show name required' });

  const db = getDb();
  db.run('INSERT INTO shows (name) VALUES (?)', [name.trim()], function(err) {
    db.close();
    if (err) return handleError(res, err, 'insert');
    res.json({ id: this.lastID, name: name.trim() });
  });
});

// PATCH rename show
router.patch('/:id', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Show name required' });
  const db = getDb();
  db.run('UPDATE shows SET name = ? WHERE id = ?', [name.trim(), req.params.id], function(err) {
    db.close();
    if (err) return handleError(res, err, 'update');
    res.json({ id: parseInt(req.params.id), name: name.trim() });
  });
});

// DELETE show (and cascade delete episodes, segments, groups, items, media)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const showId = req.params.id;
  db.serialize(() => {
    // Delete all items in groups in segments in episodes for this show
    db.run(`DELETE FROM rundown_items WHERE group_id IN (
      SELECT id FROM rundown_groups WHERE segment_id IN (
        SELECT id FROM rundown_segments WHERE episode_id IN (
          SELECT id FROM episodes WHERE show_id = ?
        )
      )
    )`, [showId]);
    // Delete all groups
    db.run(`DELETE FROM rundown_groups WHERE segment_id IN (
      SELECT id FROM rundown_segments WHERE episode_id IN (
        SELECT id FROM episodes WHERE show_id = ?
      )
    )`, [showId]);
    // Delete all segments
    db.run(`DELETE FROM rundown_segments WHERE episode_id IN (
      SELECT id FROM episodes WHERE show_id = ?
    )`, [showId]);
    // Delete all episodes
    db.run('DELETE FROM episodes WHERE show_id = ?', [showId]);
    // Delete all media
    db.run('DELETE FROM media WHERE show_id = ?', [showId]);
    // Delete the show itself
    db.run('DELETE FROM shows WHERE id = ?', [showId], function(err) {
      db.close();
      if (err) return handleError(res, err, 'delete');
      res.json({ id: parseInt(showId), deleted: true });
    });
  });
});
module.exports = router;