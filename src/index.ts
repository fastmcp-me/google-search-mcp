#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for setup argument
if (process.argv.includes('setup')) {
  // Run setup script
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
  const transport = new StdioServerTransport();
  server.connect(transport);

  console.error('[INFO] Google Search MCP Server with API Key Rotation started');
  console.error('[INFO] Tips:');
  console.error('[INFO]   - Each API key gives you 100 free searches per day');
  console.error('[INFO]   - Server automatically rotates between available keys');
  console.error('[INFO]   - Quotas reset at midnight UTC');
}