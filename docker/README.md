# Docker Configuration

This folder contains all Docker-related files for the Research Agent application.

## Files Overview

- **`Dockerfile`** - Main Docker image configuration
- **`docker-compose.yml`** - Local development and testing setup
- **`.dockerignore`** - Files to exclude from Docker build context
- **`azure-deploy.yml`** - Azure Container Instances deployment config
- **`k8s-deployment.yaml`** - Kubernetes deployment for AKS
- **`DOCKER_DEPLOYMENT.md`** - Docker deployment guide
- **`AZURE_DEPLOYMENT.md`** - Azure-specific deployment guide

## Quick Start

### Local Development
```bash
# From project root
cd docker
docker-compose up -d
```

### Build Image
```bash
# From project root
docker build -f docker/Dockerfile -t research-agent .
```

### Azure Deployment
```bash
# Follow instructions in AZURE_DEPLOYMENT.md
```

## File Structure
```
docker/
├── Dockerfile              # Main container definition
├── docker-compose.yml      # Local development setup
├── .dockerignore          # Build context exclusions
├── azure-deploy.yml       # Azure Container Instances
├── k8s-deployment.yaml    # Kubernetes deployment
├── DOCKER_DEPLOYMENT.md   # Docker deployment guide
├── AZURE_DEPLOYMENT.md    # Azure deployment guide
└── README.md              # This file
```

## Notes

- All paths in the Docker files are relative to the project root
- Environment variables should be set in `.env` file in project root
- The Dockerfile assumes it's being run from the project root directory
