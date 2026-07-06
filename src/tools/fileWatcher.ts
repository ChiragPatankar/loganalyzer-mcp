import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import { LogAnalysis, FileWatchResult, WatchOptions } from '../types.js';
import { LogAnalyzer } from './logAnalyzer.js';
import { LogUtils } from '../utils.js';
import { getDatabase, saveErrorLog, queryErrorLogs } from '../db.js';

interface WatchedFile {
  filePath: string;
  watcher: chokidar.FSWatcher;
  lastSize: number;
  lastUpdate: Date;
  options: WatchOptions;
}

interface CacheEntry {
  analysis: LogAnalysis;
  filePath: string;
}

class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private max: number;

  constructor(max = 100) {
    this.max = max;
  }

  get(key: string): CacheEntry | undefined {
    const val = this.cache.get(key);
    if (val !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, val);
    }
    return val;
  }

  set(key: string, val: CacheEntry): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, val);
  }

  getAll(): CacheEntry[] {
    // Return values in newest-first order
    return Array.from(this.cache.values()).reverse();
  }

  clear(): void {
    this.cache.clear();
  }
}

export class FileWatcher {
  private watchers = new Map<string, WatchedFile>();
  private logAnalyzer: LogAnalyzer;
  private lruCache = new LRUCache(100);

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
      // Fetch total count from DB
      const db = getDatabase();
      const countRow = db.prepare('SELECT COUNT(*) as count FROM error_logs WHERE filePath = ?').get(filePath) as { count: number };
      const totalErrors = countRow ? countRow.count : 0;

      // Fetch last 5 errors from DB
      const dbLogs = queryErrorLogs({ filePath, limit: 5 });
      const recentErrors: LogAnalysis[] = dbLogs.map(log => ({
        rootCause: log.rootCause,
        confidence: log.confidence,
        suggestedFixes: log.suggestedFixes,
        relatedErrors: log.relatedErrors,
        followUpQuestions: log.followUpQuestions,
        metadata: {
          errorType: log.errorType,
          severity: log.severity,
          timestamp: log.timestamp,
          lineNumbers: log.lineNumbers,
          stackTrace: log.stackTrace
        },
        provider_status: log.provider_status
      }));

      results.push({
        filePath,
        newErrors: recentErrors,
        totalErrors,
        lastUpdate: watchedFile.lastUpdate
      });
    }

    return results;
  }

  async getRecentErrors(filePath?: string, limit: number = 10): Promise<LogAnalysis[]> {
    // Try in-memory LRU cache first
    const cached = this.lruCache.getAll();
    const filteredCached = filePath 
      ? cached.filter(c => c.filePath === filePath)
      : cached;
      
    if (filteredCached.length >= limit) {
      return filteredCached.slice(0, limit).map(c => c.analysis);
    }

    // Query SQLite database as a fallback
    const dbLogs = queryErrorLogs({
      filePath,
      limit
    });

    return dbLogs.map(log => ({
      rootCause: log.rootCause,
      confidence: log.confidence,
      suggestedFixes: log.suggestedFixes,
      relatedErrors: log.relatedErrors,
      followUpQuestions: log.followUpQuestions,
      metadata: {
        errorType: log.errorType,
        severity: log.severity,
        timestamp: log.timestamp,
        lineNumbers: log.lineNumbers,
        stackTrace: log.stackTrace
      },
      provider_status: log.provider_status
    }));
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

          // Persist to SQLite
          saveErrorLog({
            filePath,
            rootCause: analysis.rootCause,
            confidence: analysis.confidence,
            suggestedFixes: analysis.suggestedFixes,
            relatedErrors: analysis.relatedErrors,
            followUpQuestions: analysis.followUpQuestions,
            errorType: analysis.metadata.errorType,
            severity: analysis.metadata.severity,
            timestamp: analysis.metadata.timestamp,
            lineNumbers: analysis.metadata.lineNumbers,
            stackTrace: analysis.metadata.stackTrace,
            provider_status: analysis.provider_status || 'local_fallback'
          });

          // Insert into LRU Cache
          this.lruCache.set(filePath + '-' + analysis.metadata.timestamp.getTime(), {
            analysis,
            filePath
          });

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