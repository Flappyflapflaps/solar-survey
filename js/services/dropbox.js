// Dropbox Service - OAuth2 PKCE flow, folder browsing, and file upload

import { DROPBOX_CONFIG, isDropboxConfigured } from '../config/dropbox.js';

class DropboxService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.STORAGE_KEY = 'dropbox_auth';
        this.LAST_FOLDER_KEY = 'dropbox_last_folder';
        this.loadStoredAuth();
    }

    // Load stored authentication from localStorage
    loadStoredAuth() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const auth = JSON.parse(stored);
                if (auth.expiry && Date.now() < auth.expiry) {
                    this.accessToken = auth.token;
                    this.tokenExpiry = auth.expiry;
                } else {
                    // Token expired, clear it
                    this.clearAuth();
                }
            }
        } catch (e) {
            console.error('Error loading stored auth:', e);
        }
    }

    // Save authentication to localStorage
    saveAuth(token, expiresIn) {
        this.accessToken = token;
        // Set expiry 5 minutes before actual expiry for safety
        this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            token: this.accessToken,
            expiry: this.tokenExpiry
        }));
    }

    // Clear authentication
    clearAuth() {
        this.accessToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem(this.STORAGE_KEY);
    }

    // Check if authenticated
    isAuthenticated() {
        return this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry;
    }

    // Generate random string for PKCE
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);
        for (let i = 0; i < length; i++) {
            result += chars[randomValues[i] % chars.length];
        }
        return result;
    }

    // Generate PKCE code verifier and challenge
    async generatePKCE() {
        const verifier = this.generateRandomString(128);
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        return { verifier, challenge: base64 };
    }

    // Start OAuth2 flow
    async startAuth() {
        if (!isDropboxConfigured()) {
            throw new Error('Dropbox is not configured. Please add your App Key in js/config/dropbox.js');
        }

        const { verifier, challenge } = await this.generatePKCE();

        // Store verifier for later
        sessionStorage.setItem('dropbox_code_verifier', verifier);
        sessionStorage.setItem('dropbox_auth_started', 'true');

        const params = new URLSearchParams({
            client_id: DROPBOX_CONFIG.APP_KEY,
            response_type: 'code',
            code_challenge: challenge,
            code_challenge_method: 'S256',
            redirect_uri: DROPBOX_CONFIG.REDIRECT_URI,
            token_access_type: 'offline'
        });

        const authUrl = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
        window.location.href = authUrl;
    }

    // Handle OAuth2 callback
    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const wasAuthStarted = sessionStorage.getItem('dropbox_auth_started');

        // Clean up URL
        if (code || error) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (error) {
            sessionStorage.removeItem('dropbox_auth_started');
            sessionStorage.removeItem('dropbox_code_verifier');
            throw new Error(`Dropbox authorization failed: ${error}`);
        }

        if (!code || !wasAuthStarted) {
            return false;
        }

        const verifier = sessionStorage.getItem('dropbox_code_verifier');
        if (!verifier) {
            throw new Error('Code verifier not found. Please try again.');
        }

        // Exchange code for token
        const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code: code,
                grant_type: 'authorization_code',
                client_id: DROPBOX_CONFIG.APP_KEY,
                redirect_uri: DROPBOX_CONFIG.REDIRECT_URI,
                code_verifier: verifier
            })
        });

        sessionStorage.removeItem('dropbox_auth_started');
        sessionStorage.removeItem('dropbox_code_verifier');

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
        }

        const data = await response.json();
        this.saveAuth(data.access_token, data.expires_in || 14400); // Default 4 hours

        return true;
    }

    // List folder contents
    async listFolder(path = '') {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: path || '',
                recursive: false,
                include_deleted: false,
                include_has_explicit_shared_members: false,
                include_mounted_folders: true,
                limit: 100
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearAuth();
                throw new Error('Session expired. Please sign in again.');
            }
            const errorData = await response.json();
            throw new Error(errorData.error_summary || 'Failed to list folder');
        }

        const data = await response.json();

        // Filter to only folders and sort alphabetically
        const folders = data.entries
            .filter(entry => entry['.tag'] === 'folder')
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            folders,
            hasMore: data.has_more,
            cursor: data.cursor
        };
    }

    // List folder contents with files included
    async listFolderWithFiles(path = '', fileFilter = null) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: path || '',
                recursive: false,
                include_deleted: false,
                include_has_explicit_shared_members: false,
                include_mounted_folders: true,
                limit: 500
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearAuth();
                throw new Error('Session expired. Please sign in again.');
            }
            const errorData = await response.json();
            throw new Error(errorData.error_summary || 'Failed to list folder');
        }

        const data = await response.json();

        // Separate folders and files
        const folders = data.entries
            .filter(entry => entry['.tag'] === 'folder')
            .sort((a, b) => a.name.localeCompare(b.name));

        let files = data.entries
            .filter(entry => entry['.tag'] === 'file');

        // Apply file filter if provided (regex or function)
        if (fileFilter) {
            if (fileFilter instanceof RegExp) {
                files = files.filter(f => fileFilter.test(f.name));
            } else if (typeof fileFilter === 'function') {
                files = files.filter(fileFilter);
            }
        }

        files.sort((a, b) => a.name.localeCompare(b.name));

        return {
            folders,
            files,
            hasMore: data.has_more,
            cursor: data.cursor
        };
    }

    // Download a file from Dropbox
    async downloadFile(path) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Dropbox-API-Arg': JSON.stringify({ path })
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearAuth();
                throw new Error('Session expired. Please sign in again.');
            }
            const errorData = await response.json();
            throw new Error(errorData.error_summary || 'Failed to download file');
        }

        return await response.arrayBuffer();
    }

    // Create folder if it doesn't exist
    async createFolderIfNotExists(path) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: path,
                    autorename: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                // Ignore "folder already exists" error
                if (errorData.error_summary && errorData.error_summary.includes('path/conflict/folder')) {
                    return { exists: true };
                }
                throw new Error(errorData.error_summary || 'Failed to create folder');
            }

            return await response.json();
        } catch (error) {
            // Folder might already exist, which is fine
            if (error.message.includes('path/conflict')) {
                return { exists: true };
            }
            throw error;
        }
    }

    // Upload file to Dropbox
    async uploadFile(path, content, filename) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const fullPath = path ? `${path}/${filename}` : `/${filename}`;

        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                    path: fullPath,
                    mode: 'add',
                    autorename: true,
                    mute: false
                })
            },
            body: content
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearAuth();
                throw new Error('Session expired. Please sign in again.');
            }
            const errorData = await response.json();
            throw new Error(errorData.error_summary || 'Failed to upload file');
        }

        return await response.json();
    }

    // Get last used folder
    getLastFolder() {
        try {
            const stored = localStorage.getItem(this.LAST_FOLDER_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    }

    // Save last used folder
    saveLastFolder(path, name) {
        localStorage.setItem(this.LAST_FOLDER_KEY, JSON.stringify({ path, name }));
    }

    // Sign out
    signOut() {
        this.clearAuth();
        localStorage.removeItem(this.LAST_FOLDER_KEY);
    }
}

export const dropboxService = new DropboxService();
