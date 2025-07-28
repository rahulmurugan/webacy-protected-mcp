#!/usr/bin/env node

/**
 * Final Railway deployment - Clean CommonJS server
 */

const http = require('http');

const port = process.env.PORT || 3001;

console.log('🚀 Final Railway server starting...');
console.log('📍 Port:', port);
console.log('📦 Node:', process.version);

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
  let contentType = 'application/json';
  
  if (req.url === '/' || req.url === '/health') {
    response = JSON.stringify({
      status: 'OK',
      service: 'Webacy MCP Server',
      timestamp: new Date().toISOString(),
      port: port,
      nodeVersion: process.version,
      message: 'Server is running successfully on Railway!'
    });
  } else if (req.url === '/mcp') {
    response = JSON.stringify({
      message: 'MCP endpoint ready',
      status: 'available',
      note: 'This will be the FastMCP endpoint once deployment is stable'
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', url: req.url }));
    return;
  }
  
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log('✅ Server running on http://0.0.0.0:' + port);
  console.log('🌐 Health: http://0.0.0.0:' + port + '/health');
  console.log('🔧 MCP: http://0.0.0.0:' + port + '/mcp');
  console.log('🎯 Railway deployment successful!');
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

console.log('🏁 Server setup complete'); 