export declare class EVMAuthError extends Error {
    code: EVMAuthErrorCode;
    details?: unknown | undefined;
    constructor(code: EVMAuthErrorCode, message: string, details?: unknown | undefined);
}
export type EVMAuthErrorCode = 'INVALID_CONFIG' | 'RPC_ERROR' | 'PROOF_INVALID' | 'PROOF_EXPIRED' | 'PROOF_MALFORMED' | 'CHAIN_MISMATCH' | 'CONTRACT_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'DOMAIN_MISMATCH' | 'JWT_INVALID' | 'JWT_EXPIRED' | 'JWT_SUBJECT_MISMATCH' | 'SIGNATURE_INVALID';
//# sourceMappingURL=errors.d.ts.map