const express = require('express');
const router = express.Router();
const db = require('../../services/database');

// GET all episodes for show
router.get('/show/:showId', (req, res) => {
  try {
    const rows = db.executeQuery(
      'SELECT * FROM episodes WHERE show_id = ? ORDER BY id DESC',
      [req.params.showId]
    );
    res.json(rows);
  } catch (err) {
    return db.handleError(res, err, 'query episodes');
  }
});

// POST new episode
router.post('/show/:showId', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  try {
    const result = db.executeRun(
      'INSERT INTO episodes (show_id, name) VALUES (?, ?)',
      [req.params.showId, name.trim()]
    );
    
    const row = db.executeGet('SELECT * FROM episodes WHERE id = ?', [result.lastInsertRowid]);
    res.json(row);
  } catch (err) {
    return db.handleError(res, err, 'create episode');
  }
});

module.exports = router;