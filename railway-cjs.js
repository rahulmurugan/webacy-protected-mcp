#!/usr/bin/env node

/**
 * Railway CommonJS server for debugging deployment issues
 */

console.log('🔍 Railway CJS Debug: Starting script...');
console.log('📦 Node version:', process.version);
console.log('🌍 Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('- PORT:', process.env.PORT);

try {
  console.log('📥 Importing dependencies...');
  
  // Basic HTTP server (CommonJS)
  const { createServer } = require('http');
  
  console.log('✅ HTTP imported successfully');
  
  const port = parseInt(process.env.PORT) || 3001;
  console.log('🚀 Creating HTTP server on port:', port);
  
  const server = createServer((req, res) => {
    console.log('📨 Request received:', req.method, req.url);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Webacy Railway CJS Debug Server',
        port: port,
        nodeVersion: process.version,
        moduleType: 'CommonJS'
      }));
    } else if (req.url === '/mcp') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'MCP endpoint placeholder - CommonJS server working',
        status: 'debug',
        moduleType: 'CommonJS'
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  server.listen(port, '0.0.0.0', () => {
    console.log('✅ HTTP server listening on:', `http://0.0.0.0:${port}`);
    console.log('🎯 Server ready for connections');
  });
  
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📡 SIGTERM received, shutting down...');
    server.close(() => {
      console.log('🛑 Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('📡 SIGINT received, shutting down...');
    server.close(() => {
      console.log('🛑 Server closed');
      process.exit(0);
    });
  });
  
  console.log('🏁 Script setup complete');
  
} catch (error) {
  console.error('💥 Fatal error during startup:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
} 