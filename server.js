import { FastMCP } from "fastmcp";
import { z } from "zod";
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Import EVMAuth SDK
import { EVMAuthSDK } from './lib/evmauth/esm/index.js';
import { 
  EVMAUTH_CONFIG, 
  TOKEN_REQUIREMENTS, 
  isMethodProtected, 
  getRequiredTokenId,
  getTierName
} from './evmauth-config.js';

// Load environment variables
dotenv.config();

// Get API key from environment
const API_KEY = process.env.WEBACY_API_KEY;

// Base URL for Webacy API
const WEBACY_API_URL = 'https://api.webacy.com';

// Initialize EVMAuth SDK
let evmAuthSDK = null;
try {
  evmAuthSDK = new EVMAuthSDK(EVMAUTH_CONFIG);
  console.log('✅ EVMAuth SDK initialized successfully');
  
  if (EVMAUTH_CONFIG.devMode) {
    console.log('🚨 DEVELOPMENT MODE ENABLED - Use only for testing!');
  }
} catch (error) {
  console.error('❌ Failed to initialize EVMAuth SDK:', error.message);
  console.log('⚠️  Server will run WITHOUT token protection');
}

// Create FastMCP server
const server = new FastMCP({
  name: "Webacy Risk Analysis MCP Server",
  version: "1.0.0",
  description: "Token-gated blockchain security and risk analysis via Webacy API",
  // Enable health endpoint for Railway
  health: {
    enabled: true,
    path: "/health",
    message: "OK",
    status: 200
  }
});

/**
 * Helper function to execute tool functions with EVMAuth protection
 */
function createProtectedExecutor(requiredTokenId, executor) {
  // If no protection needed or SDK not available, return original executor
  if (!requiredTokenId || !evmAuthSDK) {
    return executor;
  }

  // Return protected executor
  return async (args, context) => {
    // Extract proof from arguments
    const proof = args._evmauthProof;
    
    // Create a mock MCP request for EVMAuth SDK
    const mcpRequest = {
      params: {
        arguments: args
      }
    };

    // Use EVMAuth SDK's protect method
    const protectedHandler = evmAuthSDK.protect(requiredTokenId, async () => {
      // Call original executor
      const result = await executor(args, context);
      
      // Wrap result for EVMAuth SDK
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ]
      };
    });

    try {
      // Execute protected handler
      const response = await protectedHandler(mcpRequest);
      
      // Extract result from EVMAuth response
      if (response.content && response.content[0]) {
        const text = response.content[0].text;
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
      
      // Handle error response - return proper EVMAuth structure
      if (response.error) {
        // FastMCP expects errors to be thrown, so we throw a special error
        // that FastMCP will convert to the proper response format
        const evmAuthError = new Error(JSON.stringify({
          error: {
            code: response.error.code || 'EVMAUTH_PROOF_REQUIRED',
            message: response.error.message || 'Cryptographic proof of wallet ownership required',
            details: response.error.details || {
              reason: 'PROOF_MISSING',
              contractAddress: '0x9f2B42FB651b75CC3db4ef9FEd913A22BA4629Cf',
              chainId: 1223954
            }
          }
        }));
        evmAuthError.name = 'EVMAuthError';
        throw evmAuthError;
      }

      throw new Error('Invalid response from EVMAuth SDK');
    } catch (error) {
      // Return EVMAuth error structure for any caught errors
      if (error.name === 'EVMAuthError') {
        // Re-throw EVMAuth errors as-is
        throw error;
      }

      if (error.code && error.message) {
        // If it's already an EVMAuth error, preserve it
        const evmAuthError = new Error(JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
            details: error.details || {
              reason: 'PROOF_MISSING',
              contractAddress: '0x9f2B42FB651b75CC3db4ef9FEd913A22BA4629Cf',
              chainId: 1223954
            }
          }
        }));
        evmAuthError.name = 'EVMAuthError';
        throw evmAuthError;
      }

      // For other errors, wrap in EVMAuth structure
      const evmAuthError = new Error(JSON.stringify({
        error: {
          code: 'EVMAUTH_PROOF_REQUIRED',
          message: 'Cryptographic proof of wallet ownership required',
          details: {
            reason: 'PROOF_MISSING',
            contractAddress: '0x9f2B42FB651b75CC3db4ef9FEd913A22BA4629Cf',
            chainId: 1223954
          }
        }
      }));
      evmAuthError.name = 'EVMAuthError';
      throw evmAuthError;
    }
  };
}

/**
 * Helper function to make Webacy API requests
 */
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

// ============================================================================
// FREE TIER TOOLS (No token required)
// ============================================================================

// Tool: Ping (Free)
server.addTool({
  name: "ping",
  description: "Check Webacy API server status",
  parameters: z.object({
    _evmauthProof: z.any().optional()
  }),
  execute: createProtectedExecutor(TOKEN_REQUIREMENTS.ping, async () => {
    return JSON.stringify({
      status: "OK",
      service: "Webacy Risk Analysis MCP Server",
      timestamp: new Date().toISOString(),
      message: "Server is running and ready to analyze blockchain security risks"
    });
  })
});

// ============================================================================
// BASIC TIER TOOLS (Token ID 1 - $0.002)
// ============================================================================

// Tool: Check Address Threat (Basic)
server.addTool({
  name: "checkAddressThreat",
  description: "Analyze threat considerations for an address - checks if address poses risk to others",
  parameters: z.object({
    address: z.string().describe("The blockchain address to analyze for threat risks"),
    chain: z.string().optional().describe("Chain to query (eth, arb, base, bsc, pol, opt, sol, sei, sui, ton). Defaults to eth"),
    show_low_risk: z.boolean().optional().describe("Return details on low risk issues found with the address"),
    _evmauthProof: z.any().optional()
  }),
  execute: createProtectedExecutor(TOKEN_REQUIREMENTS.checkAddressThreat, async (args) => {
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
  })
});

// Tool: Check Sanction Status (Basic)
server.addTool({
  name: "checkSanctionStatus",
  description: "Check if a wallet address is sanctioned or included in any sanctioned address databases",
  parameters: z.object({
    walletAddress: z.string().describe("The wallet address to check for sanctions"),
    _evmauthProof: z.any().optional()
  }),
  execute: createProtectedExecutor(TOKEN_REQUIREMENTS.checkSanctionStatus, async (args) => {
    const endpoint = `/addresses/sanctioned/${args.walletAddress}`;
    const data = await makeWebacyRequest(endpoint);
    
    return JSON.stringify(data);
  })
});

// ============================================================================
// PREMIUM TIER TOOLS (Token ID 3 - $0.004)
// ============================================================================

// Tool: Analyze Contract (Premium)
server.addTool({
  name: "analyzeContract",
  description: "Real-time smart contract risk analysis through fuzzing, static analysis, and dynamic analysis",
  parameters: z.object({
    contractAddress: z.string().describe("The smart contract address to analyze"),
    fromBytecode: z.boolean().optional().describe("Set to true for bytecode scanning of unverified contracts (slower but more thorough)"),
    refreshCache: z.boolean().optional().describe("Set to true to re-run analysis, false to retrieve cached results"),
    callback: z.string().optional().describe("Callback URL to retrieve delayed data from bytecode analysis"),
    _evmauthProof: z.any().optional()
  }),
  execute: createProtectedExecutor(TOKEN_REQUIREMENTS.analyzeContract, async (args) => {
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
  })
});

// Tool: Analyze Transaction (Premium)
server.addTool({
  name: "analyzeTransaction",
  description: "Get risk analysis for a specific transaction hash including counterparty risks and asset risks",
  parameters: z.object({
    txHash: z.string().describe("The transaction hash to analyze"),
    _evmauthProof: z.any().optional()
  }),
  execute: createProtectedExecutor(TOKEN_REQUIREMENTS.analyzeTransaction, async (args) => {
    const endpoint = `/transactions/${args.txHash}`;
    const data = await makeWebacyRequest(endpoint);
    
    return JSON.stringify(data);
  })
});

// ============================================================================
// PRO TIER TOOLS (Token ID 5 - $0.006)
// ============================================================================

// Tool: Analyze URL (Pro)
server.addTool({
  name: "analyzeUrl",
  description: "Predict maliciousness of a URL using ML models trained on web3 data - detect phishing and scam sites",
  parameters: z.object({
    url: z.string().describe("The URL to analyze for risks"),
    _evmauthProof: z.any().optional()
  }),
  execute: createProtectedExecutor(TOKEN_REQUIREMENTS.analyzeUrl, async (args) => {
    const endpoint = '/url';
    const data = await makeWebacyRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ url: args.url })
    });
    
    return JSON.stringify(data);
  })
});

// Log protection status
console.log('\n🔐 EVMAuth Protection Status:');
console.log('─────────────────────────────');
Object.entries(TOKEN_REQUIREMENTS).forEach(([method, tokenId]) => {
  const tier = getTierName(tokenId);
  const status = tokenId ? `Token ${tokenId} (${tier})` : 'Free';
  console.log(`${method}: ${status}`);
});
console.log('─────────────────────────────\n');

// Start server function
async function startServer() {
  const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
  const port = parseInt(process.env.PORT) || 3001;

  console.log('🚀 Starting Webacy Risk Analysis MCP server...');
  console.log(`📊 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`🔧 Port: ${port}`);

  if (isProduction) {
    // For Railway/production deployment
    try {
      await server.start({
      transportType: "httpStream",
      httpStream: {
        port: port,
        endpoint: "/mcp",
        // Bind to all interfaces for Railway
        host: "0.0.0.0"
      }
    });
    console.log(`✅ FastMCP server running on http://0.0.0.0:${port}`);
    console.log(`📍 MCP endpoint: http://0.0.0.0:${port}/mcp`);
    console.log(`🔐 EVMAuth protection: ${evmAuthSDK ? 'Enabled' : 'Disabled'}`);
    console.log(`🛡️  Webacy Risk Analysis: Ready`);
    console.log(`🌐 Ready to accept connections`);
    
    // Keep process alive
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
  } else {
    // For local development
    server.start({
      transportType: "stdio"
    });
  }
}

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});