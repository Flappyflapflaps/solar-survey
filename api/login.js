// Vercel Serverless Function - Login endpoint
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // CSRF protection - check origin/referer
    const origin = req.headers.origin || req.headers.referer;
    const host = req.headers.host;
    if (origin && !origin.includes(host)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // Parse users from environment variable
    // Format: "user1:hash1:Display Name 1,user2:hash2:Display Name 2"
    const usersEnv = process.env.AUTH_USERS || '';
    const jwtSecret = process.env.AUTH_JWT_SECRET;

    if (!jwtSecret) {
        console.error('AUTH_JWT_SECRET not configured');
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Find matching user
    const users = usersEnv.split(',').map(entry => {
        const [user, hash, ...nameParts] = entry.split(':');
        return {
            username: user?.trim(),
            passwordHash: hash?.trim(),
            displayName: nameParts.join(':')?.trim()
        };
    }).filter(u => u.username && u.passwordHash);

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
        // Timing-safe comparison - still check password to prevent timing attacks
        await bcrypt.compare(password, '$2a$10$dummyhashfortimingattackprevention');
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
        {
            username: user.username,
            displayName: user.displayName,
            iat: Math.floor(Date.now() / 1000)
        },
        jwtSecret,
        {
            expiresIn: '7d',
            algorithm: 'HS256'
        }
    );

    // Set HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
        `auth_token=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
        `Max-Age=${7 * 24 * 60 * 60}`,
        isProduction ? 'Secure' : ''
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    return res.status(200).json({
        success: true,
        user: {
            username: user.username,
            displayName: user.displayName
        }
    });
}
