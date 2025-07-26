# Cursor AI Integration Guide

This guide walks you through integrating the LogAnalyzer MCP Server with Cursor AI for intelligent log analysis directly in your editor.

## Prerequisites

- Cursor AI installed
- Node.js 18+ 
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Quick Setup

### 1. Install LogAnalyzer MCP Server

```bash
# Clone the repository
git clone <repository-url>
cd loganalyzer-mcp

# Install dependencies
npm install

# Set up environment
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Build the project
npm run build

# Test the installation
npm run validate
```

### 2. Configure Cursor AI

Open Cursor AI settings and add the MCP server configuration:

**Settings Location**: `Cursor > Preferences > Features > Model Context Protocol`

Add this configuration:

```json
{
  "mcpServers": {
    "loganalyzer": {
      "command": "node",
      "args": [
        "/absolute/path/to/loganalyzer-mcp/dist/src/server.js"
      ],
      "env": {
        "GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**Windows Example:**
```json
{
  "mcpServers": {
    "loganalyzer": {
      "command": "node",
      "args": [
        "C:\\Projects\\loganalyzer-mcp\\dist\\src\\server.js"
      ],
      "env": {
        "GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

**macOS/Linux Example:**
```json
{
  "mcpServers": {
    "loganalyzer": {
      "command": "node",
      "args": [
        "/Users/yourname/projects/loganalyzer-mcp/dist/src/server.js"
      ],
      "env": {
        "GEMINI_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

### 3. Restart Cursor AI

Close and reopen Cursor AI to load the MCP server configuration.

## Usage Examples

### Analyzing Log Files

1. **Open a log file** in Cursor AI
2. **Select the log content** you want to analyze
3. **Ask Cursor**: "Analyze these logs for errors"

**Example prompt:**
```
Analyze this log content for errors and provide debugging suggestions:

[Selected log content]
```

### Real-time Log Monitoring

**Ask Cursor**: "Start monitoring /var/log/app.log for new errors"

Cursor will use the `watch_log_file` tool to monitor the file and alert you to new issues.

### Getting Recent Errors

**Ask Cursor**: "Show me the last 5 errors from monitored log files"

### Advanced Analysis

**Example prompts for Cursor:**
- "What's causing the database connection timeouts in these logs?"
- "Find all authentication failures and suggest security improvements"
- "Analyze the performance bottlenecks shown in these application logs"
- "Compare error patterns between these two log files"

## Available MCP Tools

Cursor AI can use these tools through the LogAnalyzer MCP server:

### `analyze_log`
- **Purpose**: Analyze log content with AI
- **Usage**: Select log text and ask for analysis
- **Parameters**: 
  - `logText`: Log content to analyze
  - `logFormat`: Format hint (auto/json/plain)
  - `contextLines`: Context lines around errors

### `watch_log_file`
- **Purpose**: Monitor log files for new errors
- **Usage**: "Monitor [file path] for errors"
- **Parameters**:
  - `filePath`: Path to log file
  - `pollInterval`: Check interval in milliseconds

### `stop_watching`
- **Purpose**: Stop monitoring a file
- **Usage**: "Stop watching [file path]"

### `list_watched_files`
- **Purpose**: Show all monitored files
- **Usage**: "List all watched log files"

### `get_recent_errors`
- **Purpose**: Get recent error analysis
- **Usage**: "Show recent errors" or "Get last 10 errors"

## Troubleshooting

### MCP Server Not Found

**Error**: "MCP server 'loganalyzer' not found"

**Solutions**:
1. Check the file path in your configuration
2. Ensure the project is built: `npm run build`
3. Verify Node.js is in your PATH
4. Restart Cursor AI after configuration changes

### API Key Issues

**Error**: "GEMINI_API_KEY is required"

**Solutions**:
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your MCP configuration
3. Verify the key is valid and has quota remaining

### Permission Errors

**Error**: "Cannot watch file: Permission denied"

**Solutions**:
1. Check file permissions: `ls -la /path/to/logfile`
2. Run Cursor with appropriate permissions
3. Use absolute paths in file references

### Connection Timeouts

**Error**: "Failed to analyze logs: Request timeout"

**Solutions**:
1. Check internet connectivity
2. Reduce log size (large logs take longer)
3. Verify Gemini API service status

## Advanced Configuration

### Custom Environment Variables

```json
{
  "mcpServers": {
    "loganalyzer": {
      "command": "node",
      "args": ["/path/to/loganalyzer-mcp/dist/src/server.js"],
      "env": {
        "GEMINI_API_KEY": "your_key",
        "LOG_LEVEL": "debug",
        "MAX_FILE_SIZE": "20MB",
        "WATCH_INTERVAL": "500",
        "MAX_CONTEXT_TOKENS": "10000"
      }
    }
  }
}
```

### Multiple Server Instances

You can run multiple instances for different purposes:

```json
{
  "mcpServers": {
    "loganalyzer-prod": {
      "command": "node",
      "args": ["/path/to/loganalyzer-mcp/dist/src/server.js"],
      "env": {
        "GEMINI_API_KEY": "prod_key",
        "LOG_LEVEL": "error"
      }
    },
    "loganalyzer-dev": {
      "command": "node", 
      "args": ["/path/to/loganalyzer-mcp/dist/src/server.js"],
      "env": {
        "GEMINI_API_KEY": "dev_key",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

## Best Practices

### 1. Log File Selection
- Focus on error-specific logs for better analysis
- Use recent logs (last 24-48 hours) for relevance
- Avoid very large log files (>50MB) for performance

### 2. Effective Prompts
- Be specific about what you're looking for
- Include context about when issues occurred
- Ask follow-up questions based on initial analysis

### 3. Security
- Never commit API keys to version control
- Use environment variables for sensitive configuration
- Monitor API usage to avoid unexpected charges

### 4. Performance
- Use file watching for active monitoring
- Analyze smaller log sections for faster results
- Stop watching files when monitoring is no longer needed

## Example Workflow

1. **Development**: Monitor application logs while coding
   ```
   "Start watching ./logs/app.log for new errors"
   ```

2. **Debugging**: Analyze specific error scenarios
   ```
   "Analyze these database connection errors and suggest fixes"
   ```

3. **Production**: Monitor critical system logs
   ```
   "Watch /var/log/nginx/error.log and alert me to critical issues"
   ```

4. **Analysis**: Compare before/after deployment
   ```
   "Compare error patterns in these two log files from before and after deployment"
   ```

## Support

- **Issues**: Report bugs in the GitHub repository
- **Documentation**: Check the main README.md
- **Community**: Join discussions in GitHub Discussions
- **Updates**: Watch the repository for new releases

## Next Steps

- Try the example prompts above
- Experiment with different log formats
- Set up monitoring for your critical applications
- Explore advanced analysis techniques with AI assistance 