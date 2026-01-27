// Dropbox Folder Picker Component

import { dropboxService } from '../services/dropbox.js';
import { isDropboxConfigured } from '../config/dropbox.js';

export class DropboxFolderPicker {
    constructor(onSelect, onCancel) {
        this.onSelect = onSelect;
        this.onCancel = onCancel;
        this.currentPath = '';
        this.pathHistory = [];
        this.modal = null;
        this.isLoading = false;
    }

    // Show the folder picker modal
    async show() {
        if (!isDropboxConfigured()) {
            alert('Dropbox is not configured. Please add your App Key in js/config/dropbox.js');
            return;
        }

        // Check if authenticated
        if (!dropboxService.isAuthenticated()) {
            // Start OAuth flow
            await dropboxService.startAuth();
            return;
        }

        this.createModal();
        document.body.appendChild(this.modal);

        // Check for last used folder
        const lastFolder = dropboxService.getLastFolder();
        if (lastFolder) {
            this.currentPath = lastFolder.path;
            this.pathHistory = this.buildPathHistory(lastFolder.path);
        }

        await this.loadFolder(this.currentPath);
    }

    // Build path history from a path string
    buildPathHistory(path) {
        if (!path) return [];
        const parts = path.split('/').filter(p => p);
        const history = [];
        let currentPath = '';
        for (const part of parts) {
            currentPath += '/' + part;
            history.push({ path: currentPath, name: part });
        }
        return history;
    }

    // Create the modal HTML
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'dropbox-modal-overlay';
        this.modal.innerHTML = `
            <div class="dropbox-modal">
                <div class="dropbox-modal-header">
                    <h3>Select Customer Folder</h3>
                    <button class="dropbox-close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="dropbox-breadcrumb">
                    <button class="dropbox-breadcrumb-item dropbox-home" data-path="">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3L4 9v12h16V9l-8-6zm6 16h-4v-5h-4v5H6v-9.5l6-4.5 6 4.5V19z"/>
                        </svg>
                        Dropbox
                    </button>
                </div>
                <div class="dropbox-folder-list">
                    <div class="dropbox-loading">Loading...</div>
                </div>
                <div class="dropbox-modal-footer">
                    <div class="dropbox-selected-path">
                        <span class="dropbox-path-label">Upload to:</span>
                        <span class="dropbox-path-value">/</span>
                    </div>
                    <div class="dropbox-modal-actions">
                        <button class="dropbox-btn dropbox-btn-cancel">Cancel</button>
                        <button class="dropbox-btn dropbox-btn-select">Select This Folder</button>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        this.modal.querySelector('.dropbox-close-btn').addEventListener('click', () => this.close());
        this.modal.querySelector('.dropbox-btn-cancel').addEventListener('click', () => this.close());
        this.modal.querySelector('.dropbox-btn-select').addEventListener('click', () => this.selectFolder());
        this.modal.querySelector('.dropbox-modal-overlay').addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Home button
        this.modal.querySelector('.dropbox-home').addEventListener('click', () => {
            this.navigateTo('', 'Dropbox');
        });
    }

    // Load folder contents
    async loadFolder(path) {
        if (this.isLoading) return;
        this.isLoading = true;

        const listContainer = this.modal.querySelector('.dropbox-folder-list');
        listContainer.innerHTML = '<div class="dropbox-loading">Loading folders...</div>';

        try {
            const { folders } = await dropboxService.listFolder(path);
            this.renderFolders(folders);
            this.updateBreadcrumb();
            this.updateSelectedPath();
        } catch (error) {
            console.error('Error loading folder:', error);
            if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
                listContainer.innerHTML = `
                    <div class="dropbox-error">
                        <p>Session expired. Please sign in again.</p>
                        <button class="dropbox-btn dropbox-btn-select dropbox-sign-in">Sign In to Dropbox</button>
                    </div>
                `;
                listContainer.querySelector('.dropbox-sign-in').addEventListener('click', async () => {
                    await dropboxService.startAuth();
                });
            } else {
                listContainer.innerHTML = `
                    <div class="dropbox-error">
                        <p>Error: ${error.message}</p>
                        <button class="dropbox-btn dropbox-btn-cancel dropbox-retry">Retry</button>
                    </div>
                `;
                listContainer.querySelector('.dropbox-retry').addEventListener('click', () => {
                    this.loadFolder(this.currentPath);
                });
            }
        }

        this.isLoading = false;
    }

    // Render folder list
    renderFolders(folders) {
        const listContainer = this.modal.querySelector('.dropbox-folder-list');

        if (folders.length === 0) {
            listContainer.innerHTML = `
                <div class="dropbox-empty">
                    <p>No subfolders in this location.</p>
                    <p class="dropbox-hint">You can upload to this folder.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = '';

        folders.forEach(folder => {
            const item = document.createElement('button');
            item.className = 'dropbox-folder-item';
            item.innerHTML = `
                <svg class="dropbox-folder-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                </svg>
                <span class="dropbox-folder-name">${this.escapeHtml(folder.name)}</span>
                <svg class="dropbox-chevron" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            `;
            item.addEventListener('click', () => {
                this.navigateTo(folder.path_lower, folder.name);
            });
            listContainer.appendChild(item);
        });
    }

    // Navigate to a folder
    async navigateTo(path, name) {
        if (path === '') {
            this.pathHistory = [];
        } else if (path !== this.currentPath) {
            // Check if going back or forward
            const existingIndex = this.pathHistory.findIndex(h => h.path === path);
            if (existingIndex >= 0) {
                this.pathHistory = this.pathHistory.slice(0, existingIndex + 1);
            } else {
                this.pathHistory.push({ path, name });
            }
        }
        this.currentPath = path;
        await this.loadFolder(path);
    }

    // Update breadcrumb navigation
    updateBreadcrumb() {
        const breadcrumb = this.modal.querySelector('.dropbox-breadcrumb');

        // Keep the home button, remove others
        const homeBtn = breadcrumb.querySelector('.dropbox-home');
        breadcrumb.innerHTML = '';
        breadcrumb.appendChild(homeBtn);

        // Add path items
        this.pathHistory.forEach((item, index) => {
            const separator = document.createElement('span');
            separator.className = 'dropbox-breadcrumb-separator';
            separator.textContent = '/';
            breadcrumb.appendChild(separator);

            const btn = document.createElement('button');
            btn.className = 'dropbox-breadcrumb-item';
            btn.textContent = item.name;
            btn.dataset.path = item.path;
            btn.addEventListener('click', () => {
                this.navigateTo(item.path, item.name);
            });
            breadcrumb.appendChild(btn);
        });
    }

    // Update selected path display
    updateSelectedPath() {
        const pathValue = this.modal.querySelector('.dropbox-path-value');
        pathValue.textContent = this.currentPath || '/ (root)';
    }

    // Select current folder
    selectFolder() {
        const folderName = this.pathHistory.length > 0
            ? this.pathHistory[this.pathHistory.length - 1].name
            : 'Dropbox Root';

        dropboxService.saveLastFolder(this.currentPath, folderName);

        if (this.onSelect) {
            this.onSelect(this.currentPath, folderName);
        }
        this.close();
    }

    // Close modal
    close() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        if (this.onCancel) {
            this.onCancel();
        }
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
