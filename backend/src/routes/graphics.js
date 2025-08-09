const express = require('express');
const router = express.Router();

// AMCP-style graphics control
router.post('/control', async (req, res) => {
  try {
    const { command, channel, layer, templateId, data } = req.body;
    
    console.log('AMCP Graphics command:', { command, channel, layer, templateId, data });
    
    // Validate required parameters
    if (!command || !channel) {
      return res.status(400).json({ error: 'Command and channel are required' });
    }

    let amcpMessage;
    
    switch (command.toLowerCase()) {
      case 'cg_add':
        // CG ADD [channel:int]{-[layer:int]} [template:string] [play-on-load:0,1] {[data]}
        amcpMessage = {
          command: 'CG_ADD',
          channel: parseInt(channel),
          layer: parseInt(layer || 1),
          template: templateId,
          playOnLoad: true,
          data: formatTemplateData(data)
        };
        break;
        
      case 'cg_play':
        // CG PLAY [channel:int]{-[layer:int]}
        amcpMessage = {
          command: 'CG_PLAY', 
          channel: parseInt(channel),
          layer: parseInt(layer || 1)
        };
        break;
        
      case 'cg_stop':
        // CG STOP [channel:int]{-[layer:int]}
        amcpMessage = {
          command: 'CG_STOP',
          channel: parseInt(channel),
          layer: parseInt(layer || 1)
        };
        break;
        
      case 'cg_next':
        // CG NEXT [channel:int]{-[layer:int]}
        amcpMessage = {
          command: 'CG_NEXT',
          channel: parseInt(channel),
          layer: parseInt(layer || 1)
        };
        break;
        
      case 'cg_remove':
        // CG REMOVE [channel:int]{-[layer:int]}
        amcpMessage = {
          command: 'CG_REMOVE',
          channel: parseInt(channel),
          layer: parseInt(layer || 1)
        };
        break;
        
      case 'cg_clear':
        // CG CLEAR [channel:int]
        amcpMessage = {
          command: 'CG_CLEAR',
          channel: parseInt(channel)
        };
        break;
        
      case 'cg_update':
        // CG UPDATE [channel:int]{-[layer:int]} [data]
        amcpMessage = {
          command: 'CG_UPDATE',
          channel: parseInt(channel),
          layer: parseInt(layer || 1),
          data: formatTemplateData(data)
        };
        break;
        
      case 'cg_invoke':
        // CG INVOKE [channel:int]{-[layer:int]} [method:string]
        amcpMessage = {
          command: 'CG_INVOKE',
          channel: parseInt(channel),
          layer: parseInt(layer || 1),
          method: data?.method || 'play'
        };
        break;
        
      default:
        return res.status(400).json({ error: `Unknown command: ${command}` });
    }
    
    // Broadcast to WebSocket clients
    if (global.wss) {
      const wsMessage = JSON.stringify({
        command: amcpMessage.command,
        channel: parseInt(channel),
        layer: parseInt(layer || 1),
        templateId: templateId,  // Make sure this is the correct field name
        template: templateId,    // Keep both for compatibility
        data: formatTemplateData(data),
        originalData: data,      // Send original data too
        playOnLoad: amcpMessage.playOnLoad || false
      });
      
      console.log('Sending WebSocket message:', wsMessage);
      
      global.wss.clients.forEach(client => {
        if (client.readyState === 1 && client.channel === parseInt(channel)) {
          console.log(`Sending to WebSocket client on channel ${client.channel}`);
          client.send(wsMessage);
        }
      });
    } else {
      console.log('No WebSocket server available');
    }
    
    res.json({ 
      success: true, 
      amcp: amcpMessage,
      message: `${amcpMessage.command} sent to channel ${channel}${layer ? `-${layer}` : ''}`
    });
    
  } catch (error) {
    console.error('Graphics control error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to format template data for AMCP
function formatTemplateData(data) {
  if (!data) return '';
  
  // Convert simple object to XML-like format for CasparCG
  if (typeof data === 'object') {
    const xmlData = Object.keys(data).map(key => {
      const value = data[key];
      return `<componentData id="${key}"><data id="text" value="${escapeXml(value)}"/></componentData>`;
    }).join('');
    
    return `<templateData>${xmlData}</templateData>`;
  }
  
  return String(data);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = router;