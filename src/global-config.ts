import * as fs from 'fs';
import * as path from 'path';

export interface ApiKeyState {
  id: string;
  apiKey: string;
  searchEngineId: string;
  dailyUsage: number;
  dailyLimit: number;
  lastReset: string; // ISO date string
  isActive: boolean;
}

export interface GlobalConfig {
  keys: ApiKeyState[];
  lastUpdated: string;
  version: string;
}

export class GlobalConfigManager {
  private configPath: string;
  private config!: GlobalConfig;

  constructor() {
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    this.configPath = path.join(homeDir, '.google-search-mcp.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(data);
        console.error(`[INFO] Loaded global config from: ${this.configPath}`);
        
        // Note: If you manually edit the config file, you must restart Claude Desktop
        // for the changes to take effect as the config is only loaded once at startup
        
        // Migrate old format if needed
        this.migrateIfNeeded();
        
        // Reset daily usage if needed
        this.resetDailyUsageIfNeeded();
      } else {
        console.error('[WARN] No global config found. Use setup command to configure.');
        this.config = {
          keys: [],
          lastUpdated: new Date().toISOString(),
          version: '1.0.0'
        };
      }
    } catch (error) {
      console.error(`[ERROR] Error loading global config: ${error}`);
      this.config = {
        keys: [],
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
    }
  }

  private migrateIfNeeded(): void {
    if (!this.config.version) {
      this.config.version = '1.0.0';
      this.saveConfig();
    }
  }

  private saveConfig(): void {
    try {
      this.config.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.error(`[DEBUG] Global config saved to: ${this.configPath}`);
    } catch (error) {
      console.error(`[ERROR] Error saving global config: ${error}`);
    }
  }

  public setupKeys(apiKeys: string[], searchEngineIds: string[]): void {
    this.config.keys = [];
    
    for (let i = 0; i < apiKeys.length; i++) {
      this.config.keys.push({
        id: `key_${i + 1}`,
        apiKey: apiKeys[i].trim(),
        searchEngineId: searchEngineIds[i]?.trim() || searchEngineIds[0]?.trim() || '',
        dailyUsage: 0,
        dailyLimit: 100,
        lastReset: new Date().toISOString().split('T')[0],
        isActive: true
      });
    }
    
    this.saveConfig();
    console.error(`[INFO] ${this.config.keys.length} API keys configured globally`);
  }

  public getAvailableKey(): ApiKeyState | null {
    this.resetDailyUsageIfNeeded();
    
    // Find a key with available quota
    for (const key of this.config.keys) {
      if (key.isActive && key.dailyUsage < key.dailyLimit) {
        return key;
      }
    }
    
    return null; // All keys are exhausted
  }

  public incrementUsage(keyId: string): void {
    const key = this.config.keys.find(k => k.id === keyId);
    if (key) {
      key.dailyUsage++;
      this.saveConfig(); // Persist immediately
      console.error(`[INFO] Key ${keyId}: ${key.dailyUsage}/${key.dailyLimit} requests used`);
    }
  }

  public getQuotaStatus(): { totalUsed: number; totalLimit: number; keysStatus: any[] } {
    this.resetDailyUsageIfNeeded();
    
    const totalUsed = this.config.keys.reduce((sum, key) => sum + key.dailyUsage, 0);
    const totalLimit = this.config.keys.reduce((sum, key) => sum + key.dailyLimit, 0);
    
    const keysStatus = this.config.keys.map(key => ({
      id: key.id,
      used: key.dailyUsage,
      limit: key.dailyLimit,
      remaining: key.dailyLimit - key.dailyUsage,
      active: key.isActive
    }));

    return { totalUsed, totalLimit, keysStatus };
  }

  private resetDailyUsageIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    let hasChanges = false;
    
    for (const key of this.config.keys) {
      if (key.lastReset !== today) {
        key.dailyUsage = 0;
        key.lastReset = today;
        key.isActive = true; // Re-enable disabled keys
        hasChanges = true;
        console.error(`[INFO] Reset quota for ${key.id}`);
      }
    }
    
    if (hasChanges) {
      this.saveConfig();
    }
  }

  public disableKey(keyId: string, reason: string): void {
    const key = this.config.keys.find(k => k.id === keyId);
    if (key) {
      key.isActive = false;
      this.saveConfig();
      console.error(`[WARN] Key ${keyId} disabled: ${reason}`);
    }
  }

  public hasValidConfig(): boolean {
    return this.config.keys.length > 0 && 
           this.config.keys.some(k => k.apiKey && k.searchEngineId);
  }

  public getConfigPath(): string {
    return this.configPath;
  }
}