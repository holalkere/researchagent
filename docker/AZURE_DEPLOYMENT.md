# Azure Deployment Guide

This guide covers deploying the Research Agent using Azure services with the Azure Tools Docker extension.

## Prerequisites

- Azure CLI installed
- Azure Tools Docker extension in VS Code
- Azure subscription
- Docker installed locally

## Deployment Options

### Option 1: Azure Container Instances (ACI) - Serverless

1. **Build and push to Azure Container Registry:**
   ```bash
   # Login to Azure
   az login
   
   # Create resource group (if not exists)
   az group create --name research-agent-rg --location eastus
   
   # Create Azure Container Registry
   az acr create --resource-group research-agent-rg --name yourregistry --sku Basic
   
   # Login to ACR
   az acr login --name yourregistry
   
   # Build and push image
   docker build -t yourregistry.azurecr.io/research-agent:latest .
   docker push yourregistry.azurecr.io/research-agent:latest
   ```

2. **Deploy to Azure Container Instances:**
   ```bash
   az container create \
     --resource-group research-agent-rg \
     --name research-agent \
     --image yourregistry.azurecr.io/research-agent:latest \
     --cpu 1 \
     --memory 2 \
     --ports 8000 \
     --environment-variables \
       OPENAI_API_KEY=your_key \
       TAVILY_API_KEY=your_key \
       USE_COSMOS_DB=true \
     --secure-environment-variables \
       AZURE_COSMOS_KEY=your_cosmos_key
   ```

### Option 2: Azure App Service (Web App for Containers)

1. **Create App Service Plan:**
   ```bash
   az appservice plan create \
     --name research-agent-plan \
     --resource-group research-agent-rg \
     --sku B1 \
     --is-linux
   ```

2. **Create Web App:**
   ```bash
   az webapp create \
     --resource-group research-agent-rg \
     --plan research-agent-plan \
     --name your-research-agent \
     --deployment-container-image-name yourregistry.azurecr.io/research-agent:latest
   ```

3. **Configure App Settings:**
   ```bash
   az webapp config appsettings set \
     --resource-group research-agent-rg \
     --name your-research-agent \
     --settings \
       OPENAI_API_KEY=your_key \
       TAVILY_API_KEY=your_key \
       USE_COSMOS_DB=true \
       AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
   ```

### Option 3: Azure Kubernetes Service (AKS) - For Production

1. **Create AKS cluster:**
   ```bash
   az aks create \
     --resource-group research-agent-rg \
     --name research-agent-aks \
     --node-count 2 \
     --enable-addons monitoring \
     --attach-acr yourregistry
   ```

2. **Deploy using kubectl:**
   ```bash
   # Get credentials
   az aks get-credentials --resource-group research-agent-rg --name research-agent-aks
   
   # Create Kubernetes deployment
   kubectl apply -f k8s-deployment.yaml
   ```

## Using Azure Tools Docker Extension

### Visual Deployment Steps:

1. **Right-click on Dockerfile** → "Build Image in Azure"
2. **Select Azure Container Registry** as target
3. **Push image** to registry
4. **Deploy to Azure Container Instances** or **Azure App Service**

### Benefits of Azure Integration:

- **Automatic scaling** based on demand
- **Built-in monitoring** and logging
- **SSL certificates** automatically managed
- **Global CDN** integration
- **Azure AD authentication** (if needed)
- **Cost optimization** with serverless options

## Environment Variables for Azure

Create a `.env.azure` file:

```bash
# Required API Keys
OPENAI_API_KEY=your_openai_key
TAVILY_API_KEY=your_tavily_key

# Azure Cosmos DB (Recommended for Azure)
USE_COSMOS_DB=true
AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=your_cosmos_key
AZURE_COSMOS_DATABASE_NAME=research_agent

# Optional: Azure Content Safety
AZURE_CONTENT_SAFETY_ENDPOINT=https://your-content-safety.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_KEY=your_content_safety_key
```

## Cost Optimization

- **ACI**: Pay-per-use, good for development/testing
- **App Service**: Fixed cost, good for small-medium production
- **AKS**: Best for large-scale production with multiple services

## Monitoring and Logging

- **Application Insights**: Built-in monitoring
- **Log Analytics**: Centralized logging
- **Azure Monitor**: Performance metrics
- **Health checks**: Automatic restart on failures

## Security Considerations

- Use **Azure Key Vault** for sensitive environment variables
- Enable **Managed Identity** for Azure service authentication
- Configure **Network Security Groups** for network isolation
- Use **Azure AD** for authentication if needed
