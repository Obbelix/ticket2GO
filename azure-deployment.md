# Azure Deployment Guide

## Combined Frontend + Backend App Structure

This is now a full-stack application that combines:
- **Frontend**: React app (served from `/dist` after build)
- **Backend**: Express.js API server (handles `/api/*` routes)
- **Secrets**: Azure Key Vault integration for secure credential storage

## Deployment Options

### Option 1: Azure App Service (Recommended)

1. **Create Azure App Service**:
   ```bash
   az webapp create \
     --resource-group myResourceGroup \
     --plan myAppServicePlan \
     --name teams-to-servicedesk \
     --runtime "node|18-lts"
   ```

2. **Configure Environment Variables**:
   - `AZURE_KEY_VAULT_URL`: Your Key Vault URL
   - `NODE_ENV`: production

3. **Deploy from GitHub**:
   - Enable GitHub Actions deployment
   - Uses `package-azure.json` for Azure-specific dependencies

### Option 2: Azure Container Apps

1. **Build container**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package-azure.json package.json
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

## Azure Key Vault Setup

### Required Secrets:
- `SERVICE_DESK_ENDPOINT`: Your service management API URL
- `SERVICE_DESK_USERNAME`: API username
- `SERVICE_DESK_PASSWORD`: API password  
- `SERVICE_DESK_IDENTIFIER`: Import handler identifier

### Create secrets:
```bash
az keyvault secret set --vault-name "your-keyvault" --name "SERVICE_DESK_ENDPOINT" --value "https://your-service-desk.com/api"
az keyvault secret set --vault-name "your-keyvault" --name "SERVICE_DESK_USERNAME" --value "your-username"
az keyvault secret set --vault-name "your-keyvault" --name "SERVICE_DESK_PASSWORD" --value "your-password"
az keyvault secret set --vault-name "your-keyvault" --name "SERVICE_DESK_IDENTIFIER" --value "your-identifier"
```

### Grant App Service access:
```bash
az webapp identity assign --resource-group myResourceGroup --name teams-to-servicedesk
az keyvault set-policy --name "your-keyvault" --object-id "app-service-principal-id" --secret-permissions get
```

## Local Development

For local development, the app falls back to `config.json`:
```json
{
  "endpoint": "https://your-service-desk.com/api",
  "username": "your-username", 
  "password": "your-password",
  "identifier": "your-identifier"
}
```

## Build Process

1. **Frontend build**: `npm run build` creates `/dist` folder
2. **Backend serves**: Static files from `/dist` + API from `/api/*`
3. **Single deployment**: One app serves both frontend and backend

## New Request Flow

Teams → Azure App Service → Service Management System

- All requests go to your Azure app
- Frontend served from `/dist`
- API requests handled by Express.js
- Secrets loaded from Azure Key Vault
- No more Supabase dependency needed

## Cost Estimate

- **App Service Basic B1**: ~$13-18/month
- **Key Vault**: ~$0.03 per 10,000 operations
- **Total**: ~$15-20/month for production deployment