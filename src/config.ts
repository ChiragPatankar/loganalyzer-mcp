import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface ServerConfig {
  geminiApiKey: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxFileSize: number; // in bytes
  watchInterval: number; // in milliseconds
  maxContextTokens: number;
  defaultPollInterval: number;
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: ServerConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): ServerConfig {
    return {
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      maxFileSize: this.parseSize(process.env.MAX_FILE_SIZE || '10MB'),
      watchInterval: parseInt(process.env.WATCH_INTERVAL || '1000'),
      maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '8000'),
      defaultPollInterval: parseInt(process.env.DEFAULT_POLL_INTERVAL || '1000')
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    if (!this.config.geminiApiKey) {
      errors.push('GEMINI_API_KEY is required');
    }

    if (this.config.maxFileSize <= 0) {
      errors.push('MAX_FILE_SIZE must be a positive number');
    }

    if (this.config.watchInterval < 100) {
      errors.push('WATCH_INTERVAL must be at least 100ms');
    }

    if (this.config.maxContextTokens < 1000) {
      errors.push('MAX_CONTEXT_TOKENS must be at least 1000');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  private parseSize(sizeStr: string): number {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}. Use format like '10MB', '512KB', etc.`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase() as keyof typeof units;
    
    return Math.floor(value * units[unit]);
  }

  public getConfig(): ServerConfig {
    return { ...this.config };
  }

  public get(key: keyof ServerConfig): any {
    return this.config[key];
  }

  public updateConfig(updates: Partial<ServerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public logConfigSummary(): void {
    const config = this.getConfig();
    const summary = {
      logLevel: config.logLevel,
      maxFileSize: this.formatSize(config.maxFileSize),
      watchInterval: `${config.watchInterval}ms`,
      maxContextTokens: config.maxContextTokens,
      hasGeminiKey: !!config.geminiApiKey,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log('📋 Configuration Summary:');
    console.log(JSON.stringify(summary, null, 2));
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance(); 