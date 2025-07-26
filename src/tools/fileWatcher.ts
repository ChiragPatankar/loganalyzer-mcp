import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import { LogAnalysis, FileWatchResult, WatchOptions } from '../types.js';
import { LogAnalyzer } from './logAnalyzer.js';
import { LogUtils } from '../utils.js';

interface WatchedFile {
  filePath: string;
  watcher: chokidar.FSWatcher;
  lastSize: number;
  errors: LogAnalysis[];
  lastUpdate: Date;
  options: WatchOptions;
}

export class FileWatcher {
  private watchers = new Map<string, WatchedFile>();
  private logAnalyzer: LogAnalyzer;

  constructor() {
    this.logAnalyzer = new LogAnalyzer();
  }

  async watchLogFile(filePath: string, options: WatchOptions = {}): Promise<void> {
    // Validate file path first
    const validation = await LogUtils.validateFilePath(filePath);
    if (!validation.valid) {
      throw new Error(`Cannot watch file: ${validation.error}`);
    }

    // Stop existing watcher if present
    if (this.watchers.has(filePath)) {
      await this.stopWatching(filePath);
    }

    const watchOptions: WatchOptions = {
      pollInterval: options.pollInterval || 1000,
      ignoreInitial: options.ignoreInitial ?? false,
      usePolling: options.usePolling ?? true
    };

    // Get initial file size
    const stats = await fs.stat(filePath);
    const initialSize = stats.size;

    // Create watcher
    const watcher = chokidar.watch(filePath, {
      ignoreInitial: watchOptions.ignoreInitial,
      usePolling: watchOptions.usePolling,
      interval: watchOptions.pollInterval
    });

    const watchedFile: WatchedFile = {
      filePath,
      watcher,
      lastSize: initialSize,
      errors: [],
      lastUpdate: new Date(),
      options: watchOptions
    };

    // Set up event handlers
    watcher.on('change', async (path) => {
      await this.handleFileChange(path);
    });

    watcher.on('error', (error) => {
      console.error(`File watcher error for ${filePath}:`, error);
    });

    this.watchers.set(filePath, watchedFile);

    // Process initial content if not ignoring initial
    if (!watchOptions.ignoreInitial) {
      await this.handleFileChange(filePath);
    }
  }

  async stopWatching(filePath: string): Promise<void> {
    const watchedFile = this.watchers.get(filePath);
    if (!watchedFile) {
      throw new Error(`File ${filePath} is not being watched`);
    }

    await watchedFile.watcher.close();
    this.watchers.delete(filePath);
  }

  async listWatchedFiles(): Promise<FileWatchResult[]> {
    const results: FileWatchResult[] = [];

    for (const [filePath, watchedFile] of this.watchers) {
      results.push({
        filePath,
        newErrors: watchedFile.errors.slice(-5), // Last 5 errors
        totalErrors: watchedFile.errors.length,
        lastUpdate: watchedFile.lastUpdate
      });
    }

    return results;
  }

  async getRecentErrors(filePath?: string, limit: number = 10): Promise<LogAnalysis[]> {
    if (filePath) {
      const watchedFile = this.watchers.get(filePath);
      if (!watchedFile) {
        throw new Error(`File ${filePath} is not being watched`);
      }
      return watchedFile.errors.slice(-limit);
    }

    // Get recent errors from all watched files
    const allErrors: LogAnalysis[] = [];
    for (const watchedFile of this.watchers.values()) {
      allErrors.push(...watchedFile.errors);
    }

    // Sort by timestamp and return most recent
    return allErrors
      .sort((a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime())
      .slice(0, limit);
  }

  private async handleFileChange(filePath: string): Promise<void> {
    const watchedFile = this.watchers.get(filePath);
    if (!watchedFile) {
      return;
    }

    try {
      // Get current file size
      const stats = await fs.stat(filePath);
      const currentSize = stats.size;

      // Only process if file has grown (new content added)
      if (currentSize <= watchedFile.lastSize) {
        return;
      }

      // Read only the new content
      const newContent = await this.readNewContent(filePath, watchedFile.lastSize, currentSize);
      
      if (newContent.trim()) {
        // Check if new content contains errors
        const errorPatterns = LogUtils.extractErrorPatterns(newContent);
        
        if (errorPatterns.length > 0) {
          // Analyze the new errors
          const analysis = await this.logAnalyzer.analyzeLogs(newContent, {
            logFormat: 'auto',
            contextLines: 20
          });

          // Store the analysis
          watchedFile.errors.push(analysis);
          
          // Keep only last 100 errors to prevent memory issues
          if (watchedFile.errors.length > 100) {
            watchedFile.errors = watchedFile.errors.slice(-100);
          }

          console.error(`New error detected in ${filePath}: ${analysis.rootCause}`);
        }
      }

      // Update tracking info
      watchedFile.lastSize = currentSize;
      watchedFile.lastUpdate = new Date();

    } catch (error) {
      console.error(`Error processing file change for ${filePath}:`, error);
    }
  }

  private async readNewContent(filePath: string, startByte: number, endByte: number): Promise<string> {
    const fileHandle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(endByte - startByte);
      await fileHandle.read(buffer, 0, buffer.length, startByte);
      return buffer.toString('utf8');
    } finally {
      await fileHandle.close();
    }
  }

  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.watchers.keys()).map(filePath => 
      this.stopWatching(filePath)
    );
    await Promise.all(stopPromises);
  }
} 