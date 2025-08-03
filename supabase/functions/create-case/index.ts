import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateCaseRequest {
  title: string;
  description: string;
  manager: string;
  contact: string;
  messages: Array<{
    id: string;
    sender: string;
    content: string;
    timestamp: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Create case request received:', req.method);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestBody: CreateCaseRequest = await req.json();
    console.log('Request payload:', JSON.stringify(requestBody, null, 2));

    // Get service desk configuration from environment variables
    const endpoint = Deno.env.get('SERVICE_DESK_ENDPOINT');
    const username = Deno.env.get('SERVICE_DESK_USERNAME');
    const password = Deno.env.get('SERVICE_DESK_PASSWORD');
    const identifier = Deno.env.get('SERVICE_DESK_IDENTIFIER');

    if (!endpoint || !username || !password || !identifier) {
      console.error('Missing service desk configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Service desk configuration not found. Please configure SERVICE_DESK_ENDPOINT, SERVICE_DESK_USERNAME, SERVICE_DESK_PASSWORD, and SERVICE_DESK_IDENTIFIER.' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Transform the payload for the service desk API
    const serviceDeskPayload = {
      identifier: identifier,
      source: "teams2go",
      title: requestBody.title,
      description: requestBody.description,
      manager: requestBody.manager,
      contact: requestBody.contact,
      conversation: requestBody.description,
      messages: requestBody.messages
    };

    console.log('Sending to service desk:', JSON.stringify(serviceDeskPayload, null, 2));

    // Create Basic Auth header
    const credentials = btoa(`${username}:${password}`);
    const authHeader = `Basic ${credentials}`;

    // Make request to service desk API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(serviceDeskPayload)
    });

    console.log('Service desk response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Service desk API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `Service desk API responded with ${response.status}: ${errorText}` 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Service desk response data:', JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})