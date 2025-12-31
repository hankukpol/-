exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { url, action } = event.queryStringParameters || {};
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing url parameter' })
      };
    }

    let targetUrl = `${url}?action=${action || 'getData'}`;
    let options = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    // Handle POST for saveData
    if (event.httpMethod === 'POST' && action === 'saveData') {
      options.method = 'POST';
      options.body = event.body;
    }

    const response = await fetch(targetUrl, options);
    const data = await response.text();

    return {
      statusCode: response.status,
      headers,
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
