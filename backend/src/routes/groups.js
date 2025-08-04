const express = require('express');
const router = express.Router();
const { getDb, handleError } = require('../utils/db');

// Get all groups
router.get('/', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM rundown_groups ORDER BY position',
    (err, groups) => {
      db.close();
      if (err) return handleError(res, err, 'query groups');
      res.json(groups);
    }
  );
});

// Update group position
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { position } = req.body;
  
  db.run('UPDATE rundown_groups SET position = ? WHERE id = ?',
    [position, req.params.id],
    function(err) {
      db.close();
      if (err) return handleError(res, err, 'update group');
      res.json({ id: req.params.id, position });
    }
  );
});

module.exports = router;