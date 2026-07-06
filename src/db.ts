import Database from 'better-sqlite3';
import { config } from './config.js';

let dbInstance: Database.Database | null = null;

export function resetDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore if already closed
    }
    dbInstance = null;
  }
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    const dbPath = config.get('dbPath') || 'loganalyzer.db';
    dbInstance = new Database(dbPath);
    
    // Enable Write-Ahead Logging (WAL) for performance
    dbInstance.pragma('journal_mode = WAL');
    
    // Create the error_logs table
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filePath TEXT NOT NULL,
        rootCause TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        suggestedFixes TEXT NOT NULL,      -- JSON array
        relatedErrors TEXT NOT NULL,       -- JSON array
        followUpQuestions TEXT NOT NULL,   -- JSON array
        errorType TEXT NOT NULL,
        severity TEXT NOT NULL,
        timestamp TEXT NOT NULL,           -- ISO-8601 string
        lineNumbers TEXT,                  -- JSON array
        stackTrace TEXT,
        provider_status TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_error_logs_filePath ON error_logs(filePath);
      CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
      CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
    `);
  }
  return dbInstance;
}

export interface DatabaseErrorLog {
  id?: number;
  filePath: string;
  rootCause: string;
  confidence: number;
  suggestedFixes: string[];
  relatedErrors: string[];
  followUpQuestions: string[];
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  lineNumbers?: number[];
  stackTrace?: string;
  provider_status: 'ai_enhanced' | 'local_fallback' | 'error_fallback';
}

export function saveErrorLog(log: DatabaseErrorLog): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO error_logs (
      filePath, rootCause, confidence, suggestedFixes, relatedErrors, 
      followUpQuestions, errorType, severity, timestamp, lineNumbers, 
      stackTrace, provider_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    log.filePath,
    log.rootCause,
    log.confidence,
    JSON.stringify(log.suggestedFixes),
    JSON.stringify(log.relatedErrors),
    JSON.stringify(log.followUpQuestions),
    log.errorType,
    log.severity,
    log.timestamp.toISOString(),
    log.lineNumbers ? JSON.stringify(log.lineNumbers) : null,
    log.stackTrace || null,
    log.provider_status
  );
  
  return result.lastInsertRowid as number;
}

export function queryErrorLogs(filters: {
  filePath?: string;
  severity?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}): DatabaseErrorLog[] {
  const db = getDatabase();
  let query = 'SELECT * FROM error_logs WHERE 1=1';
  const params: any[] = [];
  
  if (filters.filePath) {
    query += ' AND filePath = ?';
    params.push(filters.filePath);
  }
  
  if (filters.severity) {
    query += ' AND severity = ?';
    params.push(filters.severity);
  }
  
  if (filters.since) {
    try {
      query += ' AND timestamp >= ?';
      params.push(new Date(filters.since).toISOString());
    } catch {
      // Ignore invalid date
    }
  }
  
  if (filters.until) {
    try {
      query += ' AND timestamp <= ?';
      params.push(new Date(filters.until).toISOString());
    } catch {
      // Ignore invalid date
    }
  }
  
  query += ' ORDER BY timestamp DESC';
  
  const limit = typeof filters.limit === 'number' ? filters.limit : 50;
  const offset = typeof filters.offset === 'number' ? filters.offset : 0;
  
  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  
  return rows.map((row: any) => ({
    id: row.id,
    filePath: row.filePath,
    rootCause: row.rootCause,
    confidence: row.confidence,
    suggestedFixes: JSON.parse(row.suggestedFixes),
    relatedErrors: JSON.parse(row.relatedErrors),
    followUpQuestions: JSON.parse(row.followUpQuestions),
    errorType: row.errorType,
    severity: row.severity,
    timestamp: new Date(row.timestamp),
    lineNumbers: row.lineNumbers ? JSON.parse(row.lineNumbers) : [],
    stackTrace: row.stackTrace || '',
    provider_status: row.provider_status
  }));
}
