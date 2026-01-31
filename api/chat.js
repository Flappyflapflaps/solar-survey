/**
 * Vercel Serverless Function - Chat API Proxy
 * Proxies chat requests to the moltbot-server on the VPS
 */

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { message, sessionId } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // Proxy to moltbot-server on VPS via nginx
        const vpsUrl = 'http://91.99.72.158/api/chat';

        const response = await fetch(vpsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                sessionId: sessionId || 'survey-' + Date.now()
            })
        });

        if (!response.ok) {
            throw new Error(`VPS responded with ${response.status}`);
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Chat proxy error:', error);
        return res.status(500).json({
            type: 'error',
            message: 'Failed to connect to Frimble. Please try again.'
        });
    }
}
