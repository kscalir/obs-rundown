const express = require('express');
const router = express.Router();
const db = require('../../services/database');

// Parse active_overlays JSON field
function parseExecutionState(row) {
  if (!row) return row;
  if (row.active_overlays) {
    try {
      row.active_overlays = JSON.parse(row.active_overlays);
    } catch (e) {
      row.active_overlays = [];
    }
  }
  return row;
}

// Get execution state for an episode
router.get('/episode/:episodeId', (req, res) => {
  const { episodeId } = req.params;
  
  try {
    const state = db.executeGet(
      'SELECT * FROM execution_state WHERE episode_id = ? ORDER BY id DESC LIMIT 1',
      [episodeId]
    );
    
    if (!state) {
      // Create default state if none exists
      const result = db.executeRun(
        `INSERT INTO execution_state (episode_id, is_paused, active_overlays) 
         VALUES (?, 0, '[]')`,
        [episodeId]
      );
      
      const newState = db.executeGet(
        'SELECT * FROM execution_state WHERE id = ?',
        [result.lastInsertRowid]
      );
      
      return res.json(parseExecutionState(newState));
    }
    
    res.json(parseExecutionState(state));
  } catch (err) {
    return db.handleError(res, err, 'get execution state');
  }
});

// Update execution state
router.put('/episode/:episodeId', (req, res) => {
  const { episodeId } = req.params;
  const {
    live_item_id,
    preview_item_id,
    next_item_id,
    is_paused,
    paused_at,
    remaining_time,
    armed_transition,
    armed_manual_item_id,
    current_manual_block_id,
    active_overlays
  } = req.body;
  
  try {
    // Check if state exists
    let state = db.executeGet(
      'SELECT id FROM execution_state WHERE episode_id = ? ORDER BY id DESC LIMIT 1',
      [episodeId]
    );
    
    if (!state) {
      // Create new state
      const sql = `
        INSERT INTO execution_state (
          episode_id, live_item_id, preview_item_id, next_item_id,
          is_paused, paused_at, remaining_time,
          armed_transition, armed_manual_item_id, current_manual_block_id,
          active_overlays
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = db.executeRun(sql, [
        episodeId,
        live_item_id || null,
        preview_item_id || null,
        next_item_id || null,
        is_paused ? 1 : 0,
        paused_at || null,
        remaining_time || null,
        armed_transition || null,
        armed_manual_item_id || null,
        current_manual_block_id || null,
        JSON.stringify(active_overlays || [])
      ]);
      
      state = { id: result.lastInsertRowid };
    } else {
      // Update existing state
      const updateFields = [];
      const values = [];
      
      if (live_item_id !== undefined) {
        updateFields.push('live_item_id = ?');
        values.push(live_item_id);
      }
      
      if (preview_item_id !== undefined) {
        updateFields.push('preview_item_id = ?');
        values.push(preview_item_id);
      }
      
      if (next_item_id !== undefined) {
        updateFields.push('next_item_id = ?');
        values.push(next_item_id);
      }
      
      if (is_paused !== undefined) {
        updateFields.push('is_paused = ?');
        values.push(is_paused ? 1 : 0);
      }
      
      if (paused_at !== undefined) {
        updateFields.push('paused_at = ?');
        values.push(paused_at);
      }
      
      if (remaining_time !== undefined) {
        updateFields.push('remaining_time = ?');
        values.push(remaining_time);
      }
      
      if (armed_transition !== undefined) {
        updateFields.push('armed_transition = ?');
        values.push(armed_transition);
      }
      
      if (armed_manual_item_id !== undefined) {
        updateFields.push('armed_manual_item_id = ?');
        values.push(armed_manual_item_id);
      }
      
      if (current_manual_block_id !== undefined) {
        updateFields.push('current_manual_block_id = ?');
        values.push(current_manual_block_id);
      }
      
      if (active_overlays !== undefined) {
        updateFields.push('active_overlays = ?');
        values.push(JSON.stringify(active_overlays));
      }
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(state.id);
        
        const sql = `UPDATE execution_state SET ${updateFields.join(', ')} WHERE id = ?`;
        db.executeRun(sql, values);
      }
    }
    
    // Return updated state
    const updatedState = db.executeGet(
      'SELECT * FROM execution_state WHERE id = ?',
      [state.id]
    );
    
    res.json(parseExecutionState(updatedState));
  } catch (err) {
    return db.handleError(res, err, 'update execution state');
  }
});

// Pause/Resume execution
router.post('/episode/:episodeId/pause', (req, res) => {
  const { episodeId } = req.params;
  const { pause, remaining_time } = req.body;
  
  try {
    const state = db.executeGet(
      'SELECT id FROM execution_state WHERE episode_id = ? ORDER BY id DESC LIMIT 1',
      [episodeId]
    );
    
    if (!state) {
      return res.status(404).json({ error: 'No execution state found for episode' });
    }
    
    if (pause) {
      // Pause execution
      db.executeRun(
        `UPDATE execution_state 
         SET is_paused = 1, paused_at = ?, remaining_time = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [Date.now(), remaining_time || null, state.id]
      );
    } else {
      // Resume execution
      db.executeRun(
        `UPDATE execution_state 
         SET is_paused = 0, paused_at = NULL, remaining_time = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [state.id]
      );
    }
    
    const updatedState = db.executeGet(
      'SELECT * FROM execution_state WHERE id = ?',
      [state.id]
    );
    
    res.json(parseExecutionState(updatedState));
  } catch (err) {
    return db.handleError(res, err, 'pause/resume execution');
  }
});

// Add overlay to active overlays
router.post('/episode/:episodeId/overlay/add', (req, res) => {
  const { episodeId } = req.params;
  const { overlay } = req.body; // overlay object with id, type, startTime, etc.
  
  if (!overlay || !overlay.id) {
    return res.status(400).json({ error: 'Overlay with id is required' });
  }
  
  try {
    const state = db.executeGet(
      'SELECT id, active_overlays FROM execution_state WHERE episode_id = ? ORDER BY id DESC LIMIT 1',
      [episodeId]
    );
    
    if (!state) {
      return res.status(404).json({ error: 'No execution state found for episode' });
    }
    
    let activeOverlays = [];
    try {
      activeOverlays = JSON.parse(state.active_overlays || '[]');
    } catch (e) {
      activeOverlays = [];
    }
    
    // Add overlay with timestamp
    activeOverlays.push({
      ...overlay,
      startTime: Date.now()
    });
    
    db.executeRun(
      'UPDATE execution_state SET active_overlays = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(activeOverlays), state.id]
    );
    
    res.json({ success: true, active_overlays: activeOverlays });
  } catch (err) {
    return db.handleError(res, err, 'add overlay');
  }
});

// Remove overlay from active overlays
router.post('/episode/:episodeId/overlay/remove', (req, res) => {
  const { episodeId } = req.params;
  const { overlayId } = req.body;
  
  if (!overlayId) {
    return res.status(400).json({ error: 'overlayId is required' });
  }
  
  try {
    const state = db.executeGet(
      'SELECT id, active_overlays FROM execution_state WHERE episode_id = ? ORDER BY id DESC LIMIT 1',
      [episodeId]
    );
    
    if (!state) {
      return res.status(404).json({ error: 'No execution state found for episode' });
    }
    
    let activeOverlays = [];
    try {
      activeOverlays = JSON.parse(state.active_overlays || '[]');
    } catch (e) {
      activeOverlays = [];
    }
    
    // Remove overlay by id
    activeOverlays = activeOverlays.filter(o => o.id !== overlayId);
    
    db.executeRun(
      'UPDATE execution_state SET active_overlays = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(activeOverlays), state.id]
    );
    
    res.json({ success: true, active_overlays: activeOverlays });
  } catch (err) {
    return db.handleError(res, err, 'remove overlay');
  }
});

// Clear all overlays
router.post('/episode/:episodeId/overlay/clear', (req, res) => {
  const { episodeId } = req.params;
  
  try {
    const state = db.executeGet(
      'SELECT id FROM execution_state WHERE episode_id = ? ORDER BY id DESC LIMIT 1',
      [episodeId]
    );
    
    if (!state) {
      return res.status(404).json({ error: 'No execution state found for episode' });
    }
    
    db.executeRun(
      'UPDATE execution_state SET active_overlays = \'[]\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [state.id]
    );
    
    res.json({ success: true, active_overlays: [] });
  } catch (err) {
    return db.handleError(res, err, 'clear overlays');
  }
});

// Reset execution state for episode
router.delete('/episode/:episodeId', (req, res) => {
  const { episodeId } = req.params;
  
  try {
    const result = db.executeRun(
      'DELETE FROM execution_state WHERE episode_id = ?',
      [episodeId]
    );
    
    res.json({ 
      success: true, 
      deleted: result.changes
    });
  } catch (err) {
    return db.handleError(res, err, 'reset execution state');
  }
});

module.exports = router;