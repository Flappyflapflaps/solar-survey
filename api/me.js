// Vercel Serverless Function - Get current user info
import jwt from 'jsonwebtoken';

export default function handler(req, res) {
    const jwtSecret = process.env.AUTH_JWT_SECRET;

    if (!jwtSecret) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Parse cookie
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        return res.status(200).json({
            success: true,
            user: {
                username: decoded.username,
                displayName: decoded.displayName
            }
        });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}
