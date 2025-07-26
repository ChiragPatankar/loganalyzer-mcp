export interface LogAnalysis {
  rootCause: string;
  confidence: number;
  suggestedFixes: string[];
  relatedErrors: string[];
  followUpQuestions: string[];
  metadata: {
    errorType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    lineNumbers?: number[];
    stackTrace?: string;
  };
}

export interface FileWatchResult {
  filePath: string;
  newErrors: LogAnalysis[];
  totalErrors: number;
  lastUpdate: Date;
}

export interface LogParsingOptions {
  logFormat: 'auto' | 'json' | 'plain';
  contextLines: number;
  maxFileSize?: number;
}

export interface WatchOptions {
  pollInterval?: number;
  ignoreInitial?: boolean;
  usePolling?: boolean;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
} 