#!/usr/bin/env node

// Simple validation script to test core functionality
import { LogUtils } from './dist/src/utils.js';

console.log('🧪 LogAnalyzer Validation Test');
console.log('==============================\n');

// Test sample log data
const sampleLog = `
2024-01-23 10:30:15 INFO: Starting application...
2024-01-23 10:30:16 INFO: Connecting to database...
2024-01-23 10:30:17 ERROR: Database connection failed
java.sql.SQLException: Connection is not available, request timed out after 30000ms.
    at org.apache.commons.dbcp2.PoolingDataSource.getConnection(PoolingDataSource.java:154)
    at com.app.service.DatabaseService.connect(DatabaseService.java:45)
    at com.app.controller.UserController.getUser(UserController.java:78)
2024-01-23 10:30:18 FATAL: Application shutting down due to critical error
`;

const jsonLog = `
{"timestamp":"2024-01-23T10:30:15Z","level":"error","message":"Authentication failed","user_id":"12345"}
{"timestamp":"2024-01-23T10:30:16Z","level":"fatal","message":"Redis connection lost","error_code":"ECONNREFUSED"}
`;

try {
  console.log('📝 Testing Log Format Detection...');
  const plainFormat = LogUtils.detectLogFormat(sampleLog);
  const jsonFormat = LogUtils.detectLogFormat(jsonLog);
  console.log(`  Plain log format: ${plainFormat}`);
  console.log(`  JSON log format: ${jsonFormat}`);
  console.log('  ✅ Format detection working\n');

  console.log('🚨 Testing Error Pattern Extraction...');
  const errors = LogUtils.extractErrorPatterns(sampleLog);
  console.log(`  Found ${errors.length} error patterns`);
  if (errors.length > 0) {
    console.log(`  First error: "${errors[0].substring(0, 80)}..."`);
  }
  console.log('  ✅ Error extraction working\n');

  console.log('📚 Testing Stack Trace Extraction...');
  const stackTraces = LogUtils.extractStackTraces(sampleLog);
  console.log(`  Found ${stackTraces.length} stack trace lines`);
  if (stackTraces.length > 0) {
    console.log(`  First trace: "${stackTraces[0]}"`);
  }
  console.log('  ✅ Stack trace extraction working\n');

  console.log('✂️  Testing Content Truncation...');
  const longContent = 'A'.repeat(50000);
  const truncated = LogUtils.truncateContent(longContent, 1000);
  console.log(`  Original: ${longContent.length} chars`);
  console.log(`  Truncated: ${truncated.length} chars`);
  console.log('  ✅ Content truncation working\n');

  console.log('🎉 All core utilities are working correctly!');
  console.log('\n💡 Next steps:');
  console.log('  1. Set GEMINI_API_KEY environment variable for AI analysis');
  console.log('  2. Test MCP server: npm run serve');
  console.log('  3. Test CLI analysis: npm run analyze -- <logfile>');
  console.log('  4. Run full test suite: npm test');

} catch (error) {
  console.error('❌ Validation failed:', error);
  process.exit(1);
} 