// Vercel Serverless Function - Logout endpoint
export default function handler(req, res) {
    // Clear the auth cookie by setting it to expire immediately
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
        'auth_token=',
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
        'Max-Age=0',
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        isProduction ? 'Secure' : ''
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    // For API calls, return JSON
    if (req.headers.accept?.includes('application/json')) {
        return res.status(200).json({ success: true, message: 'Logged out' });
    }

    // For browser navigation, redirect to login
    res.writeHead(302, { Location: '/login.html' });
    res.end();
}
