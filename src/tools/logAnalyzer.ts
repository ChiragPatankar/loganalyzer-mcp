import { LogAnalysis, LogParsingOptions } from '../types.js';
import { LogUtils } from '../utils.js';
import { config } from '../config.js';
import { LLMProvider } from '../providers/llmProvider.js';
import { GeminiProvider } from '../providers/geminiProvider.js';
import { AnthropicProvider } from '../providers/anthropicProvider.js';

export class LogAnalyzer {
  private provider?: LLMProvider;

  constructor() {
    const isAiEnabled = config.get('isAiEnabled');
    if (isAiEnabled) {
      const providerType = config.get('llmProvider');
      if (providerType === 'gemini') {
        const apiKey = config.get('geminiApiKey');
        this.provider = new GeminiProvider(apiKey, config.get('llmModel'));
      } else if (providerType === 'anthropic') {
        const apiKey = config.get('anthropicApiKey');
        this.provider = new AnthropicProvider(apiKey, config.get('llmModel'));
      }
    }
  }

  async analyzeLogs(logText: string, options: LogParsingOptions): Promise<LogAnalysis> {
    if (!config.get('isAiEnabled') || !this.provider) {
      const fallback = this.createFallbackAnalysis('AI analysis disabled (API key missing)', logText);
      fallback.provider_status = 'local_fallback';
      fallback.metadata.provider_status = 'local_fallback';
      return fallback;
    }

    // Pre-process the log content
    const processedContent = this.preprocessLogs(logText, options);
    
    // Build analysis prompt
    const prompt = this.buildAnalysisPrompt(processedContent, options);
    
    try {
      // Generate analysis using LLM provider with retry mechanism
      const response = await LogUtils.withRetry(() => this.provider!.analyze(prompt));
      
      // Parse and structure the response
      const analysis = this.parseResponse(response.text, logText);
      analysis.provider_status = 'ai_enhanced';
      analysis.metadata.provider_status = 'ai_enhanced';
      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      const fallback = this.createFallbackAnalysis(error instanceof Error ? error.message : 'Unknown error', logText);
      fallback.provider_status = 'error_fallback';
      fallback.metadata.provider_status = 'error_fallback';
      return fallback;
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
      const parsed = LogUtils.extractBalancedJson(responseText);
      if (!parsed) {
        throw new Error('No valid JSON object found in response');
      }

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