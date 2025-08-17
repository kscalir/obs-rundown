const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

// Import routes
const showsRouter = require('./src/routes/shows');
const episodesRouter = require('./src/routes/episodes');
const rundownRouter = require('./src/routes/rundown');
const templatesRouter = require('./src/routes/templates');
const segmentsRouter = require('./src/routes/segments');
const groupsRouter = require('./src/routes/groups');
const itemsRouter = require('./src/routes/items');
const itemsV2Router = require('./src/routes/items_v2'); // New enhanced items API
const executionRouter = require('./src/routes/execution'); // New execution state API
const templateRegistry = require('./services/templateRegistry');
const graphicsRouter = require('./src/routes/graphics');
const obsRoutes = require('./src/routes/obsRoutes');
const systemRouter = require('./src/routes/system'); // System utilities
const db = require('./services/database');

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware

// CORS config (must not use "*" when sending credentials)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const corsOptions = {
  origin: true, // Allow all origins temporarily
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static media files
app.use('/media', express.static(path.join(__dirname, 'media')));

// Mount routes
app.use('/api/shows', showsRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/v2/items', itemsV2Router); // New enhanced items API with automation support
app.use('/api/execution', executionRouter); // Execution state management
app.use('/api', rundownRouter);
app.use('/api/graphics', graphicsRouter);
app.use('/api/media', require('./src/routes/media'));
app.use('/api/obs', require('./src/routes/obsRoutes'));
app.use('/api/system', systemRouter);

// Serve static files for uploads
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/media/thumbs', express.static(path.join(__dirname, 'media/thumbs')));

// Serve static files from public directory (for player.html)
app.use(express.static(path.join(__dirname, 'public')));

// Serve templates directory
app.use('/templates', express.static(path.join(__dirname, 'templates')));

// WebSocket setup
const wss = new WebSocket.Server({ server });

// Make WebSocket server globally available
global.wss = wss;

// Store control surface connections
const controlConnections = new Set();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const channel = parseInt(url.searchParams.get('channel') || '1');
  const isControl = url.searchParams.get('control') === 'true';
  
  console.log(`WebSocket client connected to channel ${channel}${isControl ? ' (control)' : ''}`);
  
  // Store channel info on the WebSocket
  ws.channel = channel;
  ws.isControl = isControl;
  
  if (isControl) {
    controlConnections.add(ws);
  }
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle control surface actions
      if (data.type === 'CONTROL_ACTION') {
        console.log('Received control action:', data);
        // Broadcast to all control connections
        controlConnections.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket client disconnected from channel ${channel}${isControl ? ' (control)' : ''}`);
    if (isControl) {
      controlConnections.delete(ws);
    }
  });
  
  ws.send(JSON.stringify({ type: 'connection', status: 'connected', channel }));
});

// Start server
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Initialize database
try {
  db.initialize();
  console.log('Database initialized successfully');
} catch (err) {
  console.error('Failed to initialize database:', err);
}

// Initialize template registry
templateRegistry.initialize().then(() => {
  console.log('Template registry initialized successfully');
}).catch(err => {
  console.error('Failed to initialize template registry:', err);
});