# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S loganalyzer -u 1001

# Change ownership of the app directory
RUN chown -R loganalyzer:nodejs /app
USER loganalyzer

# Expose the server port (if we add HTTP API later)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Server healthy')" || exit 1

# Set default environment
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Default command - run the MCP server
CMD ["node", "dist/src/server.js"]

# Labels for metadata
LABEL name="loganalyzer-mcp" \
      version="1.0.0" \
      description="AI-powered log analysis MCP server" \
      maintainer="LogAnalyzer Team" 