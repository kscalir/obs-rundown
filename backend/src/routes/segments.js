const express = require('express');
const router = express.Router();
const { getDb, handleError } = require('../utils/db');

// Get all segments
router.get('/', async (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM rundown_segments ORDER BY position',
    (err, segments) => {
      db.close();
      if (err) return handleError(res, err, 'query segments');
      res.json(segments);
    }
  );
});

// Update segment position
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { position } = req.body;
  
  db.run('UPDATE rundown_segments SET position = ? WHERE id = ?',
    [position, req.params.id],
    function(err) {
      db.close();
      if (err) return handleError(res, err, 'update segment');
      res.json({ id: req.params.id, position });
    }
  );
});

module.exports = router;