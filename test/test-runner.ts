#!/usr/bin/env node

import { LogAnalyzer } from '../src/tools/logAnalyzer.js';
import { LogUtils } from '../src/utils.js';
import { testCases } from './sample-logs.js';
import { config } from '../src/config.js';
import { runHardeningTests } from './hardening-tests.js';

class TestRunner {
  private logAnalyzer: LogAnalyzer;
  private testResults: TestResult[] = [];

  constructor() {
    this.logAnalyzer = new LogAnalyzer();
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting LogAnalyzer Test Suite');
    console.log('=====================================\n');

    // Check configuration first
    this.checkConfiguration();

    // Run utility tests
    await this.runUtilityTests();

    // Run hardening tests
    try {
      await runHardeningTests();
    } catch (error) {
      console.error('❌ Hardening tests encountered an error:', error);
    }

    // Run analysis tests
    await this.runAnalysisTests();

    // Show summary
    this.showSummary();
  }

  private checkConfiguration(): void {
    console.log('⚙️  Checking Configuration...');
    try {
      config.logConfigSummary();
      console.log('✅ Configuration valid\n');
    } catch (error) {
      console.error('❌ Configuration error:', error);
      console.log('💡 Make sure to set GEMINI_API_KEY environment variable\n');
    }
  }

  private async runUtilityTests(): Promise<void> {
    console.log('🔧 Testing Utility Functions...');
    
    const tests = [
      () => this.testFormatDetection(),
      () => this.testErrorExtraction(),
      () => this.testStackTraceExtraction(),
      () => this.testContentTruncation(),
      () => this.testFileValidation()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`❌ Utility test failed:`, error);
      }
    }
    console.log('');
  }

  private testFormatDetection(): void {
    const jsonLog = testCases.find(t => t.name === 'JSON Structured Logs')?.log || '';
    const plainLog = testCases.find(t => t.name === 'Database Connection Error')?.log || '';
    
    const jsonFormat = LogUtils.detectLogFormat(jsonLog);
    const plainFormat = LogUtils.detectLogFormat(plainLog);
    
    console.log(`  📝 Format detection: JSON=${jsonFormat}, Plain=${plainFormat}`);
    
    if (jsonFormat === 'json' && plainFormat === 'plain') {
      console.log('  ✅ Format detection working correctly');
    } else {
      console.log('  ⚠️  Format detection may need adjustment');
    }
  }

  private testErrorExtraction(): void {
    const testLog = testCases[0].log;
    const errors = LogUtils.extractErrorPatterns(testLog);
    console.log(`  🚨 Error pattern extraction: Found ${errors.length} error patterns`);
    
    if (errors.length > 0) {
      console.log(`  ✅ Error extraction working (first: "${errors[0].substring(0, 50)}...")`);
    } else {
      console.log('  ⚠️  No errors found - check extraction logic');
    }
  }

  private testStackTraceExtraction(): void {
    const testLog = testCases[0].log;
    const stackTraces = LogUtils.extractStackTraces(testLog);
    console.log(`  📚 Stack trace extraction: Found ${stackTraces.length} traces`);
    
    if (stackTraces.length > 0) {
      console.log(`  ✅ Stack trace extraction working`);
    } else {
      console.log('  ⚠️  No stack traces found - check pattern matching');
    }
  }

  private testContentTruncation(): void {
    const longContent = 'a'.repeat(50000);
    const truncated = LogUtils.truncateContent(longContent, 1000);
    console.log(`  ✂️  Content truncation: ${longContent.length} → ${truncated.length} chars`);
    
    if (truncated.length < longContent.length) {
      console.log('  ✅ Content truncation working');
    } else {
      console.log('  ⚠️  Content truncation not effective');
    }
  }

  private async testFileValidation(): Promise<void> {
    // Test with package.json (should exist)
    const validFile = await LogUtils.validateFilePath('package.json');
    const invalidFile = await LogUtils.validateFilePath('nonexistent-file.log');
    
    console.log(`  📁 File validation: Valid=${validFile.valid}, Invalid=${invalidFile.valid}`);
    
    if (validFile.valid && !invalidFile.valid) {
      console.log('  ✅ File validation working correctly');
    } else {
      console.log('  ⚠️  File validation may need adjustment');
    }
  }

  private async runAnalysisTests(): Promise<void> {
    console.log('🤖 Testing AI Analysis...');
    
    if (!config.get('geminiApiKey')) {
      console.log('  ⚠️  Skipping AI tests - GEMINI_API_KEY not set');
      return;
    }

    for (const testCase of testCases.slice(0, 3)) { // Test first 3 cases to save API quota
      console.log(`  🧩 Testing: ${testCase.name}`);
      
      try {
        const startTime = Date.now();
        const analysis = await this.logAnalyzer.analyzeLogs(testCase.log, {
          logFormat: 'auto',
          contextLines: 30
        });
        const duration = Date.now() - startTime;

        const result: TestResult = {
          testName: testCase.name,
          success: true,
          duration,
          analysis,
          expectedSeverity: testCase.expectedSeverity,
          expectedErrorType: testCase.expectedErrorType
        };

        this.testResults.push(result);
        this.displayTestResult(result);

      } catch (error) {
        console.log(`    ❌ Failed: ${error}`);
        this.testResults.push({
          testName: testCase.name,
          success: false,
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          expectedSeverity: testCase.expectedSeverity,
          expectedErrorType: testCase.expectedErrorType
        });
      }
    }
  }

  private displayTestResult(result: TestResult): void {
    if (!result.analysis) return;

    console.log(`    ✅ Analysis completed in ${result.duration}ms`);
    console.log(`    🎯 Root Cause: ${result.analysis.rootCause}`);
    console.log(`    📊 Confidence: ${result.analysis.confidence}%`);
    console.log(`    ⚠️  Severity: ${result.analysis.metadata.severity} (expected: ${result.expectedSeverity})`);
    console.log(`    🏷️  Type: ${result.analysis.metadata.errorType} (expected: ${result.expectedErrorType})`);
    console.log(`    🛠️  Suggested fixes: ${result.analysis.suggestedFixes.length}`);
    console.log('');
  }

  private showSummary(): void {
    console.log('📊 Test Summary');
    console.log('===============');
    
    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const avgDuration = this.testResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / successful || 0;

    if (total === 0) {
      console.log('⏭️  Skipped: AI analysis tests not run (no API key configured)');
    } else {
      console.log(`✅ Successful tests: ${successful}/${total}`);
      console.log(`⏱️  Average analysis time: ${avgDuration.toFixed(0)}ms`);
      
      if (successful > 0) {
        const avgConfidence = this.testResults
          .filter(r => r.success && r.analysis)
          .reduce((sum, r) => sum + r.analysis!.confidence, 0) / successful;
        
        console.log(`🎯 Average confidence: ${avgConfidence.toFixed(1)}%`);
      }

      if (successful < total) {
        console.log('\n💡 Some tests failed. Check configuration and API connectivity.');
      }
    }

    console.log('\n🎉 Test suite completed!');
  }
}

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  analysis?: any;
  error?: string;
  expectedSeverity: 'low' | 'medium' | 'high' | 'critical';
  expectedErrorType: string;
}

async function main() {
  const runner = new TestRunner();
  await runner.runAllTests();
}

import { fileURLToPath } from 'url';
const isMain = process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');
if (isMain) {
  main().catch(console.error);
} 