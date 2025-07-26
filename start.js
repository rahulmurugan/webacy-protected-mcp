#!/usr/bin/env node

/**
 * Start script for Webacy Protected MCP Server
 * Ensures proper error handling and environment setup
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the server
const serverPath = join(__dirname, 'server.js');

console.log('🚀 Starting Webacy Protected MCP Server...');
console.log(`📁 Server path: ${serverPath}`);
console.log(`🔧 Node version: ${process.version}`);

const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`⚠️  Server terminated by signal: ${signal}`);
  } else if (code !== 0) {
    console.error(`❌ Server exited with code: ${code}`);
  }
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM received, forwarding to server...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📛 SIGINT received, forwarding to server...');
  child.kill('SIGINT');
});