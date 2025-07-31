import { GlobalConfigManager, ApiKeyState } from './global-config.js';

export interface GoogleApiKey {
  id: string;
  apiKey: string;
  searchEngineId: string;
  dailyUsage: number;
  dailyLimit: number;
  lastReset: string;
  isActive: boolean;
}

export class GoogleSearchConfig {
  private globalConfig: GlobalConfigManager;

  constructor() {
    this.globalConfig = new GlobalConfigManager();
    this.checkConfiguration();
  }

  private checkConfiguration(): void {
    if (!this.globalConfig.hasValidConfig()) {
      console.error('[WARN] No Google API keys configured.');
      console.error('[INFO] First time setup:');
      console.error('[INFO] 1. Get API keys: https://console.cloud.google.com/');
      console.error('[INFO] 2. Get Search Engine ID: https://programmablesearchengine.google.com/');
      console.error('[INFO] 3. Run setup command: npx @kyaniiii/google-search-mcp setup');
      console.error('[INFO] Full documentation: https://github.com/Fabien-desablens/google-search-mcp#readme');
      return;
    }

    const status = this.globalConfig.getQuotaStatus();
    console.error(`[INFO] ${status.keysStatus.length} Google API keys loaded globally`);
  }

  public getAvailableKey(): GoogleApiKey | null {
    const key = this.globalConfig.getAvailableKey();
    if (!key) return null;
    
    return {
      id: key.id,
      apiKey: key.apiKey,
      searchEngineId: key.searchEngineId,
      dailyUsage: key.dailyUsage,
      dailyLimit: key.dailyLimit,
      lastReset: key.lastReset,
      isActive: key.isActive
    };
  }

  public incrementUsage(keyId: string): void {
    this.globalConfig.incrementUsage(keyId);
  }

  public getQuotaStatus(): { totalUsed: number; totalLimit: number; keysStatus: any[] } {
    return this.globalConfig.getQuotaStatus();
  }

  public disableKey(keyId: string, reason: string): void {
    this.globalConfig.disableKey(keyId, reason);
  }

  public hasValidConfig(): boolean {
    return this.globalConfig.hasValidConfig();
  }

  public getConfigPath(): string {
    return this.globalConfig.getConfigPath();
  }
}