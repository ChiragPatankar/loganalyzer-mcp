import { LogParsingOptions, StackTraceFrame } from './types.js';

class StackFrame implements StackTraceFrame {
  public file: string;
  public line: number;
  public function: string;
  private raw: string;

  constructor(file: string, line: number, func: string, raw: string) {
    this.file = file;
    this.line = line;
    this.function = func;
    this.raw = raw;
  }

  toString(): string {
    return this.raw;
  }
}

export class LogUtils {
  /**
   * Detect the format of log content
   */
  static detectLogFormat(content: string): 'json' | 'plain' {
    const lines = content.trim().split('\n');
    let jsonCount = 0;
    
    for (const line of lines.slice(0, 10)) { // Check first 10 lines
      try {
        JSON.parse(line.trim());
        jsonCount++;
      } catch {
        // Not JSON, continue
      }
    }
    
    return jsonCount > lines.length * 0.5 ? 'json' : 'plain';
  }

  /**
   * Extract error patterns from log content
   */
  static extractErrorPatterns(content: string): string[] {
    const errorPatterns = [
      /error/gi,
      /exception/gi,
      /fail(ed|ure)/gi,
      /fatal/gi,
      /critical/gi,
      /panic/gi,
      /stack trace/gi
    ];

    const matches: string[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of errorPatterns) {
        if (pattern.test(line)) {
          // Include context lines around error
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          const context = lines.slice(start, end).join('\n');
          matches.push(context);
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Truncate content to fit within context limits
   */
  static truncateContent(content: string, maxTokens: number = 8000): string {
    // Rough estimation: ~4 characters per token
    const maxChars = maxTokens * 4;
    
    if (content.length <= maxChars) {
      return content;
    }

    // Try to keep error sections if possible
    const errorSections = this.extractErrorPatterns(content);
    if (errorSections.length > 0) {
      const combined = errorSections.join('\n---\n');
      if (combined.length <= maxChars) {
        return combined;
      }
    }

    // Fallback to simple truncation with ellipsis
    return content.substring(0, maxChars - 100) + '\n\n... [truncated] ...';
  }

  /**
   * Parse JSON logs safely
   */
  static parseJsonLogs(content: string): any[] {
    const lines = content.trim().split('\n');
    const parsed: any[] = [];

    for (const line of lines) {
      try {
        const json = JSON.parse(line.trim());
        parsed.push(json);
      } catch {
        // Skip invalid JSON lines
      }
    }

    return parsed;
  }

  /**
   * Attempt to extract and parse the first balanced-brace JSON object found in text.
   */
  static extractBalancedJson(text: string): any {
    try {
      // First try parsing the entire string (strict JSON)
      return JSON.parse(text.trim());
    } catch {
      // If that fails, find braced substrings
      let openBraces = 0;
      let startIndex = -1;
      
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (openBraces === 0) {
            startIndex = i;
          }
          openBraces++;
        } else if (text[i] === '}') {
          if (openBraces > 0) {
            openBraces--;
            if (openBraces === 0 && startIndex !== -1) {
              const candidate = text.substring(startIndex, i + 1);
              try {
                const parsed = JSON.parse(candidate);
                // Verify that it has the expected fields of a LogAnalysis structure
                if (parsed && (parsed.rootCause !== undefined || parsed.suggestedFixes !== undefined || parsed.confidence !== undefined)) {
                  return parsed;
                }
              } catch {
                // Ignore parsing errors for this block, keep scanning
              }
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Extract stack traces from content supporting Node, Java, and Python formats.
   */
  static extractStackTraces(content: string): StackTraceFrame[] {
    if (!content) return [];
    
    const lines = content.split('\n');
    const frames: StackTraceFrame[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 1. Python Frame: File "path/to/file.py", line 42, in functionName
      const pythonMatch = trimmed.match(/^File\s+"([^"]+)",\s*line\s*(\d+),\s*in\s+([^\s]+)/);
      if (pythonMatch) {
        const raw = trimmed;
        if (!seen.has(raw)) {
          seen.add(raw);
          frames.push(new StackFrame(
            pythonMatch[1],
            parseInt(pythonMatch[2], 10),
            pythonMatch[3],
            raw
          ));
        }
        continue;
      }

      // 2. Node/V8 with function name: at functionName (file.js:10:5)
      const nodeFnMatch = trimmed.match(/^at\s+([^\s(]+)\s+\(([^:]+):(\d+)(?::(\d+))?\)$/);
      if (nodeFnMatch) {
        const raw = trimmed;
        if (!seen.has(raw)) {
          seen.add(raw);
          frames.push(new StackFrame(
            nodeFnMatch[2],
            parseInt(nodeFnMatch[3], 10),
            nodeFnMatch[1],
            raw
          ));
        }
        continue;
      }

      // 3. Java Frame: at package.Class.method(File.java:42)
      const javaMatch = trimmed.match(/^at\s+([^\s(]+)\(([^:]+):(\d+)\)$/);
      if (javaMatch) {
        const raw = trimmed;
        if (!seen.has(raw)) {
          seen.add(raw);
          frames.push(new StackFrame(
            javaMatch[2],
            parseInt(javaMatch[3], 10),
            javaMatch[1],
            raw
          ));
        }
        continue;
      }

      // 4. Node/V8 anonymous: at file.js:10:5
      const nodeAnonMatch = trimmed.match(/^at\s+([^:]+):(\d+)(?::(\d+))?$/);
      if (nodeAnonMatch) {
        const raw = trimmed;
        if (!seen.has(raw)) {
          seen.add(raw);
          frames.push(new StackFrame(
            nodeAnonMatch[1],
            parseInt(nodeAnonMatch[2], 10),
            '<anonymous>',
            raw
          ));
        }
        continue;
      }
    }

    return frames;
  }

  /**
   * Run a function with exponential backoff retry.
   */
  static async withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, initialDelay = 1000): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error: any) {
        attempt++;
        const isRetryable = LogUtils.isRetryableError(error);
        
        if (attempt >= maxAttempts || !isRetryable) {
          throw error;
        }
        
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.error(`⚠️ LLM call failed. Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts}). Error: ${error.message || error}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Determine if an error is retryable.
   */
  private static isRetryableError(error: any): boolean {
    if (!error) return false;

    // Check status code if present
    if (typeof error.status === 'number') {
      const status = error.status;
      // 429 Rate Limit, 408 Timeout, 5xx Server Errors are retryable
      return status === 429 || status === 408 || status >= 500;
    }

    // Check code (e.g. Node network codes)
    if (typeof error.code === 'string') {
      const code = error.code;
      const retryableNetworkCodes = [
        'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 
        'EADDRINUSE', 'EPIPE', 'EAI_AGAIN'
      ];
      if (retryableNetworkCodes.includes(code)) return true;
    }

    // Check message contents
    const message = (error.message || '').toLowerCase();
    const retryableKeywords = [
      'rate limit', 'rate_limit', 'quota', 'exhausted', 'timeout', 
      '500', '503', '504', 'fetch failed', 'connreset', 'econnrefused'
    ];

    for (const keyword of retryableKeywords) {
      if (message.includes(keyword)) return true;
    }

    // Check Anthropic error class names
    const errorName = error.name || '';
    if (errorName.includes('RateLimitError') || 
        errorName.includes('InternalServerError') || 
        errorName.includes('APIConnectionTimeoutError') ||
        errorName.includes('APIConnectionError')) {
      return true;
    }

    return false;
  }

  /**
   * Validate file path and check permissions
   */
  static async validateFilePath(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const fs = await import('fs/promises');
      await fs.access(filePath, (await import('fs')).constants.R_OK);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 