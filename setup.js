#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function getClaudeConfigPath() {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(homeDir, '.claude.json');
}

function getGlobalConfigPath() {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(homeDir, '.google-search-mcp.json');
}

async function setupGlobalConfig(apiKeys, searchEngineIds) {
  const configPath = getGlobalConfigPath();
  
  const keys = [];
  for (let i = 0; i < apiKeys.length; i++) {
    keys.push({
      id: `key_${i + 1}`,
      apiKey: apiKeys[i].trim(),
      searchEngineId: searchEngineIds[i]?.trim() || searchEngineIds[0]?.trim() || '',
      dailyUsage: 0,
      dailyLimit: 100,
      lastReset: new Date().toISOString().split('T')[0],
      isActive: true
    });
  }
  
  const config = {
    keys: keys,
    lastUpdated: new Date().toISOString(),
    version: '1.0.0'
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Global configuration saved to: ${configPath}`);
  return configPath;
}

async function setupClaudeCode() {
  const claudeConfigPath = getClaudeConfigPath();
  
  try {
    let claudeConfig = {};
    
    if (fs.existsSync(claudeConfigPath)) {
      const data = fs.readFileSync(claudeConfigPath, 'utf8');
      claudeConfig = JSON.parse(data);
    }
    
    if (!claudeConfig.mcpServers) {
      claudeConfig.mcpServers = {};
    }
    
    // Add our server with platform-specific command
    const isWindows = process.platform === 'win32';
    console.log(`🖥️  Platform detected: ${isWindows ? 'Windows' : 'Unix/Linux/macOS'}`);
    
    if (isWindows) {
      claudeConfig.mcpServers['google-search'] = {
        "type": "stdio",
        "command": "cmd",
        "args": ["/c", "npx", "-y", "@kyaniiii/google-search-mcp"],
        "env": {}
      };
    } else {
      claudeConfig.mcpServers['google-search'] = {
        "type": "stdio", 
        "command": "npx",
        "args": ["-y", "@kyaniiii/google-search-mcp"],
        "env": {}
      };
    }
    
    // Backup original
    if (fs.existsSync(claudeConfigPath)) {
      fs.writeFileSync(`${claudeConfigPath}.backup-${Date.now()}`, fs.readFileSync(claudeConfigPath));
    }
    
    // Write new config
    fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
    console.log(`✅ Claude Code configured automatically`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to configure Claude Code: ${error.message}`);
    console.log('💡 You can configure manually with:');
    console.log('   claude mcp add google-search npx -y @kyaniiii/google-search-mcp');
    return false;
  }
}

async function validateApiKey(apiKey) {
  if (!apiKey || apiKey.length < 30) {
    return false;
  }
  if (!apiKey.startsWith('AIza') && !apiKey.startsWith('Aiza')) {
    return false;
  }
  return true;
}

async function main() {
  console.log('🚀 Google Search MCP - Ultimate Setup');
  console.log('=====================================\n');
  
  // Check if already configured
  const globalConfigPath = getGlobalConfigPath();
  if (fs.existsSync(globalConfigPath)) {
    console.log('⚠️  Global configuration already exists!');
    const overwrite = await askQuestion('Do you want to reconfigure? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled. Current configuration preserved.');
      rl.close();
      return;
    }
  }
  
  console.log('📋 Let\'s get your Google API credentials:\n');
  console.log('🔗 Get your API keys here:');
  console.log('   → https://console.cloud.google.com/apis/credentials');
  console.log('   → Enable "Custom Search API"');
  console.log('   → Create "API Key"\n');
  
  console.log('🔗 Get your Search Engine ID here:');
  console.log('   → https://programmablesearchengine.google.com/');
  console.log('   → Create new search engine');
  console.log('   → Sites to search: * (for entire web)');
  console.log('   → Copy the "Search engine ID"\n');
  
  // Get API keys
  const apiKeysInput = await askQuestion('Enter your Google API key(s) (comma-separated for multiple): ');
  const apiKeys = apiKeysInput.split(',').map(k => k.trim()).filter(k => k);
  
  if (apiKeys.length === 0) {
    console.log('❌ At least one API key is required!');
    rl.close();
    return;
  }
  
  // Validate API keys
  const invalidKeys = [];
  for (const key of apiKeys) {
    if (!(await validateApiKey(key))) {
      invalidKeys.push(key.substring(0, 10) + '...');
    }
  }
  
  if (invalidKeys.length > 0) {
    console.log(`⚠️  Warning: These keys look invalid: ${invalidKeys.join(', ')}`);
    const proceed = await askQuestion('Continue anyway? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }
  
  // Get Search Engine IDs
  const engineIdsInput = await askQuestion('Enter your Custom Search Engine ID(s) (comma-separated): ');
  const engineIds = engineIdsInput.split(',').map(e => e.trim()).filter(e => e);
  
  if (engineIds.length === 0) {
    console.log('❌ At least one Search Engine ID is required!');
    rl.close();
    return;
  }
  
  if (apiKeys.length !== engineIds.length) {
    console.log(`ℹ️  Using first Search Engine ID (${engineIds[0]}) for all API keys`);
  }
  
  console.log('\n🔧 Setting up configuration...');
  
  try {
    // Setup global config
    await setupGlobalConfig(apiKeys, engineIds);
    
    // Setup Claude Code
    const claudeSuccess = await setupClaudeCode();
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📊 Configuration summary:');
    console.log(`   • API Keys: ${apiKeys.length}`);
    console.log(`   • Search Engines: ${engineIds.length}`);
    console.log(`   • Daily Quota: ${apiKeys.length * 100} searches`);
    console.log(`   • Config File: ${globalConfigPath}`);
    
    if (claudeSuccess) {
      console.log('   • Claude Code: ✅ Configured automatically');
      console.log('\n🚀 Ready to use! Try asking Claude to search for something.');
    } else {
      console.log('   • Claude Code: ⚠️  Manual configuration needed');
      console.log('\n📝 To complete setup, run:');
      console.log('   claude mcp add google-search npx -y @kyaniiii/google-search-mcp');
    }
    
    console.log('\n💡 Tips:');
    console.log('   • Quotas reset daily at midnight UTC');
    console.log('   • Server automatically rotates between API keys');
    console.log('   • Configuration is stored globally and persistent');
    
  } catch (error) {
    console.error(`\n❌ Setup failed: ${error.message}`);
    console.log('\nPlease try again or check the documentation:');
    console.log('https://github.com/Fabien-desablens/google-search-mcp#readme');
  }
  
  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Setup cancelled by user');
  rl.close();
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  rl.close();
  process.exit(1);
});