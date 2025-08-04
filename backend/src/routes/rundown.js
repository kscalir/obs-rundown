const express = require('express');
const router = express.Router();
const { getDb, handleError } = require('../utils/db');

// GET segments with groups and items
router.get('/episodes/:id/segments', (req, res) => {
  const db = getDb();
  console.log('Fetching rundown for episode:', req.params.id);

  db.serialize(() => {
    // 1. Get segments
    db.all(
      `SELECT * FROM rundown_segments 
       WHERE episode_id = ? 
       ORDER BY position`,
      [req.params.id],
      (err, segments) => {
        if (err) {
          db.close();
          return handleError(res, err, 'query segments');
        }

        console.log(`Found ${segments.length} segments`);
        
        if (segments.length === 0) {
          db.close();
          return res.json([]);
        }

        // 2. Get groups
        const segmentIds = segments.map(s => s.id);
        const placeholders = segmentIds.map(() => '?').join(',');

        db.all(
          `SELECT * FROM rundown_groups 
           WHERE segment_id IN (${placeholders}) 
           ORDER BY position`,
          segmentIds,
          (err, groups) => {
            if (err) {
              db.close();
              return handleError(res, err, 'query groups');
            }

            console.log(`Found ${groups.length} groups`);

            if (groups.length === 0) {
              db.close();
              return res.json(segments.map(s => ({ ...s, groups: [] })));
            }

            // 3. Get items
            const groupIds = groups.map(g => g.id);
            const itemPlaceholders = groupIds.map(() => '?').join(',');

            db.all(
              `SELECT * FROM rundown_items 
               WHERE group_id IN (${itemPlaceholders}) 
               ORDER BY position`,
              groupIds,
              (err, items) => {
                db.close();
                if (err) return handleError(res, err, 'query items');

                console.log(`Found ${items?.length || 0} items`);

                // Process and nest data
                const processedItems = items.map(item => ({
                  ...item,
                  data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data
                }));

                const groupsWithItems = groups.map(group => ({
                  ...group,
                  expanded: true,
                  items: processedItems.filter(item => item.group_id === group.id)
                }));

                const segmentsWithGroups = segments.map(segment => ({
                  ...segment,
                  expanded: true,
                  groups: groupsWithItems.filter(group => group.segment_id === segment.id)
                }));

                res.json(segmentsWithGroups);
              }
            );
          }
        );
      }
    );
  });
});

// POST new segment
router.post('/episodes/:id/segments', (req, res) => {
  const db = getDb();
  const { name } = req.body;
  
  db.run(
    'INSERT INTO rundown_segments (episode_id, name, position) VALUES (?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM rundown_segments WHERE episode_id = ?))',
    [req.params.id, name, req.params.id],
    function(err) {
      if (err) {
        db.close();
        return handleError(res, err, 'insert');
      }
      
      db.get(
        'SELECT * FROM rundown_segments WHERE id = ?',
        [this.lastID],
        (err, row) => {
          db.close();
          if (err) return handleError(res, err, 'query');
          res.json(row);
        }
      );
    }
  );
});

// POST new group
router.post('/segments/:id/groups', (req, res) => {
  const db = getDb();
  const { name } = req.body;
  
  db.run(
    'INSERT INTO rundown_groups (segment_id, name, position) VALUES (?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM rundown_groups WHERE segment_id = ?))',
    [req.params.id, name || 'Untitled Group', req.params.id],
    function(err) {
      if (err) {
        db.close();
        return handleError(res, err, 'insert');
      }
      
      db.get(
        'SELECT * FROM rundown_groups WHERE id = ?',
        [this.lastID],
        (err, row) => {
          db.close();
          if (err) return handleError(res, err, 'query');
          res.json(row);
        }
      );
    }
  );
});

// POST new item
router.post('/groups/:id/items', (req, res) => {
  const db = getDb();
  const { type, data } = req.body;
  
  db.run(
    'INSERT INTO rundown_items (group_id, type, data, position) VALUES (?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM rundown_items WHERE group_id = ?))',
    [req.params.id, type, JSON.stringify(data), req.params.id],
    function(err) {
      if (err) {
        db.close();
        return handleError(res, err, 'insert');
      }
      
      db.get(
        'SELECT * FROM rundown_items WHERE id = ?',
        [this.lastID],
        (err, row) => {
          db.close();
          if (err) return handleError(res, err, 'query');
          
          // Parse the data JSON before sending
          if (row.data) {
            try {
              row.data = JSON.parse(row.data);
            } catch (e) {
              console.error('Error parsing item data:', e);
            }
          }
          
          res.json(row);
        }
      );
    }
  );
});

module.exports = router;