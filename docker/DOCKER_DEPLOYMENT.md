# Docker Deployment Guide

This guide explains how to deploy the Research Agent application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier deployment)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# API Keys (Required)
OPENAI_API_KEY=your_openai_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# Database Configuration
USE_COSMOS_DB=false
DATABASE_URL=sqlite:///./research_agent.db

# Azure Cosmos DB (Optional - only if USE_COSMOS_DB=true)
AZURE_COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
AZURE_COSMOS_KEY=your_cosmos_db_key_here
AZURE_COSMOS_DATABASE_NAME=research_agent

# Azure Content Safety (Optional)
AZURE_CONTENT_SAFETY_ENDPOINT=https://your-content-safety.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=your_content_safety_key_here
```

## Deployment Options

### Option 1: Using Docker Compose (Recommended)

1. Create your `.env` file with the required variables
2. Run the application:
   ```bash
   docker-compose up -d
   ```

3. Access the application at: http://localhost:8000

### Option 2: Using Docker directly

1. Build the image:
   ```bash
   docker build -t research-agent .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name research-agent \
     -p 8000:8000 \
     -e OPENAI_API_KEY=your_key_here \
     -e TAVILY_API_KEY=your_key_here \
     -e USE_COSMOS_DB=false \
     research-agent
   ```

## Database Configuration

### SQLite (Default)
- No additional setup required
- Database file will be created automatically
- Data persists in the container

### Azure Cosmos DB
- Set `USE_COSMOS_DB=true`
- Provide Azure Cosmos DB credentials
- More scalable for production use

## Health Check

The application includes a health check endpoint at `/api` that Docker will use to monitor the application status.

## Stopping the Application

### Docker Compose:
```bash
docker-compose down
```

### Docker:
```bash
docker stop research-agent
docker rm research-agent
```

## Troubleshooting

1. **Check logs:**
   ```bash
   docker-compose logs -f
   # or
   docker logs research-agent
   ```

2. **Verify environment variables:**
   ```bash
   docker exec research-agent env
   ```

3. **Access container shell:**
   ```bash
   docker exec -it research-agent /bin/bash
   ```

## Production Considerations

- Use a reverse proxy (nginx) in front of the application
- Set up proper logging and monitoring
- Use Azure Cosmos DB for production workloads
- Configure proper resource limits
- Use Docker secrets for sensitive environment variables
