#!/usr/bin/env node

// Quick test to verify Gemini API key is working
import { LogAnalyzer } from './dist/src/tools/logAnalyzer.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Gemini API Connection...\n');

// Check if API key is set
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.error('❌ GEMINI_API_KEY not set properly in .env file');
  console.log('💡 Please edit .env file and add your real API key');
  process.exit(1);
}

console.log('✅ API key found in environment');

// Sample log for testing
const testLog = `
2024-01-23 14:32:15 [ERROR] Database connection failed
java.sql.SQLException: Connection is not available, request timed out after 30000ms.
    at org.apache.commons.dbcp2.PoolingDataSource.getConnection(PoolingDataSource.java:154)
    at com.app.service.DatabaseService.connect(DatabaseService.java:45)
2024-01-23 14:32:16 [FATAL] Application shutting down due to critical error
`;

async function testAnalysis() {
  try {
    console.log('🤖 Testing AI log analysis...');
    
    const analyzer = new LogAnalyzer();
    const startTime = Date.now();
    
    const result = await analyzer.analyzeLogs(testLog, {
      logFormat: 'auto',
      contextLines: 30
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ AI Analysis Successful!');
    console.log('==========================================');
    console.log(`🎯 Root Cause: ${result.rootCause}`);
    console.log(`📊 Confidence: ${result.confidence}%`);
    console.log(`⚠️  Severity: ${result.metadata.severity}`);
    console.log(`🏷️  Error Type: ${result.metadata.errorType}`);
    console.log(`⏱️  Analysis Time: ${duration}ms`);
    console.log(`🛠️  Suggested Fixes: ${result.suggestedFixes.length}`);
    
    if (result.suggestedFixes.length > 0) {
      console.log('\n🔧 Suggested Fixes:');
      result.suggestedFixes.forEach((fix, i) => {
        console.log(`  ${i + 1}. ${fix}`);
      });
    }
    
    console.log('\n🎉 LogAnalyzer MCP Server is ready to use!');
    console.log('\n📋 Next Steps:');
    console.log('  1. Start MCP server: npm run serve');
    console.log('  2. Integrate with Cursor AI (see docs/cursor-integration.md)');
    console.log('  3. Analyze your real log files');
    
  } catch (error) {
    console.error('\n❌ AI Analysis Failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('API_KEY')) {
      console.log('\n💡 API Key Issues:');
      console.log('  - Check if key is valid and active');
      console.log('  - Verify you have quota remaining');
      console.log('  - Get a new key from: https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('\n💡 Network Issues:');
      console.log('  - Check internet connection');
      console.log('  - Verify firewall/proxy settings');
      console.log('  - Try again in a moment');
    }
  }
}

testAnalysis(); 