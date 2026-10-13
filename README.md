# LogAnalyzer MCP Server

**AI-powered log analysis for your editor.** Paste a log or point at a log file, and get the root cause, prioritized fixes, and ready-to-run debug commands, right inside Claude, Cursor, or any other MCP client.

[![npm version](https://img.shields.io/npm/v/loganalyzer-mcp)](https://www.npmjs.com/package/loganalyzer-mcp)
[![npm downloads](https://img.shields.io/npm/dt/loganalyzer-mcp)](https://www.npmjs.com/package/loganalyzer-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org/)

## Features

- **Root-cause analysis**: an LLM (Google Gemini or Anthropic Claude) reads your logs and explains what went wrong, with a confidence score.
- **Actionable fixes**: prioritized suggestions plus copy-paste debug commands.
- **Live monitoring**: watch log files and catch new errors as they're written.
- **Stack trace parsing**: Node/V8, Java, and Python traces are parsed into structured fields.
- **Error history**: every analysis is saved to a local SQLite database you can query by file, severity, and date.
- **Works without an API key**: with no key, the server still runs and falls back to local pattern matching.

## Quick start

You need **Node.js 18+** and, for AI analysis, an API key from [Google AI Studio](https://aistudio.google.com/apikey) or the [Anthropic Console](https://console.anthropic.com/).

### Claude Code

```bash
claude mcp add loganalyzer -e LLM_PROVIDER=anthropic -e ANTHROPIC_API_KEY=your_key -- npx -y loganalyzer-mcp
```

### Claude Desktop, Cursor, and other MCP clients

Add this to your client's MCP config (`claude_desktop_config.json` for Claude Desktop, `~/.cursor/mcp.json` for Cursor):

```json
{
  "mcpServers": {
    "loganalyzer": {
      "command": "npx",
      "args": ["-y", "loganalyzer-mcp"],
      "env": {
        "GEMINI_API_KEY": "your_gemini_api_key"
      }
    }
  }
}
```

To use Claude instead of Gemini, replace the `env` block with:

```json
"env": {
  "LLM_PROVIDER": "anthropic",
  "ANTHROPIC_API_KEY": "your_anthropic_api_key"
}
```

Prefer a global install? Run `npm install -g loganalyzer-mcp` and use `"command": "loganalyzer-mcp"` with no `args`.

Restart your client, then try asking:

```
Debug these logs and tell me how to fix them: <paste logs>
Start watching /var/log/app.log for errors
Show me all critical errors from the last 24 hours
```

## Tools

| Tool | What it does | Parameters |
|------|--------------|------------|
| `rapid_debug` | Fast triage: root cause, prioritized fixes, and debug commands | `logText` |
| `analyze_log` | Deeper AI analysis with surrounding context | `logText`, `logFormat` (`auto` \| `json` \| `plain`), `contextLines` |
| `quick_scan` | Local error detection in milliseconds, with no AI call | `logText` |
| `watch_log_file` | Start monitoring a file for new errors | `filePath`, `pollInterval` |
| `stop_watching` | Stop monitoring a file | `filePath` |
| `list_watched_files` | List files being monitored | none |
| `get_recent_errors` | Recent errors from monitored files | `filePath`, `limit` |
| `get_error_history` | Query saved errors with filtering and pagination | `filePath`, `severity` (`low` \| `medium` \| `high` \| `critical`), `since`, `until`, `limit`, `offset` |

The server also exposes three MCP resources: `loganalyzer://rapid-debug`, `loganalyzer://recent-errors`, and `loganalyzer://watched-files`.

## Configuration

All settings are environment variables, set in your MCP client's `env` block or in a `.env` file.

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | `gemini` or `anthropic` | `gemini` |
| `GEMINI_API_KEY` | Required when `LLM_PROVIDER=gemini` | none |
| `ANTHROPIC_API_KEY` | Required when `LLM_PROVIDER=anthropic` | none |
| `LLM_MODEL` | Override the model for the selected provider | `gemini-2.5-flash` / `claude-sonnet-5-5` |
| `DB_PATH` | Where the SQLite error history is stored | `~/.loganalyzer/loganalyzer.db` |

**No API key?** The server still starts. It logs a warning to stderr, disables AI analysis, and the tools keep working with local pattern matching, file watching, and history.

## Troubleshooting

- **The server exits right away when I run it in a terminal.** That's expected. MCP servers talk over stdin/stdout and are started by your MCP client, not run by hand.
- **Analysis says "AI analysis disabled".** No API key matches `LLM_PROVIDER`. Check that the key is in your client's `env` block and restart the client.
- **Model not found errors.** Your key may not have access to the default model. Set `LLM_MODEL` to one it does.
- **Install fails while building `better-sqlite3`.** It's a native module. Make sure you're on a current Node.js LTS release; prebuilt binaries are downloaded for most platforms.
- **File watching doesn't pick anything up.** Use an absolute path and check that the file is readable by the user your MCP client runs as.

## Development

```bash
git clone https://github.com/ChiragPatankar/loganalyzer-mcp.git
cd loganalyzer-mcp
npm ci
npm run build
npm test
```

`npm run dev` runs the server from source and `npm run analyze <logfile>` runs a quick CLI analysis. To test with an MCP client, point it at `node /absolute/path/to/loganalyzer-mcp/dist/src/server.js`.

More guides:

- [Cursor integration](docs/cursor-integration.md)
- [Example usage](examples/sample-usage.md)
- [Hardening notes](docs/hardening.md)
- [Changelog](CHANGELOG.md)

## Contributing

Issues and pull requests are welcome. Please run `npm run build && npm test` before opening a PR, and [open an issue](https://github.com/ChiragPatankar/loganalyzer-mcp/issues) first for larger changes.

## License

[MIT](LICENSE) © Chirag Patankar
