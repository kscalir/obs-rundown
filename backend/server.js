// No code changes necessary.
// The backend already implements persistent CRUD endpoints for rundown items:
// - GET /api/groups/:groupId/items
// - POST /api/groups/:groupId/items
// - PUT /api/items/:id
// - DELETE /api/items/:id
// These endpoints save, update, and delete rundown items in the database as required.
const express = require('express');
const cors = require('cors');
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Enable CORS for all requests
app.use(cors());

const upload = multer({ dest: path.join(__dirname, 'media') });

// POST /api/media - upload media and insert into DB
app.post('/api/media', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const ext = path.extname(file.originalname);
    const newFilename = file.filename + ext;
    const newPath = path.join(path.dirname(file.path), newFilename);
    fs.renameSync(file.path, newPath);

    const { showId } = req.body;
    const name = req.body.name && req.body.name.trim() ? req.body.name.trim() : file.originalname;
    if (!file || !showId) return res.status(400).json({ error: 'File and showId required' });

    // Only create thumb if image
    let thumbName = null;
    if (file.mimetype.startsWith('image/')) {
      // Make sure thumbs dir exists
      const thumbsDir = path.join(__dirname, 'media', 'thumbs');
      if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir);
      // Generate thumb filename (jpg for everything)
      thumbName = newFilename + '.jpg';
      const thumbPath = path.join(thumbsDir, thumbName);

      // Create 128x128 thumb (center crop)
      await sharp(newPath)
        .resize(128, 128, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
    }

    // Insert into DB
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'db.sqlite');
    const db = new sqlite3.Database(dbPath);

    const stmt = db.prepare(`
      INSERT INTO media (show_id, filename, originalname, type, thumb, name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      showId,
      newFilename,
      file.originalname,
      file.mimetype.startsWith('image/') ? 'image'
        : file.mimetype.startsWith('video/') ? 'video'
        : file.mimetype.startsWith('audio/') ? 'audio'
        : 'other',
      thumbName,
      name,
      function (err) {
        stmt.finalize();
        db.close();
        if (err) {
          console.error('DB insert error:', err);
          return res.status(500).json({ error: 'DB insert error' });
        }
        // Return the new record
        res.json({
          id: this.lastID,
          show_id: showId,
          filename: newFilename,
          originalname: file.originalname,
          type: file.mimetype.startsWith('image/') ? 'image'
            : file.mimetype.startsWith('video/') ? 'video'
            : file.mimetype.startsWith('audio/') ? 'audio'
            : 'other',
          thumb: thumbName,
          name
        });
      }
    );
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload' });
  }
});

// Static route to serve thumbs
app.use('/media/thumbs', express.static(path.join(__dirname, 'media', 'thumbs')));

// GET /api/shows - return all shows
app.get('/api/shows', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.all('SELECT * FROM shows', [], (err, rows) => {
    db.close();
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

// GET /api/shows/:showId/media - return all media for a given show, with optional filters
app.get('/api/shows/:showId/media', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const showId = req.params.showId;
  const { type, search } = req.query;

  // Build dynamic query
  let query = 'SELECT *, COALESCE(name, originalname) as displayName FROM media WHERE show_id = ?';
  let params = [showId];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (search) {
    query += ' AND originalname LIKE ?';
    params.push(`%${search}%`);
  }
  query += ' ORDER BY id DESC';

  db.all(query, params, (err, rows) => {
    db.close();
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

const PORT = 5050;

// --- EPISODES ENDPOINTS ---

// GET all episodes for a show
app.get('/api/shows/:showId/episodes', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const showId = req.params.showId;
  db.all('SELECT * FROM episodes WHERE show_id = ? ORDER BY id DESC', [showId], (err, rows) => {
    db.close();
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

// POST a new episode for a show (now lets DB set created_at/updated_at)
app.post('/api/shows/:showId/episodes', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const showId = req.params.showId;
  const { name } = req.body;
  if (!name || !name.trim()) {
    db.close();
    return res.status(400).json({ error: 'Episode name is required' });
  }
  db.run(
    'INSERT INTO episodes (show_id, name) VALUES (?, ?)',
    [showId, name.trim()],
    function (err) {
      if (err) {
        db.close();
        console.error('DB insert error:', err);
        return res.status(500).json({ error: 'DB insert error' });
      }
      // Fetch the newly created row with timestamps
      db.get('SELECT * FROM episodes WHERE id = ?', [this.lastID], (err2, row) => {
        db.close();
        if (err2) {
          return res.status(500).json({ error: 'DB fetch error' });
        }
        res.json(row);
      });
    }
  );
});

// PUT update episode name
app.put('/api/episodes/:id', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    db.close();
    return res.status(400).json({ error: 'Name is required' });
  }
  db.run('UPDATE episodes SET name = ? WHERE id = ?', [name.trim(), id], function (err) {
    db.close();
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'DB update error' });
    }
    res.json({ success: true });
  });
});

// DELETE episode
app.delete('/api/episodes/:id', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { id } = req.params;
  db.run('DELETE FROM episodes WHERE id = ?', [id], function (err) {
    db.close();
    if (err) {
      console.error('DB delete error:', err);
      return res.status(500).json({ error: 'DB delete error' });
    }
    res.json({ success: true });
  });
});

// Serve media files with the correct Content-Type (for audio/video preview)
app.get('/media/:filename', (req, res) => {
  const filename = req.params.filename;
  const mediaDir = path.join(__dirname, 'media');
  const filePath = path.join(mediaDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }

  // Set proper Content-Type
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';

  if (ext === '.mp3') contentType = 'audio/mpeg';
  else if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.ogg') contentType = 'audio/ogg';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.mov') contentType = 'video/quicktime';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.gif') contentType = 'image/gif';

  res.setHeader('Content-Type', contentType);
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /api/media/:id - remove media (DB + disk)
app.delete('/api/media/:id', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);

  const id = req.params.id;
  // Get info first (for filenames)
  db.get('SELECT * FROM media WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      db.close();
      return res.status(404).json({ error: 'Not found' });
    }

    // Remove from DB
    db.run('DELETE FROM media WHERE id = ?', [id], (err2) => {
      db.close();
      if (err2) return res.status(500).json({ error: 'DB delete error' });

      // Remove media file
      try {
        if (row.filename) {
          const mediaPath = path.join(__dirname, 'media', row.filename);
          if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
        }
        // Remove thumb if present
        if (row.thumb) {
          const thumbPath = path.join(__dirname, 'media', 'thumbs', row.thumb);
          if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }
      } catch (e) {
        // Don’t fail if file doesn’t exist, but log it
        console.warn('File delete error:', e);
      }

      res.json({ success: true });
    });
  });
});

// PUT /api/media/:id/name - update the name/title of a media item
app.put('/api/media/:id/name', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    db.close();
    return res.status(400).json({ error: 'Name is required' });
  }
  db.run('UPDATE media SET name = ? WHERE id = ?', [name.trim(), id], function (err) {
    db.close();
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'DB update error' });
    }
    res.json({ success: true });
  });
});

// POST /api/shows - add a new show

app.post('/api/shows', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name } = req.body;
  if (!name || !name.trim()) {
    db.close();
    return res.status(400).json({ error: 'Show name is required' });
  }
  db.run('INSERT INTO shows (name) VALUES (?)', [name.trim()], function (err) {
    db.close();
    if (err) {
      console.error('DB insert error:', err);
      return res.status(500).json({ error: 'DB insert error' });
    }
    res.json({ id: this.lastID, name: name.trim() });
  });
});

// --- RUNDOWN SEGMENTS ENDPOINTS ---

// GET all segments for an episode (with groups)
app.get('/api/episodes/:episodeId/segments', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);

  // Get all segments for this episode
  db.all(
    'SELECT * FROM rundown_segments WHERE episode_id = ? ORDER BY position, id',
    [req.params.episodeId],
    (err, segments) => {
      if (err) {
        db.close();
        console.error('DB error:', err);
        return res.status(500).json({ error: 'DB error' });
      }
      if (!segments.length) {
        db.close();
        return res.json([]);
      }

      // For each segment, get its groups
      let completed = 0;
      segments.forEach((seg, i) => {
        db.all(
          'SELECT * FROM rundown_groups WHERE segment_id = ? ORDER BY position, id',
          [seg.id],
          (err2, groups) => {
            segments[i].groups = groups || [];
            completed++;
            if (completed === segments.length) {
              db.close();
              res.json(segments);
            }
          }
        );
      });
    }
  );
});

// POST new segment
app.post('/api/episodes/:episodeId/segments', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name, position } = req.body;
  db.run(
    'INSERT INTO rundown_segments (episode_id, name, position) VALUES (?, ?, ?)',
    [req.params.episodeId, name || '', position || 0],
    function (err) {
      db.close();
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).json({ error: 'DB insert error' });
      }
      res.json({ id: this.lastID, episode_id: req.params.episodeId, name, position });
    }
  );
});

// PUT update segment
app.put('/api/segments/:id', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name, position } = req.body;
  db.run(
    'UPDATE rundown_segments SET name = ?, position = ? WHERE id = ?',
    [name, position, req.params.id],
    function (err) {
      db.close();
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'DB update error' });
      }
      res.json({ success: true });
    }
  );
});

// PATCH segment name only
app.patch('/api/segments/:id/name', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name } = req.body;
  db.run(
    'UPDATE rundown_segments SET name = ? WHERE id = ?',
    [name, req.params.id],
    function (err) {
      db.close();
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'DB update error' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE segment
app.delete('/api/segments/:id', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.run('DELETE FROM rundown_segments WHERE id = ?', [req.params.id], function (err) {
    db.close();
    if (err) {
      console.error('DB delete error:', err);
      return res.status(500).json({ error: 'DB delete error' });
    }
    res.json({ success: true });
  });
});

// --- RUNDOWN GROUPS ENDPOINTS ---

// GET all groups for a segment
app.get('/api/segments/:segmentId/groups', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.all('SELECT * FROM rundown_groups WHERE segment_id = ? ORDER BY position, id', [req.params.segmentId], (err, rows) => {
    db.close();
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

// POST new group
app.post('/api/segments/:segmentId/groups', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name, position } = req.body;
  db.run(
    'INSERT INTO rundown_groups (segment_id, name, position) VALUES (?, ?, ?)',
    [req.params.segmentId, name || '', position || 0],
    function (err) {
      db.close();
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).json({ error: 'DB insert error' });
      }
      res.json({ id: this.lastID, segment_id: req.params.segmentId, name, position });
    }
  );
});

// PUT update group
app.put('/api/groups/:id', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name, position } = req.body;
  db.run(
    'UPDATE rundown_groups SET name = ?, position = ? WHERE id = ?',
    [name, position, req.params.id],
    function (err) {
      db.close();
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'DB update error' });
      }
      res.json({ success: true });
    }
  );
});

// PATCH group name only
app.patch('/api/groups/:id/name', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name } = req.body;
  db.run(
    'UPDATE rundown_groups SET name = ? WHERE id = ?',
    [name, req.params.id],
    function (err) {
      db.close();
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'DB update error' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE group
app.delete('/api/groups/:id', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.run('DELETE FROM rundown_groups WHERE id = ?', [req.params.id], function (err) {
    db.close();
    if (err) {
      console.error('DB delete error:', err);
      return res.status(500).json({ error: 'DB delete error' });
    }
    res.json({ success: true });
  });
});

// --- RUNDOWN ITEMS ENDPOINTS ---

// GET all items for a group
app.get('/api/groups/:groupId/items', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.all('SELECT * FROM rundown_items WHERE group_id = ? ORDER BY position, id', [req.params.groupId], (err, rows) => {
    db.close();
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(rows);
  });
});

// POST new item
app.post('/api/groups/:groupId/items', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { type, data, position } = req.body;
  db.run(
    'INSERT INTO rundown_items (group_id, type, data, position) VALUES (?, ?, ?, ?)',
    [req.params.groupId, type || '', JSON.stringify(data || {}), position || 0],
    function (err) {
      db.close();
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).json({ error: 'DB insert error' });
      }
      res.json({ id: this.lastID, group_id: req.params.groupId, type, data, position });
    }
  );
});

// PUT update item
app.put('/api/items/:id', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { type, data, position } = req.body;
  db.run(
    'UPDATE rundown_items SET type = ?, data = ?, position = ? WHERE id = ?',
    [type, JSON.stringify(data || {}), position, req.params.id],
    function (err) {
      db.close();
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'DB update error' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.run('DELETE FROM rundown_items WHERE id = ?', [req.params.id], function (err) {
    db.close();
    if (err) {
      console.error('DB delete error:', err);
      return res.status(500).json({ error: 'DB delete error' });
    }
    res.json({ success: true });
  });
});

// PATCH item name only
app.patch('/api/items/:id/name', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name } = req.body;
  if (!name || !name.trim()) {
    db.close();
    return res.status(400).json({ error: 'Name is required' });
  }
  db.run(
    'UPDATE rundown_items SET name = ? WHERE id = ?',
    [name.trim(), req.params.id],
    function (err) {
      db.close();
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'DB update error' });
      }
      res.json({ success: true });
    }
  );
});
// Also allow PUT for renaming item, matching frontend expectation
app.put('/api/items/:id/name', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { name } = req.body;
  if (!name || !name.trim()) {
    db.close();
    return res.status(400).json({ error: 'Name is required' });
  }
  db.run(
    'UPDATE rundown_items SET name = ? WHERE id = ?',
    [name.trim(), req.params.id],
    function (err) {
      db.close();
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'DB update error' });
      }
      res.json({ success: true });
    }
  );
});

// PATCH segment position
app.patch('/api/segments/:id/position', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { position } = req.body;
  if (typeof position !== 'number') {
    db.close();
    return res.status(400).json({ error: 'Position is required' });
  }
  db.run('UPDATE rundown_segments SET position = ? WHERE id = ?', [position, req.params.id], function (err) {
    db.close();
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'DB update error' });
    }
    res.json({ success: true });
  });
});

// PATCH group position
app.patch('/api/groups/:id/position', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { position } = req.body;
  if (typeof position !== 'number') {
    db.close();
    return res.status(400).json({ error: 'Position is required' });
  }
  db.run('UPDATE rundown_groups SET position = ? WHERE id = ?', [position, req.params.id], function (err) {
    db.close();
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'DB update error' });
    }
    res.json({ success: true });
  });
});

// PATCH item position
app.patch('/api/items/:id/position', express.json(), (req, res) => {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'db.sqlite');
  const db = new sqlite3.Database(dbPath);
  const { position } = req.body;
  if (typeof position !== 'number') {
    db.close();
    return res.status(400).json({ error: 'Position is required' });
  }
  db.run('UPDATE rundown_items SET position = ? WHERE id = ?', [position, req.params.id], function (err) {
    db.close();
    if (err) {
      console.error('DB update error:', err);
      return res.status(500).json({ error: 'DB update error' });
    }
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend server listening on port ${PORT}`);
});