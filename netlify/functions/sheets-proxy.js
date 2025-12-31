const ALLOWED_HOSTS = new Set([
    'script.google.com',
    'script.googleusercontent.com'
]);

function buildTargetUrl(rawUrl, action) {
    const target = new URL(rawUrl);
    if (!ALLOWED_HOSTS.has(target.hostname)) {
        throw new Error('Invalid host for Sheets proxy');
    }
    target.searchParams.set('action', action);
    return target;
}

exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
    }

    const params = event.queryStringParameters || {};
    const rawUrl = params.url;
    const action = params.action;

    if (!rawUrl || !action) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: 'Missing url or action'
        };
    }

    let targetUrl;
    try {
        targetUrl = buildTargetUrl(rawUrl, action);
    } catch (error) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: error.message
        };
    }

    const requestInit = { method: event.httpMethod };
    if (event.httpMethod === 'POST') {
        requestInit.headers = {
            'Content-Type': event.headers['content-type'] || 'application/json'
        };
        if (event.body) {
            requestInit.body = event.isBase64Encoded
                ? Buffer.from(event.body, 'base64')
                : event.body;
        }
    }

    try {
        const response = await fetch(targetUrl.toString(), requestInit);
        const bodyText = await response.text();
        return {
            statusCode: response.status,
            headers: {
                ...corsHeaders,
                'Content-Type': response.headers.get('content-type') || 'application/json'
            },
            body: bodyText
        };
    } catch (error) {
        return {
            statusCode: 502,
            headers: corsHeaders,
            body: `Upstream request failed: ${error.message}`
        };
    }
};
