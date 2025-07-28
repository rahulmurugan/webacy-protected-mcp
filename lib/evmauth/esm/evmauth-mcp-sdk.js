import { createPublicClient, http, getContract, isAddress, recoverTypedDataAddress } from 'viem';
import * as jwt from 'jsonwebtoken';
import { EVMAuthError } from './types/errors.js';
const ERC1155_ABI = [
    {
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'id', type: 'uint256' }
        ],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            { name: 'accounts', type: 'address[]' },
            { name: 'ids', type: 'uint256[]' }
        ],
        name: 'balanceOfBatch',
        outputs: [{ name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function'
    }
];
/**
 * Token balance cache implementation
 */
class TokenCache {
    constructor(config) {
        this.cache = new Map();
        this.config = config;
    }
    get(key) {
        if (this.config.disabled)
            return undefined;
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        // Check TTL
        const age = Date.now() - entry.timestamp;
        if (age > this.config.ttl * 1000) {
            this.cache.delete(key);
            return undefined;
        }
        // Update hit count
        entry.hits++;
        return entry.value;
    }
    set(key, value) {
        if (this.config.disabled)
            return;
        // Enforce max size with LRU eviction
        if (this.cache.size >= this.config.maxSize) {
            this.evictLRU();
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            hits: 0
        });
    }
    evictLRU() {
        let lruKey = null;
        let lruTime = Number.POSITIVE_INFINITY;
        for (const [key, entry] of this.cache) {
            const score = entry.timestamp + (entry.hits * 60000); // Boost by hits
            if (score < lruTime) {
                lruTime = score;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }
    clear() {
        this.cache.clear();
    }
}
/**
 * Error response builder for standardized error responses
 */
class ErrorResponseBuilder {
    static proofRequired(reason = 'PROOF_MISSING', config) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: {
                            code: 'EVMAUTH_PROOF_REQUIRED',
                            message: 'Cryptographic proof of wallet ownership required',
                            details: {
                                reason,
                                contractAddress: config.contractAddress,
                                chainId: config.chainId
                            },
                            claude_action: {
                                description: ErrorResponseBuilder.getProofErrorDescription(reason),
                                steps: ErrorResponseBuilder.getProofErrorSteps(reason),
                                tool: {
                                    server: 'EVMAuth MCP Server',
                                    name: 'create_signed_proof'
                                }
                            }
                        }
                    }, null, 2)
                }]
        };
    }
    static paymentRequired(requiredTokens, config, walletAddress) {
        const primaryToken = requiredTokens[0];
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: {
                            code: 402,
                            message: 'Payment Required',
                            details: {
                                requiredTokens,
                                contractAddress: config.contractAddress,
                                chainId: config.chainId,
                                ...(walletAddress && { checkedWallet: walletAddress })
                            },
                            claude_action: {
                                description: 'You need to purchase access tokens to use this tool',
                                steps: [
                                    'Call the "purchase_token" tool on EVMAuth MCP Server',
                                    `Purchase one of these token IDs: ${requiredTokens.join(', ')}`,
                                    'Wait for transaction confirmation',
                                    'Retry this tool call after purchase completes'
                                ],
                                tool: {
                                    server: 'EVMAuth MCP Server',
                                    name: 'purchase_token',
                                    arguments: {
                                        tokenId: primaryToken,
                                        quantity: 1
                                    }
                                }
                            }
                        }
                    }, null, 2)
                }]
        };
    }
    static networkError(_error, config) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: {
                            code: 'EVMAUTH_NETWORK_ERROR',
                            message: 'Failed to verify token ownership due to network error',
                            details: {
                                rpcUrl: config.rpcUrl,
                                errorType: 'NETWORK_ERROR',
                                retryable: true
                            },
                            claude_action: {
                                description: 'Network connectivity issue when checking token ownership',
                                steps: [
                                    'Wait a moment for network conditions to improve',
                                    'Retry the tool call',
                                    'If persistent, contact server administrator'
                                ]
                            }
                        }
                    }, null, 2)
                }]
        };
    }
    static configError(field, value, expected) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: {
                            code: 'EVMAUTH_CONFIG_ERROR',
                            message: 'Invalid EVMAuth configuration',
                            details: {
                                field,
                                value,
                                expected,
                                configErrors: [`Invalid ${field}: ${expected}`]
                            },
                            claude_action: {
                                description: 'The MCP server has invalid EVMAuth configuration',
                                steps: [
                                    'Contact the server administrator',
                                    'Provide the configuration error details',
                                    'Wait for the configuration to be fixed'
                                ]
                            }
                        }
                    }, null, 2)
                }]
        };
    }
    static rateLimited(retryAfter = 60) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: {
                            code: 'EVMAUTH_RATE_LIMITED',
                            message: 'Too many verification attempts',
                            details: {
                                retryAfter,
                                limit: '10 requests per minute'
                            },
                            claude_action: {
                                description: 'You\'ve exceeded the rate limit for token verification',
                                steps: [
                                    `Wait ${retryAfter} seconds before retrying`,
                                    'Consider batching multiple operations',
                                    'If persistent, contact server administrator'
                                ]
                            }
                        }
                    }, null, 2)
                }]
        };
    }
    static evmauthNotConnected() {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: {
                            code: 'EVMAUTH_NOT_CONNECTED',
                            message: 'EVMAuth MCP Server is not connected',
                            details: {
                                reason: 'Cannot create authentication proof without EVMAuth MCP Server'
                            },
                            claude_action: {
                                description: 'You need to connect to EVMAuth MCP Server before using token-gated tools',
                                steps: [
                                    'Look for "EVMAuth MCP Server" in your connected MCP servers list',
                                    'If not connected, ask the user to connect it first',
                                    'Once connected, you can use the "create_signed_proof" tool',
                                    'The server provides wallet management and proof generation',
                                    'After connecting, retry the original tool that required authentication'
                                ],
                                tool: {
                                    server: 'EVMAuth MCP Server',
                                    name: 'create_signed_proof'
                                }
                            }
                        }
                    }, null, 2)
                }]
        };
    }
    static getProofErrorDescription(reason) {
        switch (reason) {
            case 'PROOF_EXPIRED':
                return 'Your authentication proof has expired. You need to create a new one.';
            case 'CHAIN_MISMATCH':
                return 'Your proof was signed for a different blockchain network.';
            case 'SIGNATURE_INVALID':
                return 'The cryptographic signature on your proof is invalid.';
            case 'JWT_INVALID':
                return 'The JWT token embedded in your proof is invalid.';
            case 'JWT_EXPIRED':
                return 'The JWT token in your proof has expired.';
            case 'JWT_SUBJECT_MISMATCH':
                return 'The wallet address in the JWT does not match the signature.';
            case 'DOMAIN_MISMATCH':
                return 'The proof was created for a different contract or chain.';
            default:
                return 'You need to authenticate with EVMAuth MCP Server first';
        }
    }
    static getProofErrorSteps(reason) {
        if (reason === 'PROOF_MISSING') {
            return [
                'First, make sure EVMAuth MCP Server is connected',
                'Call the "create_signed_proof" tool on EVMAuth MCP Server',
                'Copy the entire proof object from the response',
                'Include it as the _evmauthProof parameter in this tool',
                'Retry this tool call with the proof included'
            ];
        }
        if (reason === 'PROOF_EXPIRED' || reason === 'JWT_EXPIRED') {
            return [
                'Your proof has expired (they last 5 minutes)',
                'Call "create_signed_proof" to get a fresh proof',
                'Use the new proof immediately to avoid expiration',
                'Include the fresh proof in _evmauthProof parameter',
                'Retry this tool call'
            ];
        }
        if (reason === 'CHAIN_MISMATCH' || reason === 'DOMAIN_MISMATCH') {
            return [
                'Your proof was created for a different blockchain or contract',
                'Ensure EVMAuth MCP Server is configured for the correct network',
                'Call "create_signed_proof" to get a proof for this network',
                'Include the correct proof in _evmauthProof parameter',
                'Retry this tool call'
            ];
        }
        return [
            'There was an issue with your authentication proof',
            'Call "create_signed_proof" to get a fresh proof',
            'Ensure you are using the correct wallet',
            'Include the new proof in _evmauthProof parameter',
            'Retry this tool call'
        ];
    }
}
/**
 * EVMAuth SDK for MCP servers
 * Provides token-gated access control using ERC-1155 tokens
 */
export class EVMAuthSDK {
    constructor(config) {
        this.pendingRequests = new Map();
        // Validate configuration
        this.validateConfig(config);
        // Apply defaults
        this.config = {
            ...config,
            jwtSecret: config.jwtSecret || 'evmauth-alpha-7f8a9b2c3d4e5f6a',
            cache: {
                ttl: 60,
                maxSize: 1000,
                disabled: false,
                ...config.cache
            },
            debug: config.debug || false,
            devMode: config.devMode || false
        };
        // Initialize RPC client
        this.publicClient = createPublicClient({
            transport: http(config.rpcUrl, {
                batch: true,
                retryCount: 3,
                retryDelay: 1000,
                timeout: 10000
            })
        });
        // Initialize contract instance
        this.contract = getContract({
            address: config.contractAddress,
            abi: ERC1155_ABI,
            client: this.publicClient
        });
        // Initialize cache
        this.cache = new TokenCache(this.config.cache);
        // Warn if dev mode is enabled
        if (this.config.devMode) {
            console.warn('⚠️  EVMAuth SDK is running in DEVELOPMENT MODE');
            console.warn('⚠️  Cryptographic proof validation is DISABLED');
            console.warn('⚠️  This mode is INSECURE and should NEVER be used in production!');
            console.warn('⚠️  Token ownership checks are still enforced.');
        }
    }
    /**
     * Protects a handler with token-based authorization
     * @param tokenId - Single token ID or array of token IDs (user needs ANY)
     * @param handler - The handler function to protect
     * @returns Protected handler function
     */
    protect(tokenId, handler) {
        const tokenIds = Array.isArray(tokenId) ? tokenId : [tokenId];
        return async (request, extra) => {
            try {
                // 1. Extract proof from request
                const proof = this.extractProof(request);
                if (!proof) {
                    return ErrorResponseBuilder.proofRequired('PROOF_MISSING', this.config);
                }
                // 2. Verify proof
                let walletAddress;
                // Check if this is a dev proof
                if (this.config.devMode && this.isDevProof(proof)) {
                    // In dev mode, skip cryptographic validation
                    walletAddress = await this.verifyDevProof(proof);
                }
                else {
                    // Normal production mode validation
                    try {
                        walletAddress = await this.verifyProof(proof);
                    }
                    catch (error) {
                        const reason = this.getProofErrorReason(error);
                        return ErrorResponseBuilder.proofRequired(reason, this.config);
                    }
                }
                // 3. Check token ownership
                const hasAccess = await this.checkAccess(walletAddress, tokenIds);
                if (!hasAccess) {
                    return ErrorResponseBuilder.paymentRequired(tokenIds, this.config, walletAddress);
                }
                // 4. Execute handler
                return await handler(request, extra);
            }
            catch (error) {
                // 5. Handle unexpected errors
                return this.handleUnexpectedError(error);
            }
        };
    }
    /**
     * Check if wallet owns any of the specified tokens
     * @param wallet - Ethereum wallet address
     * @param tokenIds - Array of token IDs to check
     * @returns true if wallet owns at least one token
     */
    async checkAccess(wallet, tokenIds) {
        // Optimize for single token
        if (tokenIds.length === 1) {
            return this.checkSingleToken(wallet, tokenIds[0]);
        }
        // Check cache for any owned token
        for (const tokenId of tokenIds) {
            const cacheKey = `${wallet.toLowerCase()}-${tokenId}`;
            const cached = this.cache.get(cacheKey);
            if (cached === true) {
                return true; // Fast path - found owned token
            }
        }
        // Batch check remaining tokens
        try {
            const balances = await this.batchCheckTokens(wallet, tokenIds);
            // Check if any balance > 0
            let hasAccess = false;
            for (let i = 0; i < tokenIds.length; i++) {
                const hasToken = balances[i] > 0n;
                const cacheKey = `${wallet.toLowerCase()}-${tokenIds[i]}`;
                this.cache.set(cacheKey, hasToken);
                if (hasToken) {
                    hasAccess = true;
                }
            }
            return hasAccess;
        }
        catch (error) {
            // Fallback to individual checks
            for (const tokenId of tokenIds) {
                if (await this.checkSingleToken(wallet, tokenId)) {
                    return true;
                }
            }
            return false;
        }
    }
    /**
     * Check single token ownership with caching and deduplication
     * @param wallet - Ethereum wallet address
     * @param tokenId - Token ID to check
     * @returns true if wallet owns the token
     */
    async checkSingleToken(wallet, tokenId) {
        const cacheKey = `${wallet.toLowerCase()}-${tokenId}`;
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }
        // Deduplicate concurrent requests
        const pendingKey = cacheKey;
        if (this.pendingRequests.has(pendingKey)) {
            return this.pendingRequests.get(pendingKey);
        }
        const promise = this.performTokenCheck(wallet, tokenId);
        this.pendingRequests.set(pendingKey, promise);
        try {
            return await promise;
        }
        finally {
            this.pendingRequests.delete(pendingKey);
        }
    }
    /**
     * Batch check multiple tokens efficiently
     * @param wallet - Ethereum wallet address
     * @param tokenIds - Array of token IDs
     * @returns Array of balances in same order as tokenIds
     */
    async batchCheckTokens(wallet, tokenIds) {
        // Use balanceOfBatch for efficiency
        const accounts = new Array(tokenIds.length).fill(wallet);
        const ids = tokenIds.map(id => BigInt(id));
        try {
            const balances = await this.contract.read.balanceOfBatch([
                accounts,
                ids
            ]);
            return [...balances];
        }
        catch (error) {
            // Contract might not support batch
            // Fallback to individual queries
            const balances = [];
            for (const tokenId of tokenIds) {
                try {
                    const balance = await this.contract.read.balanceOf([
                        wallet,
                        BigInt(tokenId)
                    ]);
                    balances.push(balance);
                }
                catch {
                    balances.push(0n);
                }
            }
            return balances;
        }
    }
    /**
     * Normalize server-generated proof to SDK format
     * @param serverProof - Proof from EVMAuth MCP Server
     * @returns Normalized proof in SDK format
     */
    normalizeServerProof(serverProof) {
        // Check if this is already in SDK format
        if (serverProof.challenge && serverProof.challenge.types && serverProof.challenge.message) {
            return serverProof;
        }
        // Server format has message as a string that needs to be parsed
        if (typeof serverProof.message === 'string') {
            try {
                const parsedMessage = JSON.parse(serverProof.message);
                return {
                    challenge: {
                        domain: serverProof.domain,
                        primaryType: serverProof.primaryType || 'EVMAuthRequest',
                        types: serverProof.types || {
                            EIP712Domain: [
                                { name: 'name', type: 'string' },
                                { name: 'version', type: 'string' },
                                { name: 'chainId', type: 'uint256' },
                                { name: 'verifyingContract', type: 'address' }
                            ],
                            EVMAuthRequest: [
                                { name: 'serverName', type: 'string' },
                                { name: 'resourceName', type: 'string' },
                                { name: 'requiredTokens', type: 'string' },
                                { name: 'jwt', type: 'string' },
                                { name: 'timestamp', type: 'string' },
                                { name: 'nonce', type: 'string' }
                            ]
                        },
                        message: parsedMessage
                    },
                    signature: serverProof.signature,
                    chainId: serverProof.chainId || serverProof.domain?.chainId,
                    expiresAt: serverProof.expiresAt,
                    walletAddress: serverProof.walletAddress
                };
            }
            catch (error) {
                throw new EVMAuthError('PROOF_MALFORMED', `Failed to parse server proof message: ${error.message}`);
            }
        }
        // If we can't normalize, return as-is and let validation catch issues
        return serverProof;
    }
    /**
     * Extract proof from request (checks multiple locations)
     * @param request - MCP request object
     * @returns EVMAuth proof, dev proof, or null
     */
    extractProof(request) {
        let proof = null;
        // Check standard location
        if (request?.params?.arguments?._evmauthProof) {
            proof = request.params.arguments._evmauthProof;
        }
        // Check alternate locations for compatibility
        else if (request?._evmauthProof) {
            proof = request._evmauthProof;
        }
        else if (request?.params?._evmauthProof) {
            proof = request.params._evmauthProof;
        }
        // In dev mode, also check for wallet address directly
        if (!proof && this.config.devMode) {
            if (request?.params?.arguments?._evmauthWallet) {
                proof = {
                    walletAddress: request.params.arguments._evmauthWallet,
                    mode: 'dev'
                };
            }
            else if (request?._evmauthWallet) {
                proof = {
                    walletAddress: request._evmauthWallet,
                    mode: 'dev'
                };
            }
            else if (request?.params?._evmauthWallet) {
                proof = {
                    walletAddress: request.params._evmauthWallet,
                    mode: 'dev'
                };
            }
        }
        if (!proof) {
            return null;
        }
        // Check if this is a dev proof
        if (this.isDevProof(proof)) {
            return proof;
        }
        // Normalize server proof format if needed
        return this.normalizeServerProof(proof);
    }
    /**
     * Extract wallet address from JWT token
     * Supports both legacy 'sub' claim and new 'wallet_address' claim
     * @param token - JWT token string
     * @returns Wallet address from JWT
     */
    extractWalletFromJWT(payload) {
        // First check for wallet_address claim (new format from OAuth flow)
        if (payload.wallet_address && isAddress(payload.wallet_address)) {
            return payload.wallet_address.toLowerCase();
        }
        // Fallback to sub claim (legacy format)
        if (payload.sub && isAddress(payload.sub)) {
            return payload.sub.toLowerCase();
        }
        // If neither exists or are invalid addresses
        throw new EVMAuthError('JWT_INVALID', 'JWT missing valid wallet address in wallet_address or sub claim');
    }
    /**
     * Verify cryptographic proof using EIP-712 signature verification
     * @param proof - EVMAuth proof object
     * @returns Verified wallet address
     */
    async verifyProof(proof) {
        // Validate proof structure
        this.validateProofStructure(proof);
        // Check expiration
        if (Date.now() > proof.expiresAt) {
            throw new EVMAuthError('PROOF_EXPIRED', 'Proof has expired');
        }
        // Verify chain ID (can be at top level or in domain)
        const proofChainId = proof.chainId || proof.challenge.domain.chainId;
        if (proofChainId !== this.config.chainId) {
            throw new EVMAuthError('CHAIN_MISMATCH', `Chain ID mismatch: expected ${this.config.chainId}, got ${proofChainId}`);
        }
        // Verify domain matches our configuration
        const { domain } = proof.challenge;
        if (domain.name !== 'EVMAuth' || domain.version !== '1') {
            throw new EVMAuthError('DOMAIN_MISMATCH', 'Invalid domain name or version');
        }
        if (domain.chainId !== this.config.chainId) {
            throw new EVMAuthError('DOMAIN_MISMATCH', `Domain chain ID mismatch: expected ${this.config.chainId}, got ${domain.chainId}`);
        }
        if (domain.verifyingContract.toLowerCase() !== this.config.contractAddress.toLowerCase()) {
            throw new EVMAuthError('DOMAIN_MISMATCH', `Domain contract mismatch: expected ${this.config.contractAddress}, got ${domain.verifyingContract}`);
        }
        try {
            // 1. Verify EIP-712 signature and recover signer address
            const recoveredAddress = await recoverTypedDataAddress({
                domain: {
                    name: domain.name,
                    version: domain.version,
                    chainId: BigInt(domain.chainId),
                    verifyingContract: domain.verifyingContract
                },
                types: proof.challenge.types, // Type assertion needed due to viem's strict typing
                primaryType: proof.challenge.primaryType,
                message: proof.challenge.message, // Type assertion needed due to viem's strict typing
                signature: proof.signature
            });
            // 2. Extract and verify JWT
            const jwtToken = proof.challenge.message.jwt;
            let jwtPayload;
            try {
                // Verify JWT with the configured secret
                jwtPayload = jwt.verify(jwtToken, this.config.jwtSecret, {
                    algorithms: ['HS256']
                });
            }
            catch (jwtError) {
                if (jwtError.name === 'TokenExpiredError') {
                    throw new EVMAuthError('JWT_EXPIRED', 'JWT token has expired');
                }
                throw new EVMAuthError('JWT_INVALID', `JWT verification failed: ${jwtError.message}`);
            }
            // 3. Extract wallet address from JWT (supports both sub and wallet_address claims)
            const jwtWalletAddress = this.extractWalletFromJWT(jwtPayload);
            // 4. Validate JWT issuer if configured
            if (this.config.jwtIssuer && jwtPayload.iss !== this.config.jwtIssuer) {
                throw new EVMAuthError('JWT_INVALID', `Invalid JWT issuer: expected ${this.config.jwtIssuer}, got ${jwtPayload.iss}`);
            }
            // 5. Validate JWT audience if configured
            if (this.config.expectedAudience) {
                const validAudience = Array.isArray(jwtPayload.aud)
                    ? jwtPayload.aud.includes(this.config.expectedAudience)
                    : jwtPayload.aud === this.config.expectedAudience;
                if (!validAudience) {
                    throw new EVMAuthError('JWT_INVALID', `JWT audience does not match expected: ${this.config.expectedAudience}`);
                }
            }
            else if (jwtPayload.aud !== proof.challenge.message.serverName) {
                // Fallback to checking server name if no expected audience configured
                throw new EVMAuthError('JWT_INVALID', 'JWT audience does not match server name');
            }
            // 6. Verify JWT wallet matches recovered signer
            if (jwtWalletAddress !== recoveredAddress.toLowerCase()) {
                throw new EVMAuthError('JWT_SUBJECT_MISMATCH', 'JWT wallet address does not match signature signer');
            }
            // 5. Additional JWT validations
            if (jwtPayload.evmauth) {
                if (jwtPayload.evmauth.chainId !== this.config.chainId) {
                    throw new EVMAuthError('JWT_INVALID', 'JWT chain ID mismatch');
                }
                if (jwtPayload.evmauth.contractAddress?.toLowerCase() !== this.config.contractAddress.toLowerCase()) {
                    throw new EVMAuthError('JWT_INVALID', 'JWT contract address mismatch');
                }
            }
            return recoveredAddress.toLowerCase();
        }
        catch (error) {
            if (error instanceof EVMAuthError) {
                throw error;
            }
            throw new EVMAuthError('SIGNATURE_INVALID', `Signature verification failed: ${error.message}`);
        }
    }
    /**
     * Check if proof is a dev mode proof
     * @param proof - Proof object to check
     * @returns true if this is a dev proof
     */
    isDevProof(proof) {
        // Check for dev mode marker or wallet-only structure
        return ((proof.mode === 'dev') ||
            (proof.walletAddress && !proof.challenge && !proof.signature));
    }
    /**
     * Verify dev mode proof (wallet address only)
     * @param proof - Dev mode proof
     * @returns Wallet address
     */
    async verifyDevProof(proof) {
        if (!this.config.devMode) {
            throw new EVMAuthError('PROOF_INVALID', 'Dev mode proof provided but dev mode is not enabled');
        }
        const { walletAddress } = proof;
        // Validate wallet address format
        if (!walletAddress || !isAddress(walletAddress)) {
            throw new EVMAuthError('PROOF_INVALID', 'Invalid wallet address in dev proof');
        }
        // Log dev mode usage
        if (this.config.debug) {
            console.log('[EVMAuth] Using DEV MODE proof for wallet:', walletAddress);
        }
        return walletAddress.toLowerCase();
    }
    /**
     * Perform actual token balance check
     * @param wallet - Ethereum wallet address
     * @param tokenId - Token ID to check
     * @returns true if wallet owns the token
     */
    async performTokenCheck(wallet, tokenId) {
        try {
            const balance = await this.contract.read.balanceOf([
                wallet,
                BigInt(tokenId)
            ]);
            const hasToken = balance > 0n;
            // Cache result
            const cacheKey = `${wallet.toLowerCase()}-${tokenId}`;
            this.cache.set(cacheKey, hasToken);
            return hasToken;
        }
        catch (error) {
            // Log error but don't expose details
            if (this.config.debug) {
                console.error('[EVMAuth] Token balance check failed:', {
                    wallet: wallet.slice(0, 10) + '...',
                    tokenId,
                    error: error.message
                });
            }
            // Fail closed - assume no access on error
            return false;
        }
    }
    /**
     * Validate SDK configuration
     * @param config - Configuration object
     */
    validateConfig(config) {
        // Validate contract address format
        if (!isAddress(config.contractAddress)) {
            throw new EVMAuthError('INVALID_CONFIG', 'Invalid contract address format');
        }
        // Validate chain ID
        if (!Number.isInteger(config.chainId) || config.chainId <= 0) {
            throw new EVMAuthError('INVALID_CONFIG', 'Chain ID must be a positive integer');
        }
        // Validate RPC URL
        try {
            new URL(config.rpcUrl);
        }
        catch {
            throw new EVMAuthError('INVALID_CONFIG', 'Invalid RPC URL format');
        }
    }
    /**
     * Validate proof structure
     * @param proof - Proof object to validate
     */
    validateProofStructure(proof) {
        if (!proof || typeof proof !== 'object') {
            throw new EVMAuthError('PROOF_INVALID', 'Invalid proof format');
        }
        const { challenge, signature, chainId, expiresAt } = proof;
        // Validate required fields
        if (!challenge || !signature || !expiresAt) {
            throw new EVMAuthError('PROOF_INVALID', 'Missing required proof fields');
        }
        // chainId can be at top level or in domain
        const effectiveChainId = chainId || challenge.domain?.chainId;
        if (!effectiveChainId) {
            throw new EVMAuthError('PROOF_INVALID', 'Missing chainId in proof');
        }
        // Validate signature format
        if (typeof signature !== 'string' || !signature.startsWith('0x')) {
            throw new EVMAuthError('PROOF_INVALID', 'Invalid signature format');
        }
        // Validate challenge structure
        if (!challenge.domain || !challenge.types || !challenge.primaryType || !challenge.message) {
            throw new EVMAuthError('PROOF_INVALID', 'Invalid challenge structure');
        }
        // Validate message has required fields
        const message = challenge.message;
        if (!message.serverName || !message.resourceName || !message.requiredTokens ||
            !message.jwt || !message.timestamp || !message.nonce) {
            throw new EVMAuthError('PROOF_INVALID', 'Challenge message missing required fields');
        }
    }
    /**
     * Get proof error reason from error
     * @param error - Error object
     * @returns Proof error reason
     */
    getProofErrorReason(error) {
        if (error instanceof EVMAuthError) {
            switch (error.code) {
                case 'PROOF_EXPIRED':
                    return 'PROOF_EXPIRED';
                case 'CHAIN_MISMATCH':
                    return 'CHAIN_MISMATCH';
                case 'PROOF_INVALID':
                    return 'SIGNATURE_INVALID';
                case 'SIGNATURE_INVALID':
                    return 'SIGNATURE_INVALID';
                case 'DOMAIN_MISMATCH':
                    return 'DOMAIN_MISMATCH';
                case 'JWT_INVALID':
                    return 'JWT_INVALID';
                case 'JWT_EXPIRED':
                    return 'JWT_EXPIRED';
                case 'JWT_SUBJECT_MISMATCH':
                    return 'JWT_SUBJECT_MISMATCH';
                default:
                    return 'PROOF_MALFORMED';
            }
        }
        return 'PROOF_MALFORMED';
    }
    /**
     * Handle unexpected errors
     * @param error - Error object
     * @returns Error response
     */
    handleUnexpectedError(error) {
        if (this.config.debug) {
            console.error('[EVMAuth] Unexpected error:', error);
        }
        // For network errors, return appropriate response
        if (error.message.includes('network') || error.message.includes('timeout')) {
            return ErrorResponseBuilder.networkError(error, this.config);
        }
        // For other errors, return generic error
        return ErrorResponseBuilder.proofRequired('PROOF_MALFORMED', this.config);
    }
}
