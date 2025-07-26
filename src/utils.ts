import { LogParsingOptions } from './types.js';

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
   * Extract stack traces from content
   */
  static extractStackTraces(content: string): string[] {
    const stackTracePattern = /(?:at\s+.+\(.+:\d+:\d+\)|at\s+.+:\d+:\d+)/gm;
    const matches = content.match(stackTracePattern);
    return matches ? [...new Set(matches)] : [];
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