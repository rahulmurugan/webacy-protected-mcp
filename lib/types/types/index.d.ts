export * from './errors';
export interface EVMAuthConfig {
    /**
     * ERC-1155 contract address for token ownership verification
     * @example "0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96"
     */
    contractAddress: `0x${string}`;
    /**
     * Chain ID of the blockchain network
     * @example 1223954 // Radius Testnet
     */
    chainId: number;
    /**
     * RPC endpoint URL for on-chain queries
     * @example "https://rpc.radiustech.io"
     */
    rpcUrl: string;
    /**
     * JWT secret for proof verification
     * @default "evmauth-alpha-7f8a9b2c3d4e5f6a"
     */
    jwtSecret?: string;
    /**
     * Cache configuration for token balance queries
     * @default { ttl: 60, maxSize: 1000 }
     */
    cache?: CacheConfig;
    /**
     * Enable debug logging
     * @default false
     */
    debug?: boolean;
    /**
     * Expected JWT issuer (optional)
     * If provided, JWT validation will check that iss claim matches
     * @example "evmauth-oauth-server"
     */
    jwtIssuer?: string;
    /**
     * Expected JWT audience (optional)
     * If provided, JWT validation will check that aud claim contains this value
     * @example "my-mcp-server"
     */
    expectedAudience?: string;
    /**
     * Development mode - INSECURE, FOR LOCAL TESTING ONLY
     * When enabled, allows bypassing cryptographic proof validation
     * and accepts a simple wallet address instead of a signed proof.
     * Token ownership checks are still performed.
     * @default false
     * @warning NEVER enable this in production!
     */
    devMode?: boolean;
}
export interface CacheConfig {
    /**
     * Time-to-live in seconds for cached balances
     * @default 60
     */
    ttl: number;
    /**
     * Maximum number of cached entries
     * @default 1000
     */
    maxSize: number;
    /**
     * Disable caching entirely
     * @default false
     */
    disabled?: boolean;
}
/**
 * Generic MCP handler function signature
 * Compatible with FastMCP, raw MCP protocol, and other implementations
 */
export type MCPHandler = (request: MCPRequest, extra?: unknown) => Promise<MCPResponse>;
/**
 * MCP request structure with EVMAuth proof support
 */
export interface MCPRequest {
    method?: string;
    params?: {
        arguments?: Record<string, any> & {
            _evmauthProof?: EVMAuthProof;
        };
        [key: string]: any;
    };
    [key: string]: any;
}
/**
 * MCP response structure
 */
export interface MCPResponse {
    content?: Array<{
        type: string;
        text?: string;
        [key: string]: any;
    }>;
    [key: string]: any;
}
/**
 * EVMAuth cryptographic proof structure
 */
export interface EVMAuthProof {
    /**
     * EIP-712 typed data challenge containing embedded JWT
     */
    challenge: EVMAuthChallenge;
    /**
     * Ethereum signature of the challenge (hex string)
     * Format: 0x{r}{s}{v} (65 bytes)
     */
    signature: `0x${string}`;
    /**
     * Chain ID where the proof was generated
     * Must match the SDK's configured chainId
     */
    chainId: number;
    /**
     * Unix timestamp (ms) when proof expires
     * Typically current time + 5 minutes
     */
    expiresAt: number;
    /**
     * Optional: Wallet address (recovered from signature during verification)
     * Not required in request, but added during verification
     */
    walletAddress?: `0x${string}`;
}
/**
 * EIP-712 challenge structure
 */
export interface EVMAuthChallenge {
    /**
     * EIP-712 domain separator
     */
    domain: EIP712Domain;
    /**
     * Primary type being signed
     */
    primaryType: 'EVMAuthRequest';
    /**
     * Type definitions for structured data
     */
    types: {
        EIP712Domain: EIP712DomainType[];
        EVMAuthRequest: EVMAuthRequestType[];
    };
    /**
     * The actual message being signed
     */
    message: EVMAuthMessage;
}
export interface EIP712Domain {
    name: 'EVMAuth';
    version: '1';
    chainId: number;
    verifyingContract: `0x${string}`;
}
export interface EVMAuthMessage {
    /**
     * MCP server identifier
     */
    serverName: string;
    /**
     * Tool/resource/prompt being accessed
     */
    resourceName: string;
    /**
     * Required token ID(s)
     */
    requiredTokens: string;
    /**
     * Embedded JWT token
     */
    jwt: string;
    /**
     * Request timestamp (Unix ms)
     */
    timestamp: string;
    /**
     * Random nonce for replay protection
     */
    nonce: string;
    /**
     * Optional purpose field for the proof
     */
    purpose?: string;
}
export type EIP712DomainType = Array<{
    name: string;
    type: string;
}>;
export type EVMAuthRequestType = Array<{
    name: string;
    type: string;
}>;
export interface EVMAuthErrorResponse {
    content: Array<{
        type: 'text';
        text: string;
    }>;
}
export interface EVMAuthErrorObject {
    error: {
        code: string | number;
        message: string;
        details?: Record<string, any>;
        claude_action?: ClaudeAction;
    };
}
export interface ClaudeAction {
    description: string;
    steps: string[];
    tool?: {
        server: string;
        name: string;
        arguments?: Record<string, any>;
    };
}
export type ProofErrorReason = 'PROOF_MISSING' | 'PROOF_EXPIRED' | 'PROOF_MALFORMED' | 'SIGNATURE_INVALID' | 'CHAIN_MISMATCH' | 'JWT_INVALID' | 'JWT_EXPIRED' | 'JWT_SUBJECT_MISMATCH' | 'DOMAIN_MISMATCH';
/**
 * Simplified proof structure for development mode
 * @warning FOR DEVELOPMENT ONLY - NOT SECURE
 */
export interface EVMAuthDevProof {
    /**
     * Wallet address to check token ownership for
     * @example "0x742d35Cc6634C0532925a3b844Bc9e7Ed1A0aC0E"
     */
    walletAddress: `0x${string}`;
    /**
     * Optional marker to indicate this is a dev mode proof
     * @default "dev"
     */
    mode?: 'dev';
}
//# sourceMappingURL=index.d.ts.map