#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
class LogAnalyzerCLI {
    client;
    transport = null;
    constructor() {
        this.client = new Client({
            name: 'loganalyzer-cli',
            version: '1.0.0'
        }, {
            capabilities: {}
        });
    }
    async connectToServer() {
        try {
            // Start the MCP server process
            const serverPath = path.join(process.cwd(), 'dist', 'server.js');
            const serverProcess = spawn('node', [serverPath], {
                stdio: ['pipe', 'pipe', 'inherit']
            });
            // Create transport using the server process
            this.transport = new StdioClientTransport({
                reader: serverProcess.stdout,
                writer: serverProcess.stdin
            });
            await this.client.connect(this.transport);
            console.log('✅ Connected to LogAnalyzer MCP Server');
        }
        catch (error) {
            console.error('❌ Failed to connect to server:', error);
            process.exit(1);
        }
    }
    async analyzeFile(filePath) {
        try {
            // Validate file exists
            await fs.access(filePath);
            // Read file content
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`📖 Analyzing log file: ${filePath}`);
            console.log(`📊 File size: ${(content.length / 1024).toFixed(2)} KB`);
            // Call analyze_log tool
            const result = await this.client.request({
                method: 'tools/call',
                params: {
                    name: 'analyze_log',
                    arguments: {
                        logText: content,
                        logFormat: 'auto',
                        contextLines: 50
                    }
                }
            }, {});
            this.displayAnalysisResult(result);
        }
        catch (error) {
            console.error('❌ Failed to analyze file:', error);
        }
    }
    async watchFile(filePath, pollInterval = 1000) {
        try {
            console.log(`👀 Starting to watch: ${filePath}`);
            console.log(`⏱️  Poll interval: ${pollInterval}ms`);
            // Start watching the file
            const result = await this.client.request({
                method: 'tools/call',
                params: {
                    name: 'watch_log_file',
                    arguments: {
                        filePath,
                        pollInterval
                    }
                }
            }, {});
            console.log('✅ File watching started successfully');
            this.displayResult(result);
            // Keep the process alive and check for new errors periodically
            console.log('\n🔄 Monitoring for new errors... (Press Ctrl+C to stop)');
            const checkInterval = setInterval(async () => {
                try {
                    const errorsResult = await this.client.request({
                        method: 'tools/call',
                        params: {
                            name: 'get_recent_errors',
                            arguments: {
                                filePath,
                                limit: 5
                            }
                        }
                    });
                    const data = JSON.parse(errorsResult.content[0].text);
                    if (data.success && data.data.length > 0) {
                        console.log('\n🚨 New errors detected:');
                        this.displayRecentErrors(data.data);
                    }
                }
                catch (error) {
                    console.error('Error checking for new errors:', error);
                }
            }, pollInterval * 2);
            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                clearInterval(checkInterval);
                console.log('\n🛑 Stopping file watcher...');
                try {
                    await this.client.request({
                        method: 'tools/call',
                        params: {
                            name: 'stop_watching',
                            arguments: { filePath }
                        }
                    });
                    console.log('✅ File watcher stopped');
                }
                catch (error) {
                    console.error('Error stopping watcher:', error);
                }
                process.exit(0);
            });
        }
        catch (error) {
            console.error('❌ Failed to watch file:', error);
        }
    }
    async listWatchedFiles() {
        try {
            const result = await this.client.request({
                method: 'tools/call',
                params: {
                    name: 'list_watched_files',
                    arguments: {}
                }
            });
            const data = JSON.parse(result.content[0].text);
            if (data.success && data.data.length > 0) {
                console.log('📋 Currently watched files:');
                for (const file of data.data) {
                    console.log(`  📁 ${file.filePath}`);
                    console.log(`     Errors: ${file.totalErrors}, Last update: ${new Date(file.lastUpdate).toLocaleString()}`);
                }
            }
            else {
                console.log('📋 No files are currently being watched');
            }
        }
        catch (error) {
            console.error('❌ Failed to list watched files:', error);
        }
    }
    async getRecentErrors(limit = 10) {
        try {
            const result = await this.client.request({
                method: 'tools/call',
                params: {
                    name: 'get_recent_errors',
                    arguments: { limit }
                }
            });
            const data = JSON.parse(result.content[0].text);
            if (data.success && data.data.length > 0) {
                console.log(`📊 Recent errors (last ${limit}):`);
                this.displayRecentErrors(data.data);
            }
            else {
                console.log('✅ No recent errors found');
            }
        }
        catch (error) {
            console.error('❌ Failed to get recent errors:', error);
        }
    }
    displayAnalysisResult(result) {
        try {
            const data = JSON.parse(result.content[0].text);
            if (!data.success) {
                console.error('❌ Analysis failed:', data.error);
                return;
            }
            const analysis = data.data;
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
            console.log(`\n⏰ Analysis completed at: ${new Date(analysis.metadata.timestamp).toLocaleString()}`);
        }
        catch (error) {
            console.error('❌ Failed to parse analysis result:', error);
        }
    }
    displayRecentErrors(errors) {
        errors.forEach((error, index) => {
            console.log(`\n  ${index + 1}. ${error.rootCause} (${error.confidence}% confidence)`);
            console.log(`     Severity: ${error.metadata.severity}, Type: ${error.metadata.errorType}`);
            console.log(`     Time: ${new Date(error.metadata.timestamp).toLocaleString()}`);
        });
    }
    displayResult(result) {
        try {
            const data = JSON.parse(result.content[0].text);
            if (data.success) {
                console.log('✅ Success:', data.data.message || 'Operation completed');
            }
            else {
                console.error('❌ Error:', data.error);
            }
        }
        catch (error) {
            console.error('❌ Failed to parse result:', error);
        }
    }
    async interactive() {
        console.log('🎮 Interactive Mode - LogAnalyzer CLI');
        console.log('Commands: analyze <file>, watch <file>, list, recent [limit], quit');
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const askQuestion = (question) => {
            return new Promise((resolve) => {
                rl.question(question, resolve);
            });
        };
        while (true) {
            try {
                const input = await askQuestion('\n> ');
                const [command, ...args] = input.trim().split(' ');
                switch (command.toLowerCase()) {
                    case 'analyze':
                        if (args.length === 0) {
                            console.log('Usage: analyze <file-path>');
                            break;
                        }
                        await this.analyzeFile(args[0]);
                        break;
                    case 'watch':
                        if (args.length === 0) {
                            console.log('Usage: watch <file-path> [poll-interval-ms]');
                            break;
                        }
                        const interval = args[1] ? parseInt(args[1]) : 1000;
                        await this.watchFile(args[0], interval);
                        break;
                    case 'list':
                        await this.listWatchedFiles();
                        break;
                    case 'recent':
                        const limit = args[0] ? parseInt(args[0]) : 10;
                        await this.getRecentErrors(limit);
                        break;
                    case 'quit':
                    case 'exit':
                        console.log('👋 Goodbye!');
                        rl.close();
                        return;
                    case 'help':
                        console.log('Available commands:');
                        console.log('  analyze <file>     - Analyze a log file');
                        console.log('  watch <file> [ms]  - Watch a file for changes');
                        console.log('  list               - List watched files');
                        console.log('  recent [limit]     - Show recent errors');
                        console.log('  quit               - Exit interactive mode');
                        break;
                    default:
                        console.log('Unknown command. Type "help" for available commands.');
                }
            }
            catch (error) {
                console.error('Error:', error);
            }
        }
    }
    async disconnect() {
        if (this.transport) {
            await this.transport.close();
        }
    }
}
// CLI Entry point
async function main() {
    const args = process.argv.slice(2);
    const cli = new LogAnalyzerCLI();
    try {
        await cli.connectToServer();
        if (args.length === 0) {
            // Interactive mode
            await cli.interactive();
        }
        else {
            const command = args[0];
            switch (command) {
                case 'analyze':
                    if (args.length < 2) {
                        console.error('Usage: npm run analyze -- analyze <file-path>');
                        process.exit(1);
                    }
                    await cli.analyzeFile(args[1]);
                    break;
                case 'watch':
                    if (args.length < 2) {
                        console.error('Usage: npm run analyze -- watch <file-path> [poll-interval]');
                        process.exit(1);
                    }
                    const interval = args[2] ? parseInt(args[2]) : 1000;
                    await cli.watchFile(args[1], interval);
                    break;
                case 'list':
                    await cli.listWatchedFiles();
                    break;
                case 'recent':
                    const limit = args[1] ? parseInt(args[1]) : 10;
                    await cli.getRecentErrors(limit);
                    break;
                default:
                    console.error('Unknown command. Available: analyze, watch, list, recent');
                    process.exit(1);
            }
        }
    }
    catch (error) {
        console.error('CLI Error:', error);
        process.exit(1);
    }
    finally {
        await cli.disconnect();
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
//# sourceMappingURL=client.js.map