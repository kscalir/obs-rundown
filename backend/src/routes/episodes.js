const express = require('express');
const router = express.Router();
const { getDb, handleError } = require('../utils/db');

// GET all episodes for show
router.get('/show/:showId', (req, res) => {
  const db = getDb();
  db.all(
    'SELECT * FROM episodes WHERE show_id = ? ORDER BY id DESC',
    [req.params.showId],
    (err, rows) => {
      db.close();
      if (err) return handleError(res, err, 'query');
      res.json(rows);
    }
  );
});

// POST new episode
router.post('/show/:showId', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const db = getDb();
  db.run(
    'INSERT INTO episodes (show_id, name) VALUES (?, ?)',
    [req.params.showId, name.trim()],
    function(err) {
      if (err) {
        db.close();
        return handleError(res, err, 'insert');
      }
      
      db.get('SELECT * FROM episodes WHERE id = ?', [this.lastID], (err, row) => {
        db.close();
        if (err) return handleError(res, err, 'query');
        res.json(row);
      });
    }
  );
});

module.exports = router;