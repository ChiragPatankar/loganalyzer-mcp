#!/usr/bin/env node

// Test the rapid debugging feature
import { RapidDebugger } from './dist/src/tools/rapidDebugger.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Testing Rapid Debug - Target: Under 30 Seconds\n');

// Sample server log with multiple issues
const serverLog = `
2024-01-23 14:32:15 [INFO] Server starting up...
2024-01-23 14:32:16 [ERROR] Database connection failed: Connection timed out after 30000ms
java.sql.SQLException: Connection is not available, request timed out after 30000ms.
    at org.apache.commons.dbcp2.PoolingDataSource.getConnection(PoolingDataSource.java:154)
    at com.app.service.DatabaseService.connect(DatabaseService.java:45)
2024-01-23 14:32:17 [ERROR] Authentication failed for user 'admin' from IP 192.168.1.100
2024-01-23 14:32:18 [FATAL] OutOfMemoryError: Java heap space
java.lang.OutOfMemoryError: Java heap space
    at java.util.ArrayList.grow(ArrayList.java:275)
    at com.app.processor.DataProcessor.loadData(DataProcessor.java:123)
2024-01-23 14:32:19 [ERROR] Network timeout: Connection refused to api.external.com:443
2024-01-23 14:32:20 [ERROR] Configuration error: Unable to load /etc/app/config.yaml
2024-01-23 14:32:21 [CRITICAL] Application shutdown initiated due to critical errors
`;

async function testRapidDebug() {
  console.log('📊 Starting rapid debug analysis...');
  console.log('=====================================');
  
  try {
    const rapidDebugger = new RapidDebugger();
    const startTime = Date.now();
    
    // Test rapid debugging
    const result = await rapidDebugger.debugInUnder30Seconds(serverLog);
    const totalTime = Date.now() - startTime;
    
    console.log(`⏱️  Total Analysis Time: ${result.timeToAnalysis}ms`);
    console.log(`🎯 Target Met: ${result.timeToAnalysis < 30000 ? '✅ YES' : '❌ NO'} (under 30 seconds)`);
    console.log('\n🚨 CRITICAL ERRORS DETECTED:');
    result.criticalErrors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
    
    console.log(`\n🎯 ROOT CAUSE: ${result.rootCause}`);
    console.log(`📊 AI Confidence: ${result.confidence}%`);
    
    console.log('\n🔧 QUICK FIXES (Priority Order):');
    result.quickFixes
      .sort((a, b) => a.priority === 'high' ? -1 : 1)
      .forEach((fix, i) => {
        console.log(`  ${i + 1}. [${fix.priority.toUpperCase()}] ${fix.issue}`);
        console.log(`     Fix: ${fix.fix}`);
        if (fix.command) {
          console.log(`     Command: ${fix.command}`);
        }
        console.log(`     Time: ${fix.estimatedTime}\n`);
      });
    
    console.log('⚡ READY-TO-RUN DEBUG COMMANDS:');
    console.log('================================');
    result.debugCommands.forEach(cmd => {
      console.log(cmd);
    });
    
    console.log('\n📋 NEXT STEPS:');
    result.nextSteps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });
    
    console.log('\n🎉 RAPID DEBUG SUMMARY:');
    console.log('=======================');
    console.log(`✅ Analysis completed in ${result.timeToAnalysis}ms`);
    console.log(`✅ Found ${result.criticalErrors.length} critical issues`);
    console.log(`✅ Generated ${result.quickFixes.length} actionable fixes`);
    console.log(`✅ Provided ${result.debugCommands.length} debug commands`);
    console.log(`✅ AI confidence: ${result.confidence}%`);
    
    // Test quick scan
    console.log('\n⚡ Testing Quick Scan...');
    const quickStart = Date.now();
    const scanResult = await rapidDebugger.quickScan(serverLog);
    const scanTime = Date.now() - quickStart;
    
    console.log(`⚡ Quick scan: ${scanResult.errors} errors found in ${scanResult.time}ms`);
    console.log(`🚨 Critical status: ${scanResult.critical ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('❌ Rapid debug test failed:', error.message);
  }
}

testRapidDebug(); 