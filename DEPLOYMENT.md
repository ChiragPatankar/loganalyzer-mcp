# LogAnalyzer MCP Server - Deployment Guide

This guide covers deploying the LogAnalyzer MCP Server in various production environments and hosting scenarios.

## 🎯 Deployment Options

### 1. Local Development
### 2. Docker Container
### 3. Cloud Hosting (AWS, GCP, Azure)
### 4. Kubernetes Cluster
### 5. CI/CD Integration

---

## 1. Local Development Deployment

### Prerequisites
- Node.js 18+
- Git
- Gemini API key

### Setup
```bash
# Clone repository
git clone <repository-url>
cd loganalyzer-mcp

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# Build project
npm run build

# Validate installation
npm run validate

# Start MCP server
npm run serve
```

### Integration with Local Tools
```bash
# For Cursor AI - update settings.json
{
  "mcpServers": {
    "loganalyzer": {
      "command": "node",
      "args": ["/absolute/path/to/loganalyzer-mcp/dist/src/server.js"],
      "env": {
        "GEMINI_API_KEY": "your_key_here"
      }
    }
  }
}
```

---

## 2. Docker Deployment

### Basic Docker Setup
```bash
# Build image
docker build -t loganalyzer-mcp .

# Run container
docker run -d \
  --name loganalyzer-mcp \
  -e GEMINI_API_KEY=your_key_here \
  -e LOG_LEVEL=info \
  -v /var/log:/app/logs:ro \
  loganalyzer-mcp
```

### Docker Compose (Recommended)
```bash
# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env

# Start services
docker-compose up -d

# With Redis caching
docker-compose --profile with-cache up -d

# Full stack with database
docker-compose --profile with-cache --profile with-db up -d
```

### Health Monitoring
```bash
# Check container health
docker-compose ps
docker logs loganalyzer-mcp-server

# Monitor resource usage
docker stats loganalyzer-mcp-server
```

---

## 3. Cloud Hosting

### AWS Deployment

#### Option A: AWS ECS (Fargate)
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t loganalyzer-mcp .
docker tag loganalyzer-mcp:latest <account>.dkr.ecr.us-east-1.amazonaws.com/loganalyzer-mcp:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/loganalyzer-mcp:latest
```

**ECS Task Definition** (`ecs-task-definition.json`):
```json
{
  "family": "loganalyzer-mcp",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": 256,
  "memory": 512,
  "executionRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "loganalyzer-mcp",
      "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/loganalyzer-mcp:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "LOG_LEVEL",
          "value": "info"
        }
      ],
      "secrets": [
        {
          "name": "GEMINI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account>:secret:loganalyzer/gemini-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/loganalyzer-mcp",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Option B: AWS Lambda (Serverless)
```bash
# Package for Lambda
npm run build
zip -r loganalyzer-lambda.zip dist/ node_modules/ package.json

# Deploy with AWS CLI
aws lambda create-function \
  --function-name loganalyzer-mcp \
  --runtime nodejs18.x \
  --role arn:aws:iam::<account>:role/lambda-execution-role \
  --handler dist/src/lambda.handler \
  --zip-file fileb://loganalyzer-lambda.zip \
  --environment Variables='{GEMINI_API_KEY=your_key_here}'
```

### Google Cloud Platform

#### Cloud Run Deployment
```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/<project-id>/loganalyzer-mcp

# Deploy to Cloud Run
gcloud run deploy loganalyzer-mcp \
  --image gcr.io/<project-id>/loganalyzer-mcp \
  --platform managed \
  --region us-central1 \
  --set-env-vars LOG_LEVEL=info \
  --set-env-vars GEMINI_API_KEY=your_key_here \
  --allow-unauthenticated
```

### Azure Container Instances
```bash
# Create resource group
az group create --name loganalyzer-rg --location eastus

# Deploy container
az container create \
  --resource-group loganalyzer-rg \
  --name loganalyzer-mcp \
  --image <registry>/loganalyzer-mcp:latest \
  --cpu 0.5 \
  --memory 1 \
  --environment-variables LOG_LEVEL=info \
  --secure-environment-variables GEMINI_API_KEY=your_key_here
```

---

## 4. Kubernetes Deployment

### Basic Kubernetes Manifests

**Namespace** (`k8s/namespace.yaml`):
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: loganalyzer
```

**Secret** (`k8s/secret.yaml`):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: loganalyzer-secrets
  namespace: loganalyzer
type: Opaque
data:
  GEMINI_API_KEY: <base64-encoded-key>
```

**Deployment** (`k8s/deployment.yaml`):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loganalyzer-mcp
  namespace: loganalyzer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: loganalyzer-mcp
  template:
    metadata:
      labels:
        app: loganalyzer-mcp
    spec:
      containers:
      - name: loganalyzer-mcp
        image: loganalyzer-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: loganalyzer-secrets
              key: GEMINI_API_KEY
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Service** (`k8s/service.yaml`):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: loganalyzer-mcp-service
  namespace: loganalyzer
spec:
  selector:
    app: loganalyzer-mcp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### Deploy to Kubernetes
```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n loganalyzer
kubectl logs -f deployment/loganalyzer-mcp -n loganalyzer

# Scale deployment
kubectl scale deployment loganalyzer-mcp --replicas=3 -n loganalyzer
```

### Helm Chart (Advanced)
```bash
# Create Helm chart
helm create loganalyzer-mcp-chart

# Install with Helm
helm install loganalyzer-mcp ./loganalyzer-mcp-chart \
  --set image.tag=latest \
  --set secrets.geminiApiKey=your_key_here \
  --set replicaCount=2
```

---

## 5. CI/CD Integration

### GitHub Actions

**Workflow** (`.github/workflows/deploy.yml`):
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - run: npm ci
    - run: npm run build
    - run: npm run validate
    
  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - uses: docker/build-push-action@v3
      with:
        context: .
        push: true
        tags: ${{ secrets.REGISTRY }}/loganalyzer-mcp:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to production
      run: |
        # Add your deployment commands here
        echo "Deploying to production..."
```

### GitLab CI

**Pipeline** (`.gitlab-ci.yml`):
```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run build
    - npm run validate

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main

deploy:
  stage: deploy
  script:
    - kubectl apply -f k8s/
    - kubectl set image deployment/loganalyzer-mcp loganalyzer-mcp=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n loganalyzer
  only:
    - main
```

---

## 📊 Monitoring & Observability

### Health Checks
```bash
# Container health check
curl http://localhost:3000/health

# Kubernetes readiness probe
curl http://service-ip/ready

# Docker health status
docker inspect --format='{{.State.Health.Status}}' loganalyzer-mcp
```

### Logging Configuration
```bash
# Environment variables for logging
LOG_LEVEL=info              # debug, info, warn, error
MAX_FILE_SIZE=10MB          # Maximum log file size
WATCH_INTERVAL=1000         # File polling interval (ms)
MAX_CONTEXT_TOKENS=8000     # AI context limit
```

### Resource Monitoring
```bash
# Container resource usage
docker stats loganalyzer-mcp

# Kubernetes resource monitoring
kubectl top pod -n loganalyzer
kubectl describe pod <pod-name> -n loganalyzer
```

---

## 🔧 Configuration Management

### Environment Variables
```bash
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional
LOG_LEVEL=info
MAX_FILE_SIZE=10MB
WATCH_INTERVAL=1000
MAX_CONTEXT_TOKENS=8000
DEFAULT_POLL_INTERVAL=1000
NODE_ENV=production
```

### Configuration Files
```yaml
# config/production.yaml
server:
  logLevel: info
  maxFileSize: 10MB
  watchInterval: 1000

ai:
  provider: gemini
  maxContextTokens: 8000
  
monitoring:
  defaultPollInterval: 1000
  maxWatchedFiles: 50
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker logs loganalyzer-mcp

# Common causes:
# - Missing GEMINI_API_KEY
# - Invalid Node.js version
# - Port already in use
```

#### 2. High Memory Usage
```bash
# Monitor memory
docker stats --no-stream loganalyzer-mcp

# Solutions:
# - Reduce MAX_CONTEXT_TOKENS
# - Increase container memory limits
# - Optimize log file sizes
```

#### 3. API Rate Limiting
```bash
# Check Gemini API quotas
# Solutions:
# - Implement request queuing
# - Add retry logic with exponential backoff
# - Monitor API usage
```

### Performance Tuning
```bash
# Optimize for large log files
MAX_FILE_SIZE=50MB
MAX_CONTEXT_TOKENS=4000

# Optimize for many files
WATCH_INTERVAL=2000
DEFAULT_POLL_INTERVAL=5000

# Optimize for speed
MAX_CONTEXT_TOKENS=12000
WATCH_INTERVAL=500
```

---

## 📋 Production Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] API keys stored securely
- [ ] Resource limits set appropriately
- [ ] Health checks configured
- [ ] Logging configured
- [ ] Monitoring set up

### Post-deployment
- [ ] Health endpoints responding
- [ ] Logs flowing correctly
- [ ] Resource usage within limits
- [ ] API integration working
- [ ] File watching functional
- [ ] Performance metrics acceptable

### Security
- [ ] API keys in secrets management
- [ ] Network policies configured
- [ ] Container runs as non-root user
- [ ] Resource limits enforced
- [ ] Input validation enabled
- [ ] HTTPS/TLS configured (if applicable)

---

## 🆘 Support

- **Documentation**: Check README.md and docs/
- **Issues**: GitHub Issues for bug reports
- **Community**: GitHub Discussions for questions
- **Security**: security@loganalyzer.com for vulnerabilities

For additional deployment assistance, please refer to the main documentation or create an issue in the GitHub repository. 