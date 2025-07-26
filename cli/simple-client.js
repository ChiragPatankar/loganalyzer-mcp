#!/usr/bin/env node
import * as fs from 'fs/promises';
import { LogAnalyzer } from '../src/tools/logAnalyzer.js';
import { LogUtils } from '../src/utils.js';
class SimpleLogAnalyzerCLI {
    logAnalyzer;
    constructor() {
        this.logAnalyzer = new LogAnalyzer();
    }
    async analyzeFile(filePath) {
        try {
            console.log(`📖 Analyzing log file: ${filePath}`);
            // Validate file exists
            await fs.access(filePath);
            // Read file content
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`📊 File size: ${(content.length / 1024).toFixed(2)} KB`);
            // Analyze the logs
            const analysis = await this.logAnalyzer.analyzeLogs(content, {
                logFormat: 'auto',
                contextLines: 50
            });
            this.displayAnalysisResult(analysis);
        }
        catch (error) {
            console.error('❌ Failed to analyze file:', error);
        }
    }
    displayAnalysisResult(analysis) {
        console.log('\n📋 ANALYSIS RESULTS');
        console.log('==================');
        console.log(`🎯 Root Cause: ${analysis.rootCause}`);
        console.log(`📊 Confidence: ${analysis.confidence}%`);
        console.log(`⚠️  Severity: ${analysis.metadata.severity.toUpperCase()}`);
        console.log(`🏷️  Error Type: ${analysis.metadata.errorType}`);
        if (analysis.suggestedFixes.length > 0) {
            console.log('\n🛠️  SUGGESTED FIXES:');
            analysis.suggestedFixes.forEach((fix, index) => {
                console.log(`  ${index + 1}. ${fix}`);
            });
        }
        if (analysis.relatedErrors.length > 0) {
            console.log('\n🔗 RELATED ERRORS:');
            analysis.relatedErrors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        if (analysis.followUpQuestions.length > 0) {
            console.log('\n❓ FOLLOW-UP QUESTIONS:');
            analysis.followUpQuestions.forEach((question, index) => {
                console.log(`  ${index + 1}. ${question}`);
            });
        }
        if (analysis.metadata.stackTrace) {
            console.log('\n📚 STACK TRACE:');
            console.log(analysis.metadata.stackTrace);
        }
        console.log(`\n⏰ Analysis completed at: ${new Date().toLocaleString()}`);
    }
    async testLogProcessing(sampleLog) {
        console.log('🧪 Testing log processing capabilities...\n');
        // Test format detection
        const format = LogUtils.detectLogFormat(sampleLog);
        console.log(`🔍 Detected format: ${format}`);
        // Test error pattern extraction
        const errorPatterns = LogUtils.extractErrorPatterns(sampleLog);
        console.log(`🚨 Found ${errorPatterns.length} error patterns`);
        // Test stack trace extraction
        const stackTraces = LogUtils.extractStackTraces(sampleLog);
        console.log(`📚 Found ${stackTraces.length} stack traces`);
        // Test content truncation
        const truncated = LogUtils.truncateContent(sampleLog, 1000);
        console.log(`✂️  Truncated content: ${truncated.length} characters`);
        console.log('\n✅ Log processing test completed');
    }
}
// CLI Entry point
async function main() {
    const args = process.argv.slice(2);
    const cli = new SimpleLogAnalyzerCLI();
    if (args.length === 0) {
        console.log('📖 Simple LogAnalyzer CLI');
        console.log('Usage:');
        console.log('  npm run analyze -- <file-path>     - Analyze a log file');
        console.log('  npm run analyze -- test            - Run processing tests');
        console.log('\nExample:');
        console.log('  npm run analyze -- /var/log/app.log');
        return;
    }
    const command = args[0];
    if (command === 'test') {
        const sampleLog = `
2024-01-23 10:30:15 ERROR: Database connection failed
java.sql.SQLException: Connection is not available, request timed out after 30000ms.
    at org.apache.commons.dbcp2.PoolingDataSource.getConnection(PoolingDataSource.java:154)
    at com.app.service.DatabaseService.connect(DatabaseService.java:45)
    at com.app.controller.UserController.getUser(UserController.java:78)
2024-01-23 10:30:16 FATAL: Application shutting down due to critical error
2024-01-23 10:30:17 ERROR: Failed to save user data
    `;
        await cli.testLogProcessing(sampleLog);
    }
    else {
        // Treat first argument as file path
        await cli.analyzeFile(command);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
//# sourceMappingURL=simple-client.js.map