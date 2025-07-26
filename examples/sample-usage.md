# LogAnalyzer Usage Examples

This document provides practical examples of using the LogAnalyzer MCP Server for different log analysis scenarios.

## Scenario 1: Web Application Error Analysis

### Sample Log
```
2024-01-23 14:32:15 [ERROR] 500 Internal Server Error: /api/users/12345
2024-01-23 14:32:15 [ERROR] Database connection timeout after 30s
2024-01-23 14:32:15 [ERROR] Stack trace:
  at DatabaseService.connect (db.js:45)
  at UserController.getUser (users.js:78)
  at Router.handle (express.js:234)
2024-01-23 14:32:16 [WARN] High memory usage: 89% (threshold: 80%)
2024-01-23 14:32:17 [ERROR] Redis connection lost: ECONNREFUSED
```

### Cursor AI Prompt
```
Analyze this web application error log and help me understand:
1. What's the root cause of the 500 errors?
2. Are the database timeout and Redis connection issues related?
3. What steps should I take to fix these issues?

[Paste log content above]
```

### Expected Analysis Output
- **Root Cause**: Database connection timeouts leading to cascading failures
- **Severity**: High (impacts user experience)
- **Suggested Fixes**:
  - Increase database connection pool size
  - Add connection retry logic with exponential backoff
  - Monitor and optimize slow queries
  - Check Redis server health and network connectivity
- **Follow-up Questions**:
  - How many concurrent users are accessing the system?
  - When did the Redis connection start failing?
  - Are there any recent deployment changes?

## Scenario 2: Microservices Log Monitoring

### JSON Structured Logs
```json
{"timestamp":"2024-01-23T14:30:00Z","service":"auth","level":"error","message":"JWT token validation failed","user_id":"u123","token_error":"expired","request_id":"req_456"}
{"timestamp":"2024-01-23T14:30:01Z","service":"payment","level":"fatal","message":"Payment gateway unreachable","gateway":"stripe","error_code":"NETWORK_ERROR","amount":"$99.99","transaction_id":"txn_789"}
{"timestamp":"2024-01-23T14:30:02Z","service":"notification","level":"warn","message":"Email delivery delayed","queue_size":1250,"threshold":1000}
{"timestamp":"2024-01-23T14:30:03Z","service":"user-profile","level":"error","message":"Cache miss for user data","user_id":"u123","cache_key":"profile:u123","fallback":"database"}
```

### Usage with CLI
```bash
# Save logs to file
echo '[JSON logs above]' > microservices.log

# Analyze with CLI
npm run analyze -- microservices.log
```

### Usage with Cursor AI
```
Monitor these microservices logs and help me identify:
1. Which service is experiencing the most critical issues?
2. Are there any cascading failure patterns?
3. What's the impact on user experience?
4. How should I prioritize fixes?
```

## Scenario 3: Real-time Log Monitoring

### Setting up File Watching

**With Cursor AI:**
```
Start monitoring /var/log/myapp/error.log for new critical errors and notify me immediately when issues occur.
```

**With CLI:**
```bash
# Interactive monitoring
npm run analyze -- watch /var/log/myapp/error.log 1000

# Or programmatically
node dist/cli/simple-client.js watch /var/log/myapp/error.log
```

### Monitoring Multiple Files

**Cursor AI Prompt:**
```
Please watch these log files for errors:
- /var/log/nginx/error.log (web server errors)
- /var/log/mysql/error.log (database errors) 
- /var/log/redis/redis-server.log (cache errors)

Alert me when new critical issues are detected in any of these files.
```

## Scenario 4: Database Performance Analysis

### Sample MySQL Slow Query Log
```
# Time: 2024-01-23T14:45:00.000000Z
# User@Host: app_user[app_user] @ [192.168.1.100]
# Thread_id: 12345  Schema: production_db
# Query_time: 45.123456  Lock_time: 0.000123  Rows_sent: 1  Rows_examined: 2500000
SELECT u.*, p.* FROM users u 
JOIN profiles p ON u.id = p.user_id 
WHERE u.created_at > '2024-01-01' 
AND p.status = 'active';

# Time: 2024-01-23T14:46:00.000000Z
# User@Host: app_user[app_user] @ [192.168.1.100]
# Thread_id: 12346  Schema: production_db  
# Query_time: 30.567890  Lock_time: 0.000089  Rows_sent: 0  Rows_examined: 1800000
UPDATE user_stats SET last_login = NOW() 
WHERE user_id IN (SELECT id FROM users WHERE status = 'inactive');
```

### Analysis Prompt
```
Analyze this MySQL slow query log and help me:
1. Identify the most problematic queries
2. Understand why these queries are slow
3. Suggest specific optimizations (indexes, query rewrites, etc.)
4. Estimate the performance impact of fixes
```

## Scenario 5: Security Log Analysis

