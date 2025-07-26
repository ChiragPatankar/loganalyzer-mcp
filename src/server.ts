#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { LogAnalyzer } from './tools/logAnalyzer.js';
import { FileWatcher } from './tools/fileWatcher.js';
import { RapidDebugger } from './tools/rapidDebugger.js';
import { MCPToolResult } from './types.js';

class LogAnalyzerMCPServer {
  private server: Server;
  private logAnalyzer: LogAnalyzer;
  private fileWatcher: FileWatcher;
  private rapidDebugger: RapidDebugger;

  constructor() {
    this.server = new Server(
      {
        name: 'loganalyzer-mcp',
        version: '1.0.0',
        description: 'AI-powered log analysis MCP server with rapid debugging - debug server logs in under 30 seconds'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          logging: {}
        }
      }
    );

    this.logAnalyzer = new LogAnalyzer();
    this.fileWatcher = new FileWatcher();
    this.rapidDebugger = new RapidDebugger();

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'rapid_debug',
            description: '🚀 DEBUG SERVER LOGS IN UNDER 30 SECONDS - Instant analysis with actionable fixes and debug commands',
            inputSchema: {
              type: 'object',
              properties: {
                logText: {
                  type: 'string',
                  description: 'Log content to rapidly analyze and debug'
                }
              },
              required: ['logText']
            }
          },
          {
            name: 'quick_scan',
            description: '⚡ Ultra-fast log scan for real-time monitoring (< 1 second)',
            inputSchema: {
              type: 'object',
              properties: {
                logText: {
                  type: 'string',
                  description: 'Log content for quick error detection'
                }
              },
              required: ['logText']
            }
          },
          {
            name: 'analyze_log',
            description: 'Analyze error logs and provide root cause analysis with AI-powered insights',
            inputSchema: {
              type: 'object',
              properties: {
                logText: {
                  type: 'string',
                  description: 'Log content to analyze'
                },
                logFormat: {
                  type: 'string',
                  enum: ['auto', 'json', 'plain'],
                  default: 'auto',
                  description: 'Format of the log content'
                },
                contextLines: {
                  type: 'number',
                  default: 50,
                  description: 'Number of context lines to include around errors'
                }
              },
              required: ['logText']
            }
          },
          {
            name: 'watch_log_file',
            description: 'Start monitoring a log file for real-time error detection',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the log file to monitor'
                },
                pollInterval: {
                  type: 'number',
                  default: 1000,
                  description: 'Polling interval in milliseconds'
                }
              },
              required: ['filePath']
            }
          },
          {
            name: 'stop_watching',
            description: 'Stop monitoring a specific log file',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the log file to stop monitoring'
                }
              },
              required: ['filePath']
            }
          },
          {
            name: 'list_watched_files',
            description: 'List all currently monitored log files',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_recent_errors',
            description: 'Get recent error analysis from monitored files',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Optional: specific file path to get errors from'
                },
                limit: {
                  type: 'number',
                  default: 10,
                  description: 'Maximum number of recent errors to return'
                }
              }
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: MCPToolResult;

        switch (name) {
          case 'rapid_debug':
            result = await this.handleRapidDebug(args);
            break;
          case 'quick_scan':
            result = await this.handleQuickScan(args);
            break;
          case 'analyze_log':
            result = await this.handleAnalyzeLog(args);
            break;
          case 'watch_log_file':
            result = await this.handleWatchLogFile(args);
            break;
          case 'stop_watching':
            result = await this.handleStopWatching(args);
            break;
          case 'list_watched_files':
            result = await this.handleListWatchedFiles(args);
            break;
          case 'get_recent_errors':
            result = await this.handleGetRecentErrors(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'loganalyzer://rapid-debug',
            name: 'Rapid Debug Results',
            description: 'Latest rapid debugging analysis with quick fixes'
          },
          {
            uri: 'loganalyzer://recent-errors',
            name: 'Recent Error Analysis',
            description: 'Latest analyzed errors from all monitored files'
          },
          {
            uri: 'loganalyzer://watched-files',
            name: 'Watched Files Status',
            description: 'Status of all currently monitored log files'
          }
        ]
      };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'loganalyzer://rapid-debug':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  message: 'Use rapid_debug tool for instant server log debugging',
                  features: [
                    'Debug in under 30 seconds',
                    'Instant error classification',
                    'Ready-to-run debug commands',
                    'Prioritized quick fixes'
                  ]
                }, null, 2)
              }
            ]
          };
        case 'loganalyzer://recent-errors':
          const recentErrors = await this.fileWatcher.getRecentErrors();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(recentErrors, null, 2)
              }
            ]
          };
        case 'loganalyzer://watched-files':
          const watchedFiles = await this.fileWatcher.listWatchedFiles();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(watchedFiles, null, 2)
              }
            ]
          };
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  private async handleRapidDebug(args: any): Promise<MCPToolResult> {
    const { logText } = args;

    if (!logText || typeof logText !== 'string') {
      throw new Error('logText is required and must be a string');
    }

    const startTime = Date.now();
    const debugResult = await this.rapidDebugger.debugInUnder30Seconds(logText);
    const totalTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        ...debugResult,
        totalProcessingTime: totalTime,
        message: `🚀 Server debugging completed in ${debugResult.timeToAnalysis}ms`,
        under30Seconds: debugResult.timeToAnalysis < 30000
      },
      metadata: {
        processedAt: new Date(),
        logLength: logText.length,
        debugMode: 'rapid'
      }
    };
  }

  private async handleQuickScan(args: any): Promise<MCPToolResult> {
    const { logText } = args;

    if (!logText || typeof logText !== 'string') {
      throw new Error('logText is required and must be a string');
    }

    const scanResult = await this.rapidDebugger.quickScan(logText);

    return {
      success: true,
      data: {
        ...scanResult,
        message: `⚡ Quick scan completed in ${scanResult.time}ms`
      },
      metadata: {
        processedAt: new Date(),
        scanMode: 'quick'
      }
    };
  }

  private async handleAnalyzeLog(args: any): Promise<MCPToolResult> {
    const { logText, logFormat = 'auto', contextLines = 50 } = args;

    if (!logText || typeof logText !== 'string') {
      throw new Error('logText is required and must be a string');
    }

    const analysis = await this.logAnalyzer.analyzeLogs(logText, {
      logFormat,
      contextLines
    });

    return {
      success: true,
      data: analysis,
      metadata: {
        processedAt: new Date(),
        logLength: logText.length,
        format: logFormat
      }
    };
  }

  private async handleWatchLogFile(args: any): Promise<MCPToolResult> {
    const { filePath, pollInterval = 1000 } = args;

    if (!filePath || typeof filePath !== 'string') {
      throw new Error('filePath is required and must be a string');
    }

    await this.fileWatcher.watchLogFile(filePath, { pollInterval });

    return {
      success: true,
      data: {
        message: `Started watching ${filePath}`,
        filePath,
        pollInterval
      }
    };
  }

  private async handleStopWatching(args: any): Promise<MCPToolResult> {
    const { filePath } = args;

    if (!filePath || typeof filePath !== 'string') {
      throw new Error('filePath is required and must be a string');
    }

    await this.fileWatcher.stopWatching(filePath);

    return {
      success: true,
      data: {
        message: `Stopped watching ${filePath}`,
        filePath
      }
    };
  }

  private async handleListWatchedFiles(args: any): Promise<MCPToolResult> {
    const watchedFiles = await this.fileWatcher.listWatchedFiles();

    return {
      success: true,
      data: watchedFiles
    };
  }

  private async handleGetRecentErrors(args: any): Promise<MCPToolResult> {
    const { filePath, limit = 10 } = args;

    const recentErrors = await this.fileWatcher.getRecentErrors(filePath, limit);

    return {
      success: true,
      data: recentErrors
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LogAnalyzer MCP Server started successfully - Debug server logs in under 30 seconds!');
  }
}

// Start the server
async function main() {
  const server = new LogAnalyzerMCPServer();
  await server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} 