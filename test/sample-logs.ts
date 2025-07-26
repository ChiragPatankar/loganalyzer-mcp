export const sampleLogs = {
  // Database connection error with stack trace
  databaseError: `
2024-01-23 10:30:15 INFO: Starting application...
2024-01-23 10:30:16 INFO: Connecting to database...
2024-01-23 10:30:17 ERROR: Database connection failed
java.sql.SQLException: Connection is not available, request timed out after 30000ms.
    at org.apache.commons.dbcp2.PoolingDataSource.getConnection(PoolingDataSource.java:154)
    at com.app.service.DatabaseService.connect(DatabaseService.java:45)
    at com.app.controller.UserController.getUser(UserController.java:78)
    at com.app.controller.UserController.handleRequest(UserController.java:34)
2024-01-23 10:30:18 FATAL: Application shutting down due to critical error
2024-01-23 10:30:19 ERROR: Failed to save user data
2024-01-23 10:30:20 ERROR: Connection pool exhausted
`,

  // JSON structured logs
  jsonLogs: `
{"timestamp":"2024-01-23T10:30:15Z","level":"info","message":"User login attempt","user_id":"12345"}
{"timestamp":"2024-01-23T10:30:16Z","level":"error","message":"Authentication failed","user_id":"12345","error":"Invalid credentials","stack_trace":"at AuthService.authenticate(auth.js:45)\\n at LoginController.login(login.js:23)"}
{"timestamp":"2024-01-23T10:30:17Z","level":"fatal","message":"Redis connection lost","service":"cache","error_code":"ECONNREFUSED","retry_count":3}
{"timestamp":"2024-01-23T10:30:18Z","level":"warn","message":"High memory usage detected","memory_usage":"85%","threshold":"80%"}
{"timestamp":"2024-01-23T10:30:19Z","level":"error","message":"Payment processing failed","transaction_id":"txn_123","amount":"$99.99","error":"Payment gateway timeout"}
`,

  // Network/API errors
  networkError: `
[2024-01-23 10:30:15] INFO: API Gateway starting on port 8080
[2024-01-23 10:30:16] DEBUG: Registering routes...
[2024-01-23 10:30:17] ERROR: Failed to connect to external API
Request URL: https://api.external-service.com/v1/data
Request Method: GET
Response Status: 503 Service Unavailable
Response Body: {"error":"Service temporarily unavailable","retry_after":300}
[2024-01-23 10:30:18] WARN: Retrying request in 5 seconds (attempt 2/3)
[2024-01-23 10:30:23] ERROR: Failed to connect to external API (attempt 2)
[2024-01-23 10:30:28] ERROR: Failed to connect to external API (attempt 3)
[2024-01-23 10:30:29] FATAL: Max retry attempts exceeded, marking service as down
[2024-01-23 10:30:30] ERROR: Circuit breaker opened for external-service
`,

  // Application runtime errors
  runtimeError: `
2024-01-23 10:30:15 [main] INFO  Application - Starting MyApp v1.2.3
2024-01-23 10:30:16 [main] INFO  Configuration - Loading config from application.yml
2024-01-23 10:30:17 [worker-1] DEBUG DataProcessor - Processing batch of 1000 records
2024-01-23 10:30:18 [worker-1] ERROR DataProcessor - Null pointer exception in data processing
java.lang.NullPointerException: Cannot invoke "com.app.model.User.getName()" because "user" is null
    at com.app.processor.DataProcessor.processUser(DataProcessor.java:67)
    at com.app.processor.DataProcessor.processBatch(DataProcessor.java:45)
    at com.app.worker.WorkerThread.run(WorkerThread.java:23)
2024-01-23 10:30:19 [worker-1] WARN  DataProcessor - Skipping invalid record at position 457
2024-01-23 10:30:20 [worker-2] ERROR DataProcessor - OutOfMemoryError: Java heap space
java.lang.OutOfMemoryError: Java heap space
    at java.util.Arrays.copyOf(Arrays.java:3236)
    at java.util.ArrayList.grow(ArrayList.java:275)
    at com.app.processor.DataProcessor.loadData(DataProcessor.java:123)
2024-01-23 10:30:21 [main] FATAL Application - System critical error, shutting down
`,

  // Web server errors
  webServerError: `
127.0.0.1 - - [23/Jan/2024:10:30:15 +0000] "GET /api/users HTTP/1.1" 200 1024 "-" "Mozilla/5.0"
127.0.0.1 - - [23/Jan/2024:10:30:16 +0000] "POST /api/login HTTP/1.1" 401 256 "-" "curl/7.68.0"
127.0.0.1 - - [23/Jan/2024:10:30:17 +0000] "GET /api/data HTTP/1.1" 500 512 "-" "Mozilla/5.0"
2024-01-23 10:30:17 [ERROR] Internal server error in /api/data
Traceback (most recent call last):
  File "/app/routes/api.py", line 45, in get_data
    result = database.query("SELECT * FROM data WHERE id = %s", user_id)
  File "/app/database.py", line 23, in query
    cursor.execute(query, params)
psycopg2.errors.SyntaxError: syntax error at or near "ELECT"
2024-01-23 10:30:18 [ERROR] Database query failed
2024-01-23 10:30:19 [WARNING] Connection pool running low: 2/10 connections available
127.0.0.1 - - [23/Jan/2024:10:30:20 +0000] "GET /health HTTP/1.1" 503 128 "-" "k8s-probe"
`,

  // Configuration and startup errors
  configError: `
2024-01-23 10:30:15 Starting application...
2024-01-23 10:30:16 Loading configuration from /etc/app/config.yaml
2024-01-23 10:30:17 ERROR: Configuration file not found: /etc/app/config.yaml
2024-01-23 10:30:18 ERROR: Failed to load database configuration
2024-01-23 10:30:19 ERROR: Required environment variable DATABASE_URL not set
2024-01-23 10:30:20 ERROR: Invalid port number in configuration: 'abc'
2024-01-23 10:30:21 FATAL: Unable to start application due to configuration errors
2024-01-23 10:30:22 ERROR: Application startup failed
Process exiting with code 1
`
};

export const testCases = [
  {
    name: 'Database Connection Error',
    log: sampleLogs.databaseError,
    expectedSeverity: 'high' as const,
    expectedErrorType: 'database'
  },
  {
    name: 'JSON Structured Logs',
    log: sampleLogs.jsonLogs,
    expectedSeverity: 'high' as const,
    expectedErrorType: 'authentication'
  },
  {
    name: 'Network/API Error',
    log: sampleLogs.networkError,
    expectedSeverity: 'medium' as const,
    expectedErrorType: 'network'
  },
  {
    name: 'Runtime Application Error',
    log: sampleLogs.runtimeError,
    expectedSeverity: 'critical' as const,
    expectedErrorType: 'runtime'
  },
  {
    name: 'Web Server Error',
    log: sampleLogs.webServerError,
    expectedSeverity: 'medium' as const,
    expectedErrorType: 'runtime'
  },
  {
    name: 'Configuration Error',
    log: sampleLogs.configError,
    expectedSeverity: 'critical' as const,
    expectedErrorType: 'configuration'
  }
];

export default sampleLogs; 