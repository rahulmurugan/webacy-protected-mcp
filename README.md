# Webacy Protected MCP Server

A **Model Context Protocol (MCP)** server that provides **EVMAuth-protected** access to [Webacy's](https://webacy.com) blockchain security and risk analysis APIs. This server uses token-gated access control to provide different tiers of security analysis tools.

## 🛡️ Features

### Security Analysis Tools
- **Address Threat Analysis** - Check if addresses pose risks to others
- **Sanction Screening** - Verify addresses against sanctioned lists  
- **Smart Contract Analysis** - Real-time contract security auditing
- **Transaction Risk Assessment** - Analyze transaction safety
- **URL Threat Detection** - AI-powered phishing site detection

### Token-Gated Access Tiers

| Tier | Token ID | Features |
|------|----------|----------|
| **Free** | None | Basic server status check |
| **Basic** | 1 | Address threats, sanctions screening |
| **Premium** | 3 | Contract analysis, transaction risks |
| **Pro** | 5 | URL threat analysis |

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Webacy API key from [developers.webacy.co](https://developers.webacy.co/)
- EVMAuth tokens for protected endpoints (get from [EVMAuth platform](https://evmauth.com))

### Installation

```bash
# Clone the repository
git clone <your-repo-url> webacy-protected-mcp
cd webacy-protected-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Webacy API key and configuration
```

### Configuration

Edit `.env` file with your credentials:
```bash
# Required: Get from https://developers.webacy.co/
WEBACY_API_KEY=your_webacy_api_key_here

# EVMAuth Configuration (for token protection)
EVMAUTH_CONTRACT_ADDRESS=0x9f2B42FB651b75CC3db4ef9FEd913A22BA4629Cf
EVMAUTH_CHAIN_ID=1223954
EVMAUTH_RPC_URL=https://rpc.radiustech.io

# Development mode (optional)
EVMAUTH_DEV_MODE=false
```

### Running the Server

```bash
# Standard mode (stdio)
npm start

# Development mode with FastMCP CLI
npm run dev

# Inspect available tools
npm run inspect
```

## 🔧 Available Tools

### Free Tier
- `ping` - Check server status

### Basic Tier (Token ID 1)
- `checkAddressThreat` - Analyze if an address poses threats to others
  - Parameters: `address`, `chain` (optional), `show_low_risk` (optional)
- `checkSanctionStatus` - Check if an address is sanctioned
  - Parameters: `walletAddress`

### Premium Tier (Token ID 3)
- `analyzeContract` - Deep security analysis of smart contracts
  - Parameters: `contractAddress`, `fromBytecode` (optional), `refreshCache` (optional)
- `analyzeTransaction` - Analyze transaction risks
  - Parameters: `txHash`

### Pro Tier (Token ID 5)
- `analyzeUrl` - Detect phishing and scam websites
  - Parameters: `url`

## 🔐 EVMAuth Token Protection

This server uses [EVMAuth](https://evmauth.com) for token-gated access control:

### How It Works
1. Users hold ERC-1155 tokens on Radius Network
2. Token ID determines access tier (1=Basic, 3=Premium, 5=Pro)
3. Cryptographic proof of ownership required for protected endpoints
4. Zero-knowledge verification preserves privacy

### Getting Tokens
Visit [EVMAuth platform](https://evmauth.com) to acquire access tokens.

## 🧪 Development Mode

For testing without tokens:
```bash
# Set in .env
EVMAUTH_DEV_MODE=true
```

**⚠️ WARNING**: Development mode bypasses token verification. Use only for testing!

## 📊 Example Usage

### Using with Claude Desktop

Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "webacy-protected": {
      "command": "node",
      "args": ["/path/to/webacy-protected-mcp/server.js"],
      "env": {
        "WEBACY_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Example Requests

```javascript
// Check address threats (requires Token ID 1)
{
  "method": "checkAddressThreat",
  "params": {
    "address": "0x123...",
    "chain": "eth",
    "_evmauthProof": "your_proof_here"
  }
}

// Analyze smart contract (requires Token ID 3)
{
  "method": "analyzeContract",
  "params": {
    "contractAddress": "0x456...",
    "fromBytecode": true,
    "_evmauthProof": "your_proof_here"
  }
}
```

## 🔗 Related Links

- [Webacy API Documentation](https://webacy.readme.io/reference/webacy-api-overview)
- [EVMAuth Documentation](https://docs.evmauth.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [FastMCP Framework](https://github.com/jlowin/fastmcp)

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Support

- Webacy API: [info@webacy.com](mailto:info@webacy.com)
- EVMAuth: [EVMAuth Documentation](https://docs.evmauth.com)
- Issues: GitHub Issues