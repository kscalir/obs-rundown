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
const templateRegistry = require('./services/templateRegistry');
const graphicsRouter = require('./src/routes/graphics');
const obsRoutes = require('./src/routes/obsRoutes');

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware

app.use(cors({
  origin: '*', // or your frontend origin
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/shows', showsRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/items', itemsRouter);
app.use('/api', rundownRouter);
app.use('/api/graphics', graphicsRouter);
app.use('/api/media', require('./src/routes/media'));
app.use('/api/obs', require('./src/routes/obsRoutes'));

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

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const channel = parseInt(url.searchParams.get('channel') || '1');
  
  console.log(`WebSocket client connected to channel ${channel}`);
  
  // Store channel info on the WebSocket
  ws.channel = channel;
  
  ws.on('close', () => {
    console.log(`WebSocket client disconnected from channel ${channel}`);
  });
  
  ws.send(JSON.stringify({ type: 'connection', status: 'connected', channel }));
});

// Start server
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Initialize template registry
templateRegistry.initialize().then(() => {
  console.log('Template registry initialized successfully');
}).catch(err => {
  console.error('Failed to initialize template registry:', err);
});