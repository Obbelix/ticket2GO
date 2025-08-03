// Azure Function for creating service desk tickets

module.exports = async function (context, req) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: corsHeaders,
            body: ''
        };
        return;
    }

    try {
        context.log('Starting create-case function');
        context.log('Request body:', JSON.stringify(req.body, null, 2));

        // Get configuration from environment variables
        const serviceUrl = process.env.SERVICE_DESK_ENDPOINT;
        const username = process.env.SERVICE_DESK_USERNAME;
        const password = process.env.SERVICE_DESK_PASSWORD;
        const identifier = process.env.SERVICE_DESK_IDENTIFIER;

        context.log('Checking environment variables...');
        
        if (!serviceUrl) {
            throw new Error('SERVICE_DESK_ENDPOINT environment variable is not set');
        }
        
        context.log('Environment variables loaded successfully');
        context.log('Service URL configured:', serviceUrl ? 'Yes' : 'No');
        context.log('Username configured:', username ? 'Yes' : 'No');
        context.log('Password configured:', password ? 'Yes' : 'No');
        context.log('Identifier configured:', identifier ? 'Yes' : 'No');

        // Prepare the request payload to match the service desk API format
        const payload = {
            importHandlerIdentifier: identifier || "teams2gonew",
            itemToImport: [
                {
                    property: [
                        {
                            name: "title",
                            content: req.body.title || "Support Request"
                        },
                        {
                            name: "description",
                            content: req.body.description || req.body.messages || ""
                        },
                        {
                            name: "manager",
                            content: req.body.manager || ""
                        },
                        {
                            name: "contact", 
                            content: req.body.contact || ""
                        }
                    ]
                }
            ]
        };

        context.log('Forwarding request to service management system:', JSON.stringify(payload, null, 2));
        
        context.log('Using service URL from environment:', serviceUrl);
        
        // Create Basic Auth header using credentials from environment variables
        const authHeaders = {};
        if (username && password) {
            const credentials = Buffer.from(`${username}:${password}`).toString('base64');
            authHeaders['Authorization'] = `Basic ${credentials}`;
        }
        
        if (identifier) {
            authHeaders['X-Service-Desk-ID'] = identifier;
        }

        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify(payload)
        });

        context.log('API Response Status:', response.status);
        context.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

        // Get response text first to handle both success and error cases
        const responseText = await response.text();
        context.log('API Response Body:', responseText);

        // Try to parse as JSON, fall back to text if it fails
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { message: responseText };
        }

        if (!response.ok) {
            context.log('API call failed:', response.status, responseText);
            context.res = {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: {
                    error: `API call failed with status ${response.status}`,
                    details: responseData,
                    status: response.status,
                    statusText: response.statusText
                }
            };
            return;
        }

        context.log('API call successful');
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: true,
                data: responseData,
                status: response.status
            }
        };

    } catch (error) {
        context.log('Azure Function error:', error);
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                error: 'Internal server error',
                details: error.message
            }
        };
    }
};