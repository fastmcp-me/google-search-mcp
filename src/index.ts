#!/usr/bin/env node

// Check for setup argument
if (process.argv.includes('setup')) {
  // Run setup script
  const { spawn } = require('child_process');
  const path = require('path');
  
  const setupScript = path.join(__dirname, '..', 'setup.js');
  const setupProcess = spawn('node', [setupScript], { 
    stdio: 'inherit',
    shell: true 
  });
  
  setupProcess.on('exit', (code: number) => {
    process.exit(code || 0);
  });
} else {
  // Run MCP server
  const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
  const { server } = require('./server.js');

  const transport = new StdioServerTransport();
  server.connect(transport);

  console.error('[INFO] Google Search MCP Server with API Key Rotation started');
  console.error('[INFO] Tips:');
  console.error('[INFO]   - Each API key gives you 100 free searches per day');
  console.error('[INFO]   - Server automatically rotates between available keys');
  console.error('[INFO]   - Quotas reset at midnight UTC');
}