const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const morgan = require('morgan');
const winston = require('winston');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();

// Azure Key Vault client
let secretClient;
if (process.env.AZURE_KEY_VAULT_URL) {
  const credential = new DefaultAzureCredential();
  secretClient = new SecretClient(process.env.AZURE_KEY_VAULT_URL, credential);
}

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Setup Morgan HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Handle CORS for Teams and other origins
app.use(cors({
  origin: '*', // Allow all origins for testing
  credentials: false
}));

// Axios interceptors for outgoing request/response logging
axios.interceptors.request.use(
  (config) => {
    logger.info('Outgoing Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => {
    logger.error('Outgoing Request Error:', error.message);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    logger.info('Outgoing Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    logger.error('Outgoing Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Health check endpoint
app.get('/', (req, res) => {
  const response = { status: 'Server is running', timestamp: new Date().toISOString() };
  logger.info('Health check accessed', response);
  res.json(response);
});

// Create case endpoint - updated for Azure deployment
app.post('/api/create-case', async (req, res) => {
  try {
    logger.info('Create case request received:', {
      body: req.body,
      headers: req.headers,
      ip: req.ip
    });

    // Get secrets from Azure Key Vault or fallback to config.json for local dev
    let config;
    if (secretClient) {
      try {
        const [endpoint, username, password, identifier] = await Promise.all([
          secretClient.getSecret('ServiceDeskEndpoint'),
          secretClient.getSecret('ServiceDeskUsername'), 
          secretClient.getSecret('ServiceDeskPassword'),
          secretClient.getSecret('ServiceDeskIdentifier')
        ]);
        
        config = {
          endpoint: endpoint.value,
          username: username.value,
          password: password.value,
          identifier: identifier.value
        };
        logger.info('Config loaded from Azure Key Vault');
      } catch (vaultError) {
        logger.error('Error reading from Azure Key Vault:', vaultError.message);
        return res.status(500).json({ 
          error: 'Configuration error', 
          details: 'Cannot read secrets from Azure Key Vault' 
        });
      }
    } else {
      // Fallback to config.json for local development
      try {
        const configFile = fs.readFileSync('./config.json', 'utf8');
        config = JSON.parse(configFile);
        logger.info('Config loaded from config.json (local development)');
      } catch (configError) {
        logger.error('Error reading config.json:', configError.message);
        return res.status(500).json({ 
          error: 'Configuration error', 
          details: 'Cannot read config.json file or Azure Key Vault. Make sure secrets are configured.' 
        });
      }
    }
    
    // Validate required config fields
    if (!config.endpoint || !config.username || !config.password || !config.identifier) {
      logger.error('Configuration validation failed - missing required fields');
      return res.status(500).json({ 
        error: 'Configuration error', 
        details: 'Missing required fields: endpoint, username, password, identifier' 
      });
    }
    
    logger.info('Forwarding request to service desk endpoint:', config.endpoint);
    
    // Create Basic Auth credentials
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    
    // Transform the payload to match service desk API format
    const transformedPayload = {
      "importHandlerIdentifier": config.identifier,
      "itemToImport": [
        {
          "property": [
            {
              "content": req.body.title,
              "name": "title",
              "rawValue": "string"
            },
            {
              "content": req.body.description,
              "name": "description",
              "rawValue": "string"
            },
            {
              "content": req.body.manager,
              "name": "manager",
              "rawValue": "string"
            },
            {
              "content": req.body.contact,
              "name": "contact",
              "rawValue": "string"
            }
          ]
        }
      ],
      "genericRequestProperty": [
        {
          "content": `Exported from Teams conversation with ${req.body.messages?.length || 0} messages`,
          "name": "additionalNotes"
        }
      ]
    };
    
    logger.info('Transformed payload:', transformedPayload);
    
    // Forward request to service desk API
    const response = await axios.post(config.endpoint, transformedPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      timeout: 30000 // 30 second timeout
    });
    
    logger.info('Service desk request successful:', {
      status: response.status,
      endpoint: config.endpoint
    });
    
    // Return the response from the service desk
    res.status(response.status).json(response.data);
    
  } catch (error) {
    logger.error('Server error in create-case endpoint:', {
      message: error.message,
      stack: error.stack,
      config: error.config,
      response: error.response?.data
    });
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Service desk error',
        details: error.response.data || error.message
      });
    } else if (error.request) {
      res.status(500).json({
        error: 'Network error',
        details: 'Cannot connect to service desk API. Check endpoint URL and network connectivity.'
      });
    } else {
      res.status(500).json({
        error: 'Request error',
        details: error.message
      });
    }
  }
});

// Legacy endpoint for backward compatibility
app.post('/api/create-ticket', (req, res) => {
  res.redirect(307, '/api/create-case');
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled server error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Combined frontend+backend server started on port ${PORT}`, {
    port: PORT,
    frontend: `http://localhost:${PORT}/`,
    healthCheck: `http://localhost:${PORT}/`,
    apiEndpoint: `http://localhost:${PORT}/api/create-case`,
    azureKeyVault: process.env.AZURE_KEY_VAULT_URL ? 'Enabled' : 'Disabled',
    logFiles: ['error.log', 'combined.log']
  });
});