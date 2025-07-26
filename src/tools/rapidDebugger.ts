import { LogAnalyzer } from './logAnalyzer.js';
import { LogUtils } from '../utils.js';
import { LogAnalysis } from '../types.js';

export interface RapidDebugResult {
  timeToAnalysis: number;
  criticalErrors: string[];
  quickFixes: QuickFix[];
  debugCommands: string[];
  rootCause: string;
  confidence: number;
  nextSteps: string[];
}

export interface QuickFix {
  issue: string;
  fix: string;
  command?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

export class RapidDebugger {
  private logAnalyzer: LogAnalyzer;

  constructor() {
    this.logAnalyzer = new LogAnalyzer();
  }

  async debugInUnder30Seconds(logContent: string): Promise<RapidDebugResult> {
    const startTime = Date.now();
    
    // Phase 1: Instant Pattern Analysis (< 1 second)
    const patterns = this.instantPatternAnalysis(logContent);
    
    // Phase 2: AI Analysis (< 5 seconds)
    const aiAnalysis = await this.logAnalyzer.analyzeLogs(logContent, {
      logFormat: 'auto',
      contextLines: 20 // Reduced for speed
    });
    
    // Phase 3: Generate Quick Fixes (< 2 seconds)
    const quickFixes = this.generateQuickFixes(patterns, aiAnalysis);
    
    // Phase 4: Debug Commands (< 1 second)
    const debugCommands = this.generateDebugCommands(patterns);
    
    const totalTime = Date.now() - startTime;
    
    return {
      timeToAnalysis: totalTime,
      criticalErrors: patterns.criticalErrors,
      quickFixes,
      debugCommands,
      rootCause: aiAnalysis.rootCause,
      confidence: aiAnalysis.confidence,
      nextSteps: this.generateNextSteps(patterns, aiAnalysis)
    };
  }

  private instantPatternAnalysis(logContent: string) {
    const lines = logContent.split('\n');
    const errors = LogUtils.extractErrorPatterns(logContent);
    const stackTraces = LogUtils.extractStackTraces(logContent);
    
    // Rapid error classification
    const criticalErrors = [];
    const errorTypes = new Set();
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Database errors
      if (lowerLine.includes('database') && (lowerLine.includes('error') || lowerLine.includes('timeout'))) {
        criticalErrors.push('Database connection/timeout issues');
        errorTypes.add('database');
      }
      
      // Memory errors
      if (lowerLine.includes('outofmemory') || lowerLine.includes('heap space')) {
        criticalErrors.push('Memory exhaustion');
        errorTypes.add('memory');
      }
      
      // Network errors
      if (lowerLine.includes('connection refused') || lowerLine.includes('timeout')) {
        criticalErrors.push('Network connectivity issues');
        errorTypes.add('network');
      }
      
      // Authentication errors
      if (lowerLine.includes('unauthorized') || lowerLine.includes('authentication failed')) {
        criticalErrors.push('Authentication failures');
        errorTypes.add('auth');
      }
      
      // Configuration errors
      if (lowerLine.includes('config') && lowerLine.includes('error')) {
        criticalErrors.push('Configuration problems');
        errorTypes.add('config');
      }
    }
    
    return {
      criticalErrors: Array.from(new Set(criticalErrors)),
      errorTypes: Array.from(errorTypes),
      totalErrors: errors.length,
      hasStackTrace: stackTraces.length > 0,
      logLength: lines.length
    };
  }

  private generateQuickFixes(patterns: any, aiAnalysis: LogAnalysis): QuickFix[] {
    const fixes: QuickFix[] = [];
    
    // Database fixes
    if (patterns.errorTypes.includes('database')) {
      fixes.push({
        issue: 'Database Connection Issues',
        fix: 'Restart database service and check connection pool',
        command: 'sudo systemctl restart mysql && docker ps | grep database',
        priority: 'high',
        estimatedTime: '2-5 minutes'
      });
    }
    
    // Memory fixes
    if (patterns.errorTypes.includes('memory')) {
      fixes.push({
        issue: 'Memory Exhaustion',
        fix: 'Increase heap size and restart application',
        command: 'export JAVA_OPTS="-Xmx2g" && systemctl restart app',
        priority: 'high',
        estimatedTime: '1-3 minutes'
      });
    }
    
    // Network fixes
    if (patterns.errorTypes.includes('network')) {
      fixes.push({
        issue: 'Network Connectivity',
        fix: 'Check service health and network configuration',
        command: 'curl -I http://api-service:8080/health',
        priority: 'medium',
        estimatedTime: '30 seconds'
      });
    }
    
    // Configuration fixes
    if (patterns.errorTypes.includes('config')) {
      fixes.push({
        issue: 'Configuration Problems',
        fix: 'Validate and reload configuration',
        command: 'nginx -t && systemctl reload nginx',
        priority: 'medium',
        estimatedTime: '1 minute'
      });
    }
    
    // Add AI-suggested fixes
    aiAnalysis.suggestedFixes.forEach((fix, index) => {
      if (index < 3) { // Limit for speed
        fixes.push({
          issue: `AI Suggestion ${index + 1}`,
          fix,
          priority: 'medium',
          estimatedTime: '2-5 minutes'
        });
      }
    });
    
    return fixes;
  }

  private generateDebugCommands(patterns: any): string[] {
    const commands = [
      '# Quick Health Check',
      'systemctl status --no-pager',
      'df -h | head -5',
      'free -m',
      '',
      '# Recent Logs',
      'journalctl -u myapp --since "5 minutes ago" --no-pager',
      'tail -n 50 /var/log/app/error.log',
      '',
      '# Process Check',
      'ps aux | grep -E "(java|python|node)" | head -5',
      'netstat -tulpn | grep :8080'
    ];
    
    // Add specific commands based on error types
    if (patterns.errorTypes.includes('database')) {
      commands.push('', '# Database Check', 'mysql -e "SHOW PROCESSLIST;" 2>/dev/null || echo "Database unreachable"');
    }
    
    if (patterns.errorTypes.includes('network')) {
      commands.push('', '# Network Check', 'ping -c 3 api-service', 'curl -I http://localhost:8080/health');
    }
    
    return commands;
  }

  private generateNextSteps(patterns: any, aiAnalysis: LogAnalysis): string[] {
    const steps = [];
    
    if (patterns.criticalErrors.length > 0) {
      steps.push('🚨 Address critical errors first (database, memory, network)');
    }
    
    if (patterns.hasStackTrace) {
      steps.push('🔍 Examine stack traces for exact error locations');
    }
    
    if (aiAnalysis.confidence > 80) {
      steps.push('🎯 High confidence analysis - follow AI suggestions');
    } else {
      steps.push('❓ Low confidence - gather more context and logs');
    }
    
    steps.push('📊 Monitor system metrics during fixes');
    steps.push('✅ Test application functionality after each fix');
    
    return steps;
  }

  // Quick analysis for real-time monitoring
  async quickScan(logContent: string): Promise<{errors: number, critical: boolean, time: number}> {
    const start = Date.now();
    const errors = LogUtils.extractErrorPatterns(logContent);
    const critical = logContent.toLowerCase().includes('fatal') || 
                    logContent.toLowerCase().includes('critical') ||
                    errors.length > 5;
    
    return {
      errors: errors.length,
      critical,
      time: Date.now() - start
    };
  }
} 