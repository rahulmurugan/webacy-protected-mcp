import { type Address } from 'viem';
import type { EVMAuthConfig, MCPHandler } from './types';
/**
 * EVMAuth SDK for MCP servers
 * Provides token-gated access control using ERC-1155 tokens
 */
export declare class EVMAuthSDK {
    private config;
    private publicClient;
    private contract;
    private cache;
    private pendingRequests;
    constructor(config: EVMAuthConfig);
    /**
     * Protects a handler with token-based authorization
     * @param tokenId - Single token ID or array of token IDs (user needs ANY)
     * @param handler - The handler function to protect
     * @returns Protected handler function
     */
    protect(tokenId: number | number[], handler: MCPHandler): MCPHandler;
    /**
     * Check if wallet owns any of the specified tokens
     * @param wallet - Ethereum wallet address
     * @param tokenIds - Array of token IDs to check
     * @returns true if wallet owns at least one token
     */
    checkAccess(wallet: Address, tokenIds: number[]): Promise<boolean>;
    /**
     * Check single token ownership with caching and deduplication
     * @param wallet - Ethereum wallet address
     * @param tokenId - Token ID to check
     * @returns true if wallet owns the token
     */
    checkSingleToken(wallet: Address, tokenId: number): Promise<boolean>;
    /**
     * Batch check multiple tokens efficiently
     * @param wallet - Ethereum wallet address
     * @param tokenIds - Array of token IDs
     * @returns Array of balances in same order as tokenIds
     */
    batchCheckTokens(wallet: Address, tokenIds: number[]): Promise<bigint[]>;
    /**
     * Normalize server-generated proof to SDK format
     * @param serverProof - Proof from EVMAuth MCP Server
     * @returns Normalized proof in SDK format
     */
    private normalizeServerProof;
    /**
     * Extract proof from request (checks multiple locations)
     * @param request - MCP request object
     * @returns EVMAuth proof, dev proof, or null
     */
    private extractProof;
    /**
     * Extract wallet address from JWT token
     * Supports both legacy 'sub' claim and new 'wallet_address' claim
     * @param token - JWT token string
     * @returns Wallet address from JWT
     */
    private extractWalletFromJWT;
    /**
     * Verify cryptographic proof using EIP-712 signature verification
     * @param proof - EVMAuth proof object
     * @returns Verified wallet address
     */
    private verifyProof;
    /**
     * Check if proof is a dev mode proof
     * @param proof - Proof object to check
     * @returns true if this is a dev proof
     */
    private isDevProof;
    /**
     * Verify dev mode proof (wallet address only)
     * @param proof - Dev mode proof
     * @returns Wallet address
     */
    private verifyDevProof;
    /**
     * Perform actual token balance check
     * @param wallet - Ethereum wallet address
     * @param tokenId - Token ID to check
     * @returns true if wallet owns the token
     */
    private performTokenCheck;
    /**
     * Validate SDK configuration
     * @param config - Configuration object
     */
    private validateConfig;
    /**
     * Validate proof structure
     * @param proof - Proof object to validate
     */
    private validateProofStructure;
    /**
     * Get proof error reason from error
     * @param error - Error object
     * @returns Proof error reason
     */
    private getProofErrorReason;
    /**
     * Handle unexpected errors
     * @param error - Error object
     * @returns Error response
     */
    private handleUnexpectedError;
}
export type { EVMAuthConfig, CacheConfig, MCPHandler, MCPRequest, MCPResponse, EVMAuthProof, EVMAuthErrorResponse, EVMAuthErrorObject, ProofErrorReason } from './types';
//# sourceMappingURL=evmauth-mcp-sdk.d.ts.map