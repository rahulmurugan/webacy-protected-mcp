import fetch from 'node-fetch';

const DEPLOYED_URL = process.argv[2];

if (!DEPLOYED_URL) {
  console.error('Please provide your deployed URL as argument');
  console.error('Usage: node diagnose-mcp.js https://your-app.up.railway.app');
  process.exit(1);
}

async function diagnoseMCP() {
  console.log('🔍 Diagnosing MCP Server:', DEPLOYED_URL);
  console.log('');

  // Test 1: Basic connectivity
  console.log('1. Testing basic connectivity...');
  try {
    const response = await fetch(DEPLOYED_URL);
    console.log('✅ Server is reachable');
    console.log('   Status:', response.status);
    console.log('   Headers:', Object.fromEntries(response.headers));
  } catch (error) {
    console.log('❌ Cannot reach server:', error.message);
    return;
  }

  // Test 2: MCP endpoint
  console.log('\n2. Testing MCP endpoint...');
  try {
    const response = await fetch(`${DEPLOYED_URL}/mcp`);
    console.log('✅ MCP endpoint exists');
    console.log('   Status:', response.status);
    console.log('   Content-Type:', response.headers.get('content-type'));
    
    if (response.headers.get('content-type')?.includes('json')) {
      const data = await response.json();
      console.log('   Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ MCP endpoint error:', error.message);
  }

  // Test 3: Initialize request
  console.log('\n3. Testing MCP initialize...');
  try {
    const response = await fetch(`${DEPLOYED_URL}/mcp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'diagnose-mcp',
            version: '1.0.0'
          }
        }
      })
    });
    
    console.log('   Status:', response.status);
    console.log('   Headers:', Object.fromEntries(response.headers));
    
    const data = await response.text();
    console.log('   Response:', data);
    
    try {
      const json = JSON.parse(data);
      console.log('   Parsed:', JSON.stringify(json, null, 2));
    } catch {
      // Not JSON
    }
  } catch (error) {
    console.log('❌ Initialize error:', error.message);
  }

  // Test 4: Health check
  console.log('\n4. Testing health endpoint...');
  try {
    const response = await fetch(`${DEPLOYED_URL}/health`);
    console.log('   Status:', response.status);
    const data = await response.text();
    console.log('   Response:', data);
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }

  // Test 5: OPTIONS request (CORS)
  console.log('\n5. Testing CORS (OPTIONS)...');
  try {
    const response = await fetch(`${DEPLOYED_URL}/mcp`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://claude.ai',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    console.log('   Status:', response.status);
    console.log('   CORS Headers:');
    console.log('   - Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('   - Access-Control-Allow-Methods:', response.headers.get('access-control-allow-methods'));
    console.log('   - Access-Control-Allow-Headers:', response.headers.get('access-control-allow-headers'));
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
  }
}

diagnoseMCP();