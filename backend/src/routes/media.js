const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, handleError } = require('../utils/db');
const sharp = require('sharp');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Change from uploads to media directory
    const uploadDir = path.join(__dirname, '../../media');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// GET all media for show (matches your frontend URL pattern)
router.get('/show/:showId', (req, res) => {
  const db = getDb();
  const { type, search } = req.query;
  
  let query = 'SELECT * FROM media WHERE show_id = ?';
  let params = [req.params.showId];
  
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  
  if (search) {
    query += ' AND (name LIKE ? OR originalname LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  query += ' ORDER BY id DESC';
  
  db.all(query, params, (err, rows) => {
    db.close();
    if (err) return handleError(res, err, 'query');
    res.json(rows);
  });
});

// POST upload new media
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const { showId, name } = req.body;
  if (!showId) {
    return res.status(400).json({ error: 'Show ID required' });
  }
  
  const db = getDb();
  const mediaType = req.file.mimetype.split('/')[0]; // 'image', 'video', 'audio'
  const displayName = name || req.file.originalname;
  
  let thumbFilename = null;
  let duration = null;
  
  try {
    // Generate thumbnail for images
    if (mediaType === 'image') {
      const thumbsDir = path.join(__dirname, '../../media/thumbs');
      if (!fs.existsSync(thumbsDir)) {
        fs.mkdirSync(thumbsDir, { recursive: true });
      }
      
      thumbFilename = `thumb_${Date.now()}.png`;
      const thumbPath = path.join(thumbsDir, thumbFilename);
      
      await sharp(req.file.path)
        .resize(300, 200, { 
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(thumbPath);
        
      console.log(`Thumbnail created: ${thumbFilename}`);
    }
    
    // Get duration for video and audio files
    if (mediaType === 'video' || mediaType === 'audio') {
      try {
        const probeData = await ffprobe(req.file.path, { path: ffprobeStatic.path });
        
        if (probeData.streams && probeData.streams.length > 0) {
          // Get duration from the first stream that has it
          for (const stream of probeData.streams) {
            if (stream.duration) {
              duration = parseFloat(stream.duration);
              break;
            }
          }
          
          // Fallback to format duration if stream duration not found
          if (!duration && probeData.format && probeData.format.duration) {
            duration = parseFloat(probeData.format.duration);
          }
        }
        
        console.log(`Duration detected: ${duration} seconds for ${req.file.originalname}`);
      } catch (probeError) {
        console.error('Error detecting duration:', probeError);
        // Continue without duration if detection fails
      }
    }
    
  } catch (error) {
    console.error('Error processing media:', error);
    // Continue with upload even if processing fails
  }
  
  db.run(
    `INSERT INTO media (show_id, filename, type, originalname, thumb, name, size, duration) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [showId, req.file.filename, mediaType, req.file.originalname, 
     thumbFilename, displayName, req.file.size, duration],
    function(err) {
      if (err) {
        db.close();
        // Clean up uploaded file on error
        fs.unlink(req.file.path, () => {});
        if (thumbFilename) {
          fs.unlink(path.join(__dirname, '../../media/thumbs', thumbFilename), () => {});
        }
        return handleError(res, err, 'insert');
      }
      
      db.get('SELECT * FROM media WHERE id = ?', [this.lastID], (err, row) => {
        db.close();
        if (err) return handleError(res, err, 'query');
        console.log('Media inserted with duration:', row);
        res.json(row);
      });
    }
  );
});

// PUT update media name
router.put('/:mediaId/name', express.json(), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name required' });
  }
  
  const db = getDb();
  db.run(
    'UPDATE media SET name = ? WHERE id = ?',
    [name.trim(), req.params.mediaId],
    function(err) {
      db.close();
      if (err) return handleError(res, err, 'update');
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Media not found' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE media
router.delete('/:mediaId', (req, res) => {
  const db = getDb();
  
  // First get the file info to delete the actual file
  db.get('SELECT filename FROM media WHERE id = ?', [req.params.mediaId], (err, row) => {
    if (err) {
      db.close();
      return handleError(res, err, 'query');
    }
    
    if (!row) {
      db.close();
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Delete from database
    db.run('DELETE FROM media WHERE id = ?', [req.params.mediaId], function(err) {
      db.close();
      if (err) return handleError(res, err, 'delete');
      
      // Delete actual file - use media directory instead of uploads
      const filePath = path.join(__dirname, '../../media', row.filename);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
      
      res.json({ success: true });
    });
  });
});

module.exports = router;