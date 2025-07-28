#!/usr/bin/env node

/**
 * Test script for deployed Railway endpoint
 */

import fetch from 'node-fetch';

const RAILWAY_URL = 'https://webacy-protected-mcp-production.up.railway.app';

async function testEndpoint(path, description) {
  console.log(`\n🧪 Testing ${description}...`);
  console.log(`📍 URL: ${RAILWAY_URL}${path}`);
  
  try {
    const response = await fetch(`${RAILWAY_URL}${path}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Railway-Test-Client'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const text = await response.text();
      console.log(`✅ Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`💥 Network Error: ${error.message}`);
  }
}

async function testDeployment() {
  console.log('🚀 Testing Railway Deployment');
  console.log('═══════════════════════════════');
  
  await testEndpoint('/', 'Root endpoint');
  await testEndpoint('/mcp', 'MCP endpoint');
  await testEndpoint('/health', 'Health endpoint');
  
  console.log('\n📋 Summary:');
  console.log('- If all endpoints return 502: App is not starting');
  console.log('- If some work: Check specific endpoint configuration');
  console.log('- Check Railway logs for startup errors');
}

testDeployment().catch(console.error); 