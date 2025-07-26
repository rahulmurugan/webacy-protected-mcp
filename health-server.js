#!/usr/bin/env node

/**
 * Simple health check server for Webacy Protected MCP
 * Can be used to verify deployment is working
 */

import express from 'express';
import cors from 'cors';

const app = express();
const port = parseInt(process.env.PORT) || 3001;

// Enable CORS
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Webacy Protected MCP Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Webacy Protected MCP Server',
    description: 'EVMAuth-protected blockchain security analysis',
    endpoints: {
      mcp: '/mcp',
      health: '/health'
    }
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🏥 Health check server running on http://0.0.0.0:${port}`);
  console.log(`📍 Health endpoint: http://0.0.0.0:${port}/health`);
});