export class EVMAuthError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'EVMAuthError';
    }
}
