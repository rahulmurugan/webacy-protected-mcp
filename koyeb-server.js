#!/usr/bin/env node

/**
 * Koyeb-optimized Webacy MCP Server
 */

const http = require('http');

const port = process.env.PORT || 8000; // Koyeb uses port 8000

console.log('🚀 Koyeb server starting...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

const server = http.createServer((req, res) => {
  console.log('📨 Request:', req.method, req.url);
  
  // CORS headers
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
      platform: 'Koyeb',
      message: 'Server running successfully on Koyeb!'
    });
  } else if (req.url === '/mcp') {
    response = JSON.stringify({
      message: 'MCP endpoint ready',
      status: 'available',
      platform: 'Koyeb',
      note: 'FastMCP will be integrated once basic deployment is stable'
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', url: req.url }));
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log('✅ Koyeb server running on port:', port);
  console.log('🌐 Health endpoint: http://0.0.0.0:' + port + '/health');
  console.log('🔧 MCP endpoint: http://0.0.0.0:' + port + '/mcp');
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('🛑 Server closed cleanly');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('🛑 Server closed cleanly');
    process.exit(0);
  });
});

console.log('🏁 Koyeb server setup complete'); 