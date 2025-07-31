import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import tools from './tools/index.js';

export const server = new McpServer(
  {
    name: 'google-search-mcp',
    version: '1.0.0',
    title: 'Google Search MCP Server with API Key Rotation',
  },
  {
    capabilities: {
      logging: {},
      tools: { listChanged: false },
    },
    instructions: 'Use this server to perform Google searches with automatic API key rotation and quota management. Supports multiple Google API keys for increased daily limits.',
  }
);

// Enregistrer tous les outils
for (const tool of Object.values(tools)) {
  server.tool(tool.name, tool.description, tool.inputSchema.shape, tool.annotations, tool.execute);
}