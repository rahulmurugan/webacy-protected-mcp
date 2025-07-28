#!/usr/bin/env node

/**
 * Minimal Webacy Protected MCP Server
 * Based on the working protected-coingecko-mcp-demo pattern
 */

import { FastMCP } from "fastmcp";
import { z } from "zod";
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Initialize server with health endpoint
const server = new FastMCP({
  name: "Webacy Risk Analysis MCP Server",
  version: "1.0.0",
  description: "Token-gated blockchain security and risk analysis via Webacy API"
});

// Get configuration
const API_KEY = process.env.WEBACY_API_KEY;
const WEBACY_API_URL = 'https://api.webacy.com';

// Helper function to make Webacy API requests
async function makeWebacyRequest(endpoint, options = {}) {
  const url = `${WEBACY_API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-KEY': API_KEY }),
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    throw new Error(`Webacy API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Add tools
server.addTool({
  name: "ping",
  description: "Check Webacy API server status",
  parameters: z.object({}),
  execute: async () => {
    return JSON.stringify({
      status: "OK",
      service: "Webacy Risk Analysis MCP Server",
      timestamp: new Date().toISOString(),
      message: "Server is running and ready to analyze blockchain security risks"
    });
  }
});

server.addTool({
  name: "checkAddressThreat",
  description: "Analyze threat considerations for an address - checks if address poses risk to others",
  parameters: z.object({
    address: z.string().describe("The blockchain address to analyze for threat risks"),
    chain: z.string().optional().describe("Chain to query (eth, arb, base, bsc, pol, opt, sol, sei, sui, ton). Defaults to eth"),
    show_low_risk: z.boolean().optional().describe("Return details on low risk issues found with the address")
  }),
  execute: async (args) => {
    const endpoint = `/addresses/threat/${args.address}`;
    const queryParams = new URLSearchParams();
    
    if (args.chain) {
      queryParams.append('chain', args.chain);
    }
    if (args.show_low_risk !== undefined) {
      queryParams.append('show_low_risk', args.show_low_risk.toString());
    }
    
    const finalEndpoint = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;
    const data = await makeWebacyRequest(finalEndpoint);
    
    return JSON.stringify(data);
  }
});

server.addTool({
  name: "checkSanctionStatus",
  description: "Check if a wallet address is sanctioned or included in any sanctioned address databases",
  parameters: z.object({
    walletAddress: z.string().describe("The wallet address to check for sanctions")
  }),
  execute: async (args) => {
    const endpoint = `/addresses/sanctioned/${args.walletAddress}`;
    const data = await makeWebacyRequest(endpoint);
    
    return JSON.stringify(data);
  }
});

server.addTool({
  name: "analyzeContract",
  description: "Real-time smart contract risk analysis through fuzzing, static analysis, and dynamic analysis",
  parameters: z.object({
    contractAddress: z.string().describe("The smart contract address to analyze"),
    fromBytecode: z.boolean().optional().describe("Set to true for bytecode scanning of unverified contracts (slower but more thorough)"),
    refreshCache: z.boolean().optional().describe("Set to true to re-run analysis, false to retrieve cached results"),
    callback: z.string().optional().describe("Callback URL to retrieve delayed data from bytecode analysis")
  }),
  execute: async (args) => {
    const endpoint = `/contracts/${args.contractAddress}`;
    const queryParams = new URLSearchParams();
    
    if (args.fromBytecode !== undefined) {
      queryParams.append('fromBytecode', args.fromBytecode.toString());
    }
    if (args.refreshCache !== undefined) {
      queryParams.append('refreshCache', args.refreshCache.toString());
    }
    if (args.callback) {
      queryParams.append('callback', args.callback);
    }
    
    const finalEndpoint = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;
    const data = await makeWebacyRequest(finalEndpoint);
    
    return JSON.stringify(data);
  }
});

server.addTool({
  name: "analyzeTransaction",
  description: "Get risk analysis for a specific transaction hash including counterparty risks and asset risks",
  parameters: z.object({
    txHash: z.string().describe("The transaction hash to analyze")
  }),
  execute: async (args) => {
    const endpoint = `/transactions/${args.txHash}`;
    const data = await makeWebacyRequest(endpoint);
    
    return JSON.stringify(data);
  }
});

server.addTool({
  name: "analyzeUrl",
  description: "Predict maliciousness of a URL using ML models trained on web3 data - detect phishing and scam sites",
  parameters: z.object({
    url: z.string().describe("The URL to analyze for risks")
  }),
  execute: async (args) => {
    const endpoint = '/url';
    const data = await makeWebacyRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ url: args.url })
    });
    
    return JSON.stringify(data);
  }
});

// Start server
async function startServer() {
  const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
  
  console.log('🔧 Environment check:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`);
  console.log(`- PORT: ${process.env.PORT}`);
  console.log(`- Production mode: ${isProduction}`);
  
  if (isProduction) {
    const port = parseInt(process.env.PORT) || 3001;
    console.log(`🚀 Starting Webacy MCP server on port ${port}...`);
    
    try {
      console.log('📦 Initializing FastMCP server...');
      
      await server.start({
        transportType: "httpStream",
        httpStream: {
          port: port,
          endpoint: "/mcp",
          host: "0.0.0.0"
        }
      });
      
      console.log(`✅ FastMCP server running on http://0.0.0.0:${port}`);
      console.log(`📍 MCP endpoint: http://0.0.0.0:${port}/mcp`);
      console.log(`🔍 Health available through MCP protocol`);
      console.log(`🌐 Ready for connections`);
      console.log('🎯 Server startup completed successfully');
      
      // Keep process alive
      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        process.exit(0);
      });
      
      process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  } else {
    console.log('🚀 Starting Webacy MCP server in development mode...');
    await server.start({
      transportType: "stdio"
    });
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}); 