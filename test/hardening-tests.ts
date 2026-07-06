import { config } from '../src/config.js';
import { LogUtils } from '../src/utils.js';
import { saveErrorLog, queryErrorLogs, resetDatabase } from '../src/db.js';
import * as fs from 'fs';
import { sampleLogs } from './sample-logs.js';

export async function runHardeningTests() {
  console.log('\n🧪 Running Hardening Unit Tests...\n');

  // 1. Test ConfigManager Degradation Behavior
  console.log('📝 Test 1: ConfigManager Degradation Behavior');
  const originalEnvKey = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    config.updateConfig({ isAiEnabled: false });
    if (config.get('isAiEnabled') === false) {
      console.log('  ✅ Configuration successfully updated and disabled AI.');
    } else {
      throw new Error('isAiEnabled did not toggle correctly');
    }
  } finally {
    process.env.GEMINI_API_KEY = originalEnvKey;
    config.updateConfig({ isAiEnabled: !!originalEnvKey });
  }

  // 2. Test JSON extraction fallback chain
  console.log('📝 Test 2: JSON Extraction Balanced-Brace Fallback');
  const validJson = '{ "rootCause": "Test Database connection down", "confidence": 90, "suggestedFixes": ["Restart"], "relatedErrors": [], "followUpQuestions": [], "metadata": { "errorType": "database", "severity": "critical" } }';
  
  const nestedBraceText = `Some conversational text { "ignored": { "yes": false } } and then another valid JSON: ${validJson} trailing comment`;
  const parsedObj = LogUtils.extractBalancedJson(nestedBraceText);
  if (parsedObj && parsedObj.rootCause === 'Test Database connection down') {
    console.log('  ✅ Successfully extracted balanced-brace JSON despite leading garbage/nested braces.');
  } else {
    throw new Error('Balanced-brace JSON extraction failed.');
  }

  // 3. Test Retry/Backoff Logic
  console.log('📝 Test 3: Exponential Backoff Retry Logic');
  let calls = 0;
  const mockFn = async () => {
    calls++;
    if (calls < 3) {
      const rateLimitError = new Error('Resource exhausted (Rate Limit reached)');
      (rateLimitError as any).status = 429;
      throw rateLimitError;
    }
    return 'Success';
  };

  const startTime = Date.now();
  const retryResult = await LogUtils.withRetry(mockFn, 3, 10);
  const elapsed = Date.now() - startTime;
  if (retryResult === 'Success' && calls === 3) {
    console.log(`  ✅ Successfully retried and succeeded after 3 attempts in ${elapsed}ms.`);
  } else {
    throw new Error(`Retry logic failed. result=${retryResult}, calls=${calls}`);
  }

  console.log('📝 Test 3b: Non-retryable Errors exit immediately');
  let nonRetryableCalls = 0;
  const mockAuthFail = async () => {
    nonRetryableCalls++;
    const authError = new Error('API key invalid');
    (authError as any).status = 403;
    throw authError;
  };
  try {
    await LogUtils.withRetry(mockAuthFail, 3, 10);
    throw new Error('Auth failure was retried but should have thrown immediately');
  } catch (err: any) {
    if (nonRetryableCalls === 1) {
      console.log('  ✅ Threw immediately without retrying non-retryable 403 error.');
    } else {
      throw new Error(`Expected 1 call, got ${nonRetryableCalls}`);
    }
  }

  // 4. Test SQLite Persistence Layer
  console.log('📝 Test 4: SQLite Database Persistence');
  const testDbFile = 'test-loganalyzer.db';
  
  // Close any existing connection and delete test db file
  resetDatabase();
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
  }
  
  // Save current config database path
  const originalDbPath = config.get('dbPath');
  config.updateConfig({ dbPath: testDbFile });
  
  try {
    // Insert mock error log
    const testLog = {
      filePath: 'test.log',
      rootCause: 'Database connection failed',
      confidence: 85,
      suggestedFixes: ['Restart PostgreSQL'],
      relatedErrors: ['ETIMEDOUT'],
      followUpQuestions: [],
      errorType: 'database',
      severity: 'high' as const,
      timestamp: new Date(),
      lineNumbers: [15],
      stackTrace: 'at connect (db.js:12)',
      provider_status: 'ai_enhanced' as const
    };
    
    const rowId = saveErrorLog(testLog);
    if (rowId > 0) {
      console.log(`  ✅ Inserted error log into SQLite with Row ID: ${rowId}`);
    } else {
      throw new Error('Insert failed.');
    }

    // Query mock error log
    const queryResults = queryErrorLogs({ filePath: 'test.log' });
    if (queryResults.length === 1 && queryResults[0].rootCause === 'Database connection failed') {
      console.log('  ✅ Successfully queried error log from SQLite.');
    } else {
      throw new Error(`Query returned incorrect results. Count: ${queryResults.length}`);
    }

    // Query filter by severity
    const criticalResults = queryErrorLogs({ severity: 'critical' });
    const highResults = queryErrorLogs({ severity: 'high' });
    if (criticalResults.length === 0 && highResults.length === 1) {
      console.log('  ✅ SQLite filters for severity work correctly.');
    } else {
      throw new Error('Severity filtering failed.');
    }

  } finally {
    // Reset database and clean up file
    resetDatabase();
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
    // Restore dbPath config
    config.updateConfig({ dbPath: originalDbPath });
  }

  // 5. Test Multi-Language Stack Trace Matching
  console.log('📝 Test 5: Multi-Language Stack Trace Parsing');
  const nodeTraces = LogUtils.extractStackTraces(sampleLogs.stackTraceFixtures.node);
  if (nodeTraces.length === 3 && 
      nodeTraces[0].file === 'src/app.ts' && 
      nodeTraces[0].line === 25 && 
      nodeTraces[0].function === 'handleRequest') {
    console.log('  ✅ Node/V8 stack traces parsed successfully with exact fields.');
  } else {
    throw new Error(`Node/V8 stack trace parsing failed: ${JSON.stringify(nodeTraces)}`);
  }

  const javaTraces = LogUtils.extractStackTraces(sampleLogs.stackTraceFixtures.java);
  if (javaTraces.length === 2 && 
      javaTraces[0].file === 'MyClass.java' && 
      javaTraces[0].line === 82 && 
      javaTraces[0].function === 'com.example.MyClass.execute') {
    console.log('  ✅ Java stack traces parsed successfully with exact fields.');
  } else {
    throw new Error(`Java stack trace parsing failed: ${JSON.stringify(javaTraces)}`);
  }

  const pythonTraces = LogUtils.extractStackTraces(sampleLogs.stackTraceFixtures.python);
  if (pythonTraces.length === 2 && 
      pythonTraces[0].file === 'src/main.py' && 
      pythonTraces[0].line === 45 && 
      pythonTraces[0].function === 'run_app') {
    console.log('  ✅ Python stack traces parsed successfully with exact fields.');
  } else {
    throw new Error(`Python stack trace parsing failed: ${JSON.stringify(pythonTraces)}`);
  }
  
  console.log('\n🎉 All Hardening Unit Tests Passed!\n');
}

// Run if called directly
import { fileURLToPath } from 'url';
const isMain = process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');
if (isMain) {
  runHardeningTests().catch((err) => {
    console.error('❌ Hardening unit tests failed:', err);
    process.exit(1);
  });
}
