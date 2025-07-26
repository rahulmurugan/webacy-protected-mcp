import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

/**
 * EVMAuth Configuration for Webacy Risk Analysis MCP Server
 * All values are configurable via environment variables
 */

// EVMAuth SDK Configuration
export const EVMAUTH_CONFIG = {
  // Blockchain Configuration
  contractAddress: process.env.EVMAUTH_CONTRACT_ADDRESS || '0x9f2B42FB651b75CC3db4ef9FEd913A22BA4629Cf',
  chainId: parseInt(process.env.EVMAUTH_CHAIN_ID) || 1223954, // Radius testnet
  rpcUrl: process.env.EVMAUTH_RPC_URL || 'https://rpc.radiustech.io',
  
  // JWT Configuration
  jwtSecret: process.env.EVMAUTH_JWT_SECRET || 'evmauth-alpha-7f8a9b2c3d4e5f6a',
  jwtIssuer: process.env.EVMAUTH_JWT_ISSUER || undefined,
  expectedAudience: process.env.EVMAUTH_EXPECTED_AUDIENCE || undefined,
  
  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.EVMAUTH_CACHE_TTL) || 300, // 5 minutes default
    maxSize: parseInt(process.env.EVMAUTH_CACHE_MAX_SIZE) || 1000,
    disabled: process.env.EVMAUTH_CACHE_DISABLED === 'true' || false
  },
  
  // Development Configuration
  devMode: process.env.EVMAUTH_DEV_MODE === 'true' || false,
  debug: process.env.EVMAUTH_DEBUG === 'true' || false
};

// Token Requirements Configuration
// Maps MCP method names to required token IDs (null = free access)
export const TOKEN_REQUIREMENTS = {
  // Free Tier - No token required
  ping: null,
  
  // Basic Tier - Token ID 1 ($0.002)
  checkAddressThreat: parseInt(process.env.EVMAUTH_BASIC_TOKEN_ID) || 1,
  checkSanctionStatus: parseInt(process.env.EVMAUTH_BASIC_TOKEN_ID) || 1,
  
  // Premium Tier - Token ID 3 ($0.004)
  analyzeContract: parseInt(process.env.EVMAUTH_PREMIUM_TOKEN_ID) || 3,
  analyzeTransaction: parseInt(process.env.EVMAUTH_PREMIUM_TOKEN_ID) || 3,
  
  // Pro Tier - Token ID 5 ($0.006)
  analyzeUrl: parseInt(process.env.EVMAUTH_PRO_TOKEN_ID) || 5
};

/**
 * Check if a method requires token protection
 * @param {string} methodName - The MCP method name
 * @returns {boolean} - True if protection is required
 */
export function isMethodProtected(methodName) {
  return TOKEN_REQUIREMENTS[methodName] !== null && TOKEN_REQUIREMENTS[methodName] !== undefined;
}

/**
 * Get the required token ID for a method
 * @param {string} methodName - The MCP method name
 * @returns {number|null} - The required token ID or null if free
 */
export function getRequiredTokenId(methodName) {
  return TOKEN_REQUIREMENTS[methodName] || null;
}

/**
 * Get the tier name for a token ID
 * @param {number} tokenId - The token ID
 * @returns {string} - The tier name
 */
export function getTierName(tokenId) {
  switch (tokenId) {
    case 1: return 'Basic';
    case 3: return 'Premium';
    case 5: return 'Pro';
    default: return 'Free';
  }
}

// Export all configurations
export default {
  EVMAUTH_CONFIG,
  TOKEN_REQUIREMENTS,
  isMethodProtected,
  getRequiredTokenId,
  getTierName
};