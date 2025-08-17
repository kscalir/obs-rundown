const express = require('express');
const router = express.Router();
const os = require('os');

// Get the local IP address
router.get('/ip', (req, res) => {
  try {
    const networkInterfaces = os.networkInterfaces();
    let localIP = null;
    
    // Find the first non-internal IPv4 address
    Object.keys(networkInterfaces).forEach(interfaceName => {
      networkInterfaces[interfaceName].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!localIP) {
            localIP = iface.address;
          }
        }
      });
    });
    
    res.json({ ip: localIP || 'localhost' });
  } catch (err) {
    res.json({ ip: 'localhost' });
  }
});

module.exports = router;