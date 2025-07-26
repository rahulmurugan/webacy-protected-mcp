"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMAuthError = void 0;
class EVMAuthError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'EVMAuthError';
    }
}
exports.EVMAuthError = EVMAuthError;
