#!/usr/bin/env node

/**
 * Heroku-optimized server
 */

const http = require('http');

const port = process.env.PORT || 3001;

console.log('🚀 Heroku server starting...');
console.log('📍 Port:', port);

const server = http.createServer((req, res) => {
  console.log('📨 Request:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let response;
  
  if (req.url === '/' || req.url === '/health') {
    response = JSON.stringify({
      status: 'OK',
      service: 'Webacy MCP Server',
      timestamp: new Date().toISOString(),
      port: port,
      nodeVersion: process.version,
      platform: 'Heroku',
      message: 'Server running successfully!'
    });
  } else if (req.url === '/mcp') {
    response = JSON.stringify({
      message: 'MCP endpoint ready',
      status: 'available',
      platform: 'Heroku'
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', url: req.url }));
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(response);
});

// Heroku assigns a dynamic port
server.listen(port, '0.0.0.0', () => {
  console.log('✅ Heroku server running on port:', port);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Heroku shutdown handling
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('🛑 Server closed cleanly');
    process.exit(0);
  });
});

console.log('🏁 Heroku server setup complete'); 