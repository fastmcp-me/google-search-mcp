import { google } from 'googleapis';
import { z } from 'zod';
import type { TextContent, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { GoogleSearchConfig } from '../config.js';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface SearchParams {
  query: string;
  num?: number;
  start?: number;
  safe?: string;
  lr?: string;
  gl?: string;
  dateRestrict?: string;
  fileType?: string;
  siteSearch?: string;
  siteSearchFilter?: string;
  cr?: string;
  exactTerms?: string;
  excludeTerms?: string;
  orTerms?: string;
  rights?: string;
  sort?: string;
  searchType?: string;
}

export const name = 'google_search';

export const annotations: ToolAnnotations = {
  title: 'Google Search with API Key Rotation',
  openWorldHint: true,
};

export const description = `
Performs Google searches using the official API with automatic API key rotation.

Features:
- Official Google Web Search
- Automatic API key rotation
- Intelligent quota management
- Multi-language and geolocation support

Parameters:
- query: Search query (required)
- num: Number of results (1-10, default: 5)
- start: Starting index (default: 1)
- safe: SafeSearch (off/active, default: off)
- lr: Language (ex: lang_fr, lang_en)
- gl: Country (ex: fr, us, uk)

Returns a JSON list of results with title, link, description and domain.
`;

export const inputSchema = z.object({
  query: z.string().describe('Google search query'),
  num: z.number().int().min(1).max(10).optional().describe('Number of results to return (1-10)'),
  start: z.number().int().min(1).optional().describe('Starting index of results'),
  safe: z.enum(['off', 'active']).optional().describe('SafeSearch level'),
  lr: z.string().optional().describe('Results language (ex: lang_fr, lang_en)'),
  gl: z.string().optional().describe('Geolocation (country code: fr, us, uk, etc.)'),
  dateRestrict: z.string().optional().describe('Time filter (ex: d1=24h, w1=week, m1=month, y1=year)'),
  fileType: z.string().optional().describe('File type (ex: pdf, doc, ppt)'),
  siteSearch: z.string().optional().describe('Search specific site (ex: reddit.com)'),
  siteSearchFilter: z.enum(['i', 'e']).optional().describe('Include (i) or exclude (e) the site'),
  cr: z.string().optional().describe('Country restriction (ex: countryFR, countryUS)'),
  exactTerms: z.string().optional().describe('Exact phrase required'),
  excludeTerms: z.string().optional().describe('Words to exclude from search'),
  orTerms: z.string().optional().describe('Alternative terms (OR)'),
  rights: z.string().optional().describe('License filters (ex: cc_publicdomain)'),
  sort: z.string().optional().describe('Sort by date (value: date)'),
  searchType: z.string().optional().describe('Search type (value: image)'),
});

const config = new GoogleSearchConfig();

export const execute = async (params: SearchParams) => {
  const response = { content: [] as TextContent[], isError: false };

  try {
    const apiKey = config.getAvailableKey();
    if (!apiKey) {
      throw new Error('All Google API keys have reached their daily quota. Try again tomorrow.');
    }

    // Log which API key is being used
    console.error(`[INFO] Using API Key: ${apiKey.id} -> ${apiKey.apiKey.substring(0, 12)}...${apiKey.apiKey.substring(-4)}`);
    console.error(`[INFO] Search Engine ID: ${apiKey.searchEngineId}`);

    const customsearch = google.customsearch('v1');

    const searchParams = {
      auth: apiKey.apiKey,
      cx: apiKey.searchEngineId,
      q: params.query,
      num: Math.min(params.num || 5, 10),
      start: params.start || 1,
      safe: params.safe || 'off',
      ...(params.lr && { lr: params.lr }),
      ...(params.gl && { 
        gl: params.gl,
        hl: params.gl
      }),
      ...(params.dateRestrict && { dateRestrict: params.dateRestrict }),
      ...(params.fileType && { fileType: params.fileType }),
      ...(params.siteSearch && { siteSearch: params.siteSearch }),
      ...(params.siteSearchFilter && { siteSearchFilter: params.siteSearchFilter }),
      ...(params.cr && { cr: params.cr }),
      ...(params.exactTerms && { exactTerms: params.exactTerms }),
      ...(params.excludeTerms && { excludeTerms: params.excludeTerms }),
      ...(params.orTerms && { orTerms: params.orTerms }),
      ...(params.rights && { rights: params.rights }),
      ...(params.sort && { sort: params.sort }),
      ...(params.searchType && { searchType: params.searchType }),
    };

    const searchResponse = await customsearch.cse.list(searchParams);
    
    config.incrementUsage(apiKey.id);

    const items = searchResponse.data.items || [];
    const results: SearchResult[] = items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      displayLink: item.displayLink || '',
    }));

    const quotaStatus = config.getQuotaStatus();

    response.content.push({
      type: 'text' as const,
      text: JSON.stringify({
        results,
        metadata: {
          query: params.query,
          totalResults: searchResponse.data.searchInformation?.totalResults || '0',
          searchTime: searchResponse.data.searchInformation?.searchTime || '0',
          resultsCount: results.length,
          usedApiKey: apiKey.id,
          quotaStatus
        }
      }, null, 2),
    });

  } catch (error: any) {
    console.error('[ERROR] Google Search Error:', error);
    
    if (error.code === 403) {
      const apiKey = config.getAvailableKey();
      if (apiKey) {
        config.disableKey(apiKey.id, 'Quota exceeded or 403 error');
      }
    }

    response.content.push({
      type: 'text' as const,
      text: JSON.stringify({
        error: 'Google Search error',
        message: error.message,
        details: error.code ? `Code: ${error.code}` : 'Unknown error',
        quotaStatus: config.getQuotaStatus()
      }, null, 2),
    });
    response.isError = true;
  }

  return response;
};