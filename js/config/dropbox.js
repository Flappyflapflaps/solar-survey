// Dropbox Configuration
// To set up Dropbox integration:
// 1. Go to https://www.dropbox.com/developers/apps
// 2. Click "Create app"
// 3. Choose "Scoped access" and "Full Dropbox" (or "App folder" if you prefer)
// 4. Name your app (e.g., "Solar Survey Upload")
// 5. In the app settings, add your redirect URI (e.g., https://yourdomain.com/index.html)
// 6. Copy the "App key" and paste it below

export const DROPBOX_CONFIG = {
    // Paste your Dropbox App Key here
    APP_KEY: 'foqgz6uy1ugd7en',

    // Redirect URI - must match exactly what's configured in Dropbox App Console
    REDIRECT_URI: 'http://localhost:8000/index.html',

    // Default export format for Dropbox upload
    DEFAULT_FORMAT: 'xlsx' // 'xlsx', 'pdf', or 'csv'
};

// Check if Dropbox is configured
export function isDropboxConfigured() {
    return DROPBOX_CONFIG.APP_KEY &&
           DROPBOX_CONFIG.APP_KEY !== 'YOUR_APP_KEY_HERE' &&
           DROPBOX_CONFIG.APP_KEY.length > 0;
}