### Security Event Logs
```
2024-01-23 15:00:01 [SECURITY] Failed login attempt: user=admin, ip=192.168.1.50, attempts=1
2024-01-23 15:00:05 [SECURITY] Failed login attempt: user=admin, ip=192.168.1.50, attempts=2
2024-01-23 15:00:10 [SECURITY] Failed login attempt: user=admin, ip=192.168.1.50, attempts=3
2024-01-23 15:00:15 [SECURITY] Account locked: user=admin, reason=too_many_failed_attempts
2024-01-23 15:00:20 [SECURITY] Suspicious activity: ip=192.168.1.50, action=password_spray_attack
2024-01-23 15:00:25 [SECURITY] IP blocked: ip=192.168.1.50, duration=1h, reason=brute_force
```

### Security Analysis Prompt
```
Analyze these security logs for potential threats:
1. What type of attack patterns do you see?
2. Is this a coordinated attack or isolated incidents?
3. What additional security measures should be implemented?
4. Should I be concerned about system compromise?
```

## Scenario 6: Application Startup and Configuration Issues

### Startup Error Logs
```
2024-01-23 09:00:00 [INFO] Starting MyApplication v2.1.0
2024-01-23 09:00:01 [INFO] Loading configuration from /etc/myapp/config.yaml
2024-01-23 09:00:02 [ERROR] Configuration validation failed
2024-01-23 09:00:02 [ERROR] Missing required environment variable: DATABASE_URL
2024-01-23 09:00:02 [ERROR] Invalid port configuration: expected number, got 'auto'
2024-01-23 09:00:02 [ERROR] SSL certificate not found: /etc/ssl/certs/myapp.crt
2024-01-23 09:00:03 [FATAL] Application startup failed due to configuration errors
2024-01-23 09:00:03 [FATAL] Process exiting with code 1
```

### Startup Debugging Prompt
```
This application is failing to start. Analyze these startup logs and help me:
1. Identify all configuration issues that need to be fixed
2. Prioritize which issues to address first
3. Provide specific commands or steps to resolve each issue
4. Suggest a startup checklist to prevent these issues in the future
```

## Scenario 7: Performance Bottleneck Investigation

### Performance Logs with Metrics
```
2024-01-23 16:30:00 [PERF] Request processing time: 2.5s (threshold: 1s) - /api/search
2024-01-23 16:30:00 [PERF] Database query time: 1.8s - SELECT * FROM products WHERE category IN (...)
2024-01-23 16:30:00 [PERF] Cache miss: key=search_results:electronics, rebuild_time=800ms
2024-01-23 16:30:01 [PERF] Memory usage spike: 1.2GB -> 2.8GB in 10s
2024-01-23 16:30:02 [PERF] GC pressure detected: 15 collections in 30s
2024-01-23 16:30:03 [WARN] Response time SLA breach: 95th percentile = 3.2s (SLA: 2s)
```

### Performance Analysis Prompt
```
Analyze these performance logs to help me optimize the application:
1. What's causing the slow response times?
2. Which performance issues should I tackle first?
3. Are there any memory leaks or resource issues?
4. What specific optimizations would give the biggest performance gains?
```

## Advanced Usage Patterns

### 1. Comparative Analysis
```
Compare the error patterns between these two log files from before and after our latest deployment. Help me understand if the deployment introduced new issues or improved existing ones.

[File 1: pre-deployment logs]
[File 2: post-deployment logs]
```

### 2. Trend Analysis
```
Analyze this week's worth of error logs and help me identify:
- Which errors are increasing in frequency?
- What time patterns exist (peak error times)?
- Which components are becoming less reliable?
- What should be our maintenance priorities?
```

### 3. Root Cause Investigation
```
I'm seeing intermittent 503 errors in production. Analyze these logs and help me trace the root cause by looking at:
- Correlation between different service errors
- Timeline of events leading to failures
- Resource utilization patterns
- External dependencies that might be involved
```

### 4. Capacity Planning
```
Based on these application logs showing resource usage and performance metrics, help me understand:
- When will we hit our capacity limits?
- Which resources are the bottlenecks?
- How should we scale our infrastructure?
- What are the warning signs to monitor?
```

## Best Practices for Log Analysis

### 1. **Structured Logging**
- Use consistent log formats across services
- Include correlation IDs for tracing requests
- Add contextual information (user_id, session_id, etc.)

### 2. **Log Levels**
- Use appropriate log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Be consistent with severity classification
- Include actionable information in error messages

### 3. **Monitoring Strategy**
- Set up real-time monitoring for critical paths
- Create alerts for specific error patterns
- Monitor both error rates and response times

### 4. **Analysis Workflow**
1. **Immediate**: Address FATAL and high-frequency ERRORs
2. **Short-term**: Investigate WARNINGs and performance issues
3. **Long-term**: Analyze trends and patterns for proactive improvements

## Integration with CI/CD

### Pre-deployment Log Analysis
```bash
# Analyze logs before deployment
npm run analyze -- production-logs-last-24h.log

# Check for specific error patterns
grep -E "(FATAL|ERROR)" app.log | npm run analyze -- -
```

### Post-deployment Monitoring
```
After deployment, monitor these logs for 30 minutes and alert me if error rates increase by more than 50% compared to the baseline:
- Application logs: /var/log/app/app.log
- Web server logs: /var/log/nginx/error.log
- Database logs: /var/log/mysql/error.log
```

This comprehensive set of examples should help you get started with effective log analysis using the LogAnalyzer MCP Server! 