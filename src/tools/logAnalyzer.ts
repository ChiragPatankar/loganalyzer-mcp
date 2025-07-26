import { GoogleGenerativeAI } from '@google/generative-ai';
import { LogAnalysis, LogParsingOptions } from '../types.js';
import { LogUtils } from '../utils.js';

export class LogAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async analyzeLogs(logText: string, options: LogParsingOptions): Promise<LogAnalysis> {
    // Pre-process the log content
    const processedContent = this.preprocessLogs(logText, options);
    
    // Build analysis prompt
    const prompt = this.buildAnalysisPrompt(processedContent, options);
    
    try {
      // Generate analysis using Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      // Parse and structure the response
      return this.parseResponse(response.text(), logText);
    } catch (error) {
      throw new Error(`Failed to analyze logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private preprocessLogs(logText: string, options: LogParsingOptions): string {
    let processed = logText;

    // Detect format if auto
    if (options.logFormat === 'auto') {
      const detectedFormat = LogUtils.detectLogFormat(logText);
      options.logFormat = detectedFormat;
    }

    // Extract error patterns for better focus
    const errorPatterns = LogUtils.extractErrorPatterns(logText);
    if (errorPatterns.length > 0) {
      // Include error sections plus some context
      processed = errorPatterns.join('\n---\n');
    }

    // Truncate if too large
    processed = LogUtils.truncateContent(processed);

    return processed;
  }

  private buildAnalysisPrompt(logContent: string, options: LogParsingOptions): string {
    return `You are an expert log analyst. Analyze the following ${options.logFormat} logs and provide a structured analysis.

Log Content:
\`\`\`
${logContent}
\`\`\`

Please provide your analysis in the following JSON format:
{
  "rootCause": "Brief explanation of the main issue identified",
  "confidence": "number between 0-100 indicating confidence in the analysis",
  "suggestedFixes": ["array", "of", "specific", "actionable", "solutions"],
  "relatedErrors": ["array", "of", "related", "error", "messages", "or", "patterns"],
  "followUpQuestions": ["array", "of", "questions", "to", "help", "debug", "further"],
  "metadata": {
    "errorType": "type of error (e.g., 'runtime', 'configuration', 'network', 'database')",
    "severity": "one of: 'low', 'medium', 'high', 'critical'",
    "lineNumbers": [1, 2, 3],
    "stackTrace": "extracted stack trace if available"
  }
}

Focus on:
1. Identifying the root cause of errors
2. Providing actionable solutions
3. Extracting relevant context and patterns
4. Assessing the severity and impact
5. Suggesting follow-up investigations

Be specific and practical in your recommendations. If multiple errors are present, focus on the most critical ones.`;
  }

  private parseResponse(responseText: string, originalLogText: string): LogAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and structure the response
      const analysis: LogAnalysis = {
        rootCause: parsed.rootCause || 'Unable to determine root cause',
        confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
        suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes : [],
        relatedErrors: Array.isArray(parsed.relatedErrors) ? parsed.relatedErrors : [],
        followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
        metadata: {
          errorType: parsed.metadata?.errorType || 'unknown',
          severity: this.validateSeverity(parsed.metadata?.severity),
          timestamp: new Date(),
          lineNumbers: Array.isArray(parsed.metadata?.lineNumbers) ? parsed.metadata.lineNumbers : [],
          stackTrace: parsed.metadata?.stackTrace || LogUtils.extractStackTraces(originalLogText).join('\n')
        }
      };

      return analysis;
    } catch (error) {
      // Fallback analysis if parsing fails
      return this.createFallbackAnalysis(responseText, originalLogText);
    }
  }

  private validateSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    return validSeverities.includes(severity) ? severity as any : 'medium';
  }

  private createFallbackAnalysis(responseText: string, originalLogText: string): LogAnalysis {
    const errorPatterns = LogUtils.extractErrorPatterns(originalLogText);
    const stackTraces = LogUtils.extractStackTraces(originalLogText);

    return {
      rootCause: 'AI analysis failed, but errors detected in logs',
      confidence: 30,
      suggestedFixes: [
        'Review the error patterns identified',
        'Check application configuration',
        'Examine stack traces for debugging'
      ],
      relatedErrors: errorPatterns.slice(0, 3),
      followUpQuestions: [
        'What actions were being performed when the error occurred?',
        'Has this error happened before?',
        'Were there any recent changes to the system?'
      ],
      metadata: {
        errorType: 'unknown',
        severity: errorPatterns.length > 5 ? 'high' : 'medium',
        timestamp: new Date(),
        stackTrace: stackTraces.join('\n')
      }
    };
  }
} 