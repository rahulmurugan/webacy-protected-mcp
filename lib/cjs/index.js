"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.isAddress = exports.EVMAuthSDK = void 0;
var evmauth_mcp_sdk_1 = require("./evmauth-mcp-sdk");
Object.defineProperty(exports, "EVMAuthSDK", { enumerable: true, get: function () { return evmauth_mcp_sdk_1.EVMAuthSDK; } });
__exportStar(require("./types"), exports);
// Re-export useful utilities and types from viem
var viem_1 = require("viem");
Object.defineProperty(exports, "isAddress", { enumerable: true, get: function () { return viem_1.isAddress; } });
// Export version
exports.VERSION = '1.0.0';
