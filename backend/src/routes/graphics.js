const express = require('express');
const router = express.Router();

// Graphics control endpoint
router.post('/control', async (req, res) => {
  try {
    const { command, channel, templateId, data } = req.body;
    
    console.log(`Graphics control: ${command} on channel ${channel}`, {
      templateId,
      data
    });

    // Here you would send the data to your WebSocket clients
    // For now, let's just log and return success
    
    // TODO: Send to WebSocket clients on the specified channel
    // This will be implemented when we build the WebSocket broadcasting
    
    res.json({
      success: true,
      command,
      channel,
      templateId,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Graphics control error:', err);
    res.status(500).json({ 
      error: 'Failed to process graphics command',
      details: err.message 
    });
  }
});

module.exports = router;