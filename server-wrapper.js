import { FastMCP } from "fastmcp";
import { z } from "zod";
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import http from 'http';

// Import EVMAuth SDK
import { EVMAuthSDK } from './lib/evmauth/esm/index.js';
import { 
  EVMAUTH_CONFIG, 
  TOKEN_REQUIREMENTS, 
  isMethodProtected, 
  getRequiredTokenId 
} from './evmauth-config.js';

// Load environment variables
dotenv.config();

// Set flag to prevent server.js from auto-starting
process.env.WEBACY_WRAPPER_MODE = 'true';

const port = parseInt(process.env.PORT) || 3001;
console.log(`Starting server wrapper on port ${port}...`);

// Create a simple HTTP server that will handle health checks and proxy to FastMCP
const httpServer = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Handle health checks
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      server: 'webacy-protected-mcp',
      mcp_endpoint: '/mcp',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // For all other requests, return 404 (FastMCP will handle /mcp internally)
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found. Use /mcp for MCP protocol.' }));
});

// Start the HTTP server
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`HTTP wrapper server listening on http://0.0.0.0:${port}`);
  console.log('Health check available at /health');
});

// Import and start the FastMCP server
console.log('Starting FastMCP server...');
try {
  await import('./server.js');
  console.log('FastMCP server started successfully');
} catch (error) {
  console.error('Failed to start FastMCP server:', error);
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});

console.log('Server wrapper ready and listening for connections');