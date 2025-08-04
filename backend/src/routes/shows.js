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

// Other show routes...
module.exports = router;