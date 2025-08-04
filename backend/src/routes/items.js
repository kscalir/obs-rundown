const express = require('express');
const router = express.Router();
const { getDb, handleError } = require('../utils/db');

// Get all items
router.get('/', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM rundown_items ORDER BY position',
    (err, items) => {
      db.close();
      if (err) return handleError(res, err, 'query items');
      res.json(items);
    }
  );
});

// Update item
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { position, title, source } = req.body;
  
  // Handle position updates from drag-and-drop
  if (source === 'dnd' && typeof position === 'number') {
    db.run(
      'UPDATE rundown_items SET position = ? WHERE id = ?',
      [position, req.params.id],
      function(err) {
        db.close();
        if (err) return handleError(res, err, 'update item position');
        res.json({ id: req.params.id, position });
      }
    );
    return;
  }

  // Handle title updates from edit
  if (source === 'edit' && title) {
    db.run(
      'UPDATE rundown_items SET title = ? WHERE id = ?',
      [title, req.params.id],
      function(err) {
        db.close();
        if (err) return handleError(res, err, 'update item title');
        res.json({ id: req.params.id, title });
      }
    );
    return;
  }

  // Invalid update request
  db.close();
  return handleError(res, new Error('Invalid update request'), 'update item');
});

// Full item update
router.put('/:id', (req, res) => {
  const db = getDb();
  const { position, group_id, type, data } = req.body;
  
  if (!group_id) {
    db.close();
    return handleError(res, new Error('group_id is required'), 'update item');
  }
  
  db.run(
    'UPDATE rundown_items SET position = ?, group_id = ?, type = ?, data = ? WHERE id = ?',
    [position, group_id, type, JSON.stringify(data), req.params.id],
    function(err) {
      db.close();
      if (err) return handleError(res, err, 'update item');
      res.json({ id: req.params.id, position, group_id, type, data });
    }
  );
});

module.exports = router;