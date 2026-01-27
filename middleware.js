// Vercel Edge Middleware - JWT Authentication
import { jwtVerify } from 'jose';

export const config = {
    matcher: [
        // Protect all routes except login, api, and static assets
        '/((?!login\\.html|api|_next/static|_next/image|favicon\\.ico|icon-.*\\.png|apple-touch-icon.*\\.png|splash-.*\\.png|manifest\\.json|public/.*|.*\\.webp).*)'
    ]
};

export default async function middleware(request) {
    const url = new URL(request.url);

    // Allow service worker
    if (url.pathname === '/service-worker.js') {
        return;
    }

    // Get JWT secret from environment
    const jwtSecret = process.env.AUTH_JWT_SECRET;

    if (!jwtSecret) {
        console.error('AUTH_JWT_SECRET not configured');
        return new Response('Server configuration error', { status: 500 });
    }

    // Parse cookie from request
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
        // No token - redirect to login
        const loginUrl = new URL('/login.html', request.url);
        loginUrl.searchParams.set('redirect', url.pathname);
        return Response.redirect(loginUrl.toString(), 302);
    }

    try {
        // Verify JWT using jose (Edge-compatible)
        const secret = new TextEncoder().encode(jwtSecret);
        await jwtVerify(token, secret, {
            algorithms: ['HS256']
        });

        // Token valid - allow request
        return;

    } catch (error) {
        // Invalid token - redirect to login
        const loginUrl = new URL('/login.html', request.url);
        loginUrl.searchParams.set('redirect', url.pathname);

        // Clear invalid cookie
        return new Response(null, {
            status: 302,
            headers: {
                'Location': loginUrl.toString(),
                'Set-Cookie': 'auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
            }
        });
    }
}
