// Job Selector Component - Lists available jobs from Dropbox and loads contract data

import { dropboxService } from '../services/dropbox.js';
import { contractParser } from '../services/contractParser.js';
import { getContractsPath, JOB_CONFIG } from '../config/jobConfig.js';

const JOBS_FOLDER_KEY = 'survey_jobs_folder';

export class JobSelector {
    constructor(onJobSelected, onCancel) {
        this.onJobSelected = onJobSelected;
        this.onCancel = onCancel;
        this.overlay = null;
        this.jobs = [];
        this.selectedJob = null;
        this.currentFolder = this.getSavedFolder() || '/Viking work';
    }

    // Get saved folder from localStorage
    getSavedFolder() {
        return localStorage.getItem(JOBS_FOLDER_KEY);
    }

    // Save folder to localStorage
    saveFolder(path) {
        localStorage.setItem(JOBS_FOLDER_KEY, path);
        this.currentFolder = path;
    }

    // Show the job selector modal
    async show() {
        this.createModal();
        document.body.appendChild(this.overlay);

        // Check authentication
        if (!dropboxService.isAuthenticated()) {
            this.showAuthPrompt();
            return;
        }

        await this.loadJobs();
    }

    // Create the modal UI
    createModal() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'dropbox-modal-overlay';
        this.overlay.innerHTML = `
            <div class="dropbox-modal job-selector-modal">
                <div class="dropbox-modal-header">
                    <h3>Select Job</h3>
                    <button class="dropbox-close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="job-folder-bar">
                    <span class="job-folder-label">Folder:</span>
                    <span class="job-folder-path">${this.currentFolder}</span>
                    <button class="job-folder-change-btn">Change</button>
                </div>
                <div class="dropbox-modal-content job-selector-content">
                    <div class="job-selector-loading">
                        <div class="dropbox-upload-spinner"></div>
                        <p>Loading jobs...</p>
                    </div>
                </div>
                <div class="dropbox-modal-footer">
                    <button class="dropbox-btn dropbox-btn-cancel">Cancel</button>
                    <button class="dropbox-btn dropbox-btn-select" disabled>Load Job</button>
                </div>
            </div>
        `;

        // Event listeners
        const closeBtn = this.overlay.querySelector('.dropbox-close-btn');
        const cancelBtn = this.overlay.querySelector('.dropbox-btn-cancel');
        const selectBtn = this.overlay.querySelector('.dropbox-btn-select');
        const changeBtn = this.overlay.querySelector('.job-folder-change-btn');

        closeBtn.addEventListener('click', () => this.close());
        cancelBtn.addEventListener('click', () => this.close());
        selectBtn.addEventListener('click', () => this.loadSelectedJob());
        changeBtn.addEventListener('click', () => this.showFolderPicker());

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }

    // Show folder picker to change jobs folder
    async showFolderPicker() {
        const content = this.overlay.querySelector('.job-selector-content');
        content.innerHTML = `
            <div class="job-selector-loading">
                <div class="dropbox-upload-spinner"></div>
                <p>Loading folders...</p>
            </div>
        `;

        this.browsingPath = this.currentFolder;
        this.pathHistory = this.buildPathHistory(this.currentFolder);
        await this.loadFolderList();
    }

    // Build path history from path string
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

    // Load folder list for browsing
    async loadFolderList() {
        const content = this.overlay.querySelector('.job-selector-content');
        const folderPathEl = this.overlay.querySelector('.job-folder-path');

        try {
            const result = await dropboxService.listFolder(this.browsingPath);
            folderPathEl.textContent = this.browsingPath || '/ (root)';

            content.innerHTML = `
                <div class="job-folder-browser">
                    <div class="job-folder-breadcrumb">
                        <button class="job-breadcrumb-item job-breadcrumb-home" data-path="">Dropbox</button>
                        ${this.pathHistory.map(item => `
                            <span class="job-breadcrumb-sep">/</span>
                            <button class="job-breadcrumb-item" data-path="${item.path}">${item.name}</button>
                        `).join('')}
                    </div>
                    <ul class="job-folder-list">
                        ${result.folders.map(folder => `
                            <li class="job-folder-item" data-path="${folder.path_lower}">
                                <span class="job-icon">📁</span>
                                <span class="job-folder-name">${folder.name}</span>
                            </li>
                        `).join('')}
                        ${result.folders.length === 0 ? '<li class="job-folder-empty">No subfolders</li>' : ''}
                    </ul>
                    <div class="job-folder-actions">
                        <button class="dropbox-btn dropbox-btn-cancel job-folder-back">Back</button>
                        <button class="dropbox-btn dropbox-btn-select job-folder-use">Use This Folder</button>
                    </div>
                </div>
            `;

            // Breadcrumb navigation
            content.querySelectorAll('.job-breadcrumb-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const path = btn.dataset.path;
                    this.browsingPath = path;
                    this.pathHistory = this.buildPathHistory(path);
                    this.loadFolderList();
                });
            });

            // Folder navigation
            content.querySelectorAll('.job-folder-item').forEach(item => {
                item.addEventListener('click', () => {
                    const path = item.dataset.path;
                    const name = item.querySelector('.job-folder-name').textContent;
                    this.browsingPath = path;
                    this.pathHistory.push({ path, name });
                    this.loadFolderList();
                });
            });

            // Back button - return to job list
            content.querySelector('.job-folder-back').addEventListener('click', () => {
                this.loadJobs();
            });

            // Use this folder button
            content.querySelector('.job-folder-use').addEventListener('click', () => {
                this.saveFolder(this.browsingPath);
                this.overlay.querySelector('.job-folder-path').textContent = this.browsingPath;
                this.loadJobs();
            });

        } catch (error) {
            console.error('Error loading folders:', error);
            content.innerHTML = `
                <div class="job-selector-error">
                    <p>Failed to load folders: ${error.message}</p>
                    <button class="dropbox-btn dropbox-btn-cancel">Back</button>
                </div>
            `;
            content.querySelector('.dropbox-btn-cancel').addEventListener('click', () => this.loadJobs());
        }
    }

    // Show authentication prompt
    showAuthPrompt() {
        const content = this.overlay.querySelector('.job-selector-content');
        content.innerHTML = `
            <div class="job-selector-auth">
                <p>Please sign in to Dropbox to access jobs.</p>
                <button class="dropbox-btn dropbox-btn-select">Sign in to Dropbox</button>
            </div>
        `;

        const signInBtn = content.querySelector('.dropbox-btn-select');
        signInBtn.addEventListener('click', async () => {
            try {
                await dropboxService.startAuth();
            } catch (error) {
                alert('Failed to start authentication: ' + error.message);
            }
        });
    }

    // Load jobs from Dropbox
    async loadJobs() {
        const content = this.overlay.querySelector('.job-selector-content');
        const folderPathEl = this.overlay.querySelector('.job-folder-path');
        folderPathEl.textContent = this.currentFolder;

        content.innerHTML = `
            <div class="job-selector-loading">
                <div class="dropbox-upload-spinner"></div>
                <p>Loading jobs...</p>
            </div>
        `;

        try {
            // List job folders and files in selected folder
            const result = await dropboxService.listFolderWithFiles(this.currentFolder);

            // Check if we're in a customer folder (1+ levels deep)
            const inCustomerFolder = this.isInCustomerFolder();

            // If in customer folder with subfolders but no PDFs, auto-navigate deeper
            if (inCustomerFolder && result.folders.length > 0) {
                // Check if there are PDFs at this level
                const hasPdfs = result.files && result.files.some(f =>
                    f.name.toLowerCase().endsWith('.pdf')
                );

                if (!hasPdfs) {
                    // No PDFs here - auto-navigate into subfolder
                    // Priority: Sales folder > Contract folder > first folder
                    const salesFolder = result.folders.find(f =>
                        f.name.toLowerCase().includes('sales')
                    );
                    const contractFolder = result.folders.find(f =>
                        f.name.toLowerCase().includes('contract')
                    );
                    const targetFolder = salesFolder || contractFolder || result.folders[0];

                    this.currentFolder = targetFolder.path_lower;
                    folderPathEl.textContent = this.currentFolder;
                    return this.loadJobs(); // Recursively load the folder
                }
            }

            // Include both folders and PDF files
            this.jobs = [];

            if (!inCustomerFolder) {
                // At root level - show all customer folders
                result.folders.forEach(folder => {
                    this.jobs.push({
                        name: folder.name,
                        path: folder.path_lower,
                        displayPath: folder.path_display,
                        type: 'folder'
                    });
                });
            }

            // Add PDF files (always show PDFs)
            if (result.files) {
                result.files.forEach(file => {
                    if (file.name.toLowerCase().endsWith('.pdf')) {
                        this.jobs.push({
                            name: file.name,
                            path: file.path_lower,
                            displayPath: file.path_display,
                            type: 'pdf'
                        });
                    }
                });
            }

            if (this.jobs.length === 0) {
                const emptyMessage = inCustomerFolder
                    ? 'No PDFs found in this folder.'
                    : 'No jobs found in this folder.';
                content.innerHTML = `
                    <div class="job-selector-empty">
                        <p>${emptyMessage}</p>
                        <p>Click <strong>..</strong> to go back or <strong>Change</strong> to select a different folder.</p>
                    </div>
                `;
                return;
            }

            this.renderJobList(content);

        } catch (error) {
            console.error('Error loading jobs:', error);
            content.innerHTML = `
                <div class="job-selector-error">
                    <p>Failed to load jobs:</p>
                    <p>${error.message}</p>
                    <button class="dropbox-btn dropbox-btn-select" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    // Get parent folder path
    getParentFolder(path) {
        if (!path || path === '/') return null;
        const parts = path.split('/').filter(p => p);
        parts.pop();
        return parts.length > 0 ? '/' + parts.join('/') : '/Viking work';
    }

    // Get navigation depth from root folder
    getDepthFromRoot() {
        const rootFolder = this.getSavedFolder() || '/Viking work';
        const rootParts = rootFolder.split('/').filter(p => p).length;
        const currentParts = this.currentFolder.split('/').filter(p => p).length;
        return currentParts - rootParts;
    }

    // Check if we're in a customer folder (should only show PDFs)
    isInCustomerFolder() {
        // If we're 1+ levels deep from root, we're in a customer folder
        return this.getDepthFromRoot() >= 1;
    }

    // Render the job list
    renderJobList(content) {
        const parentPath = this.getParentFolder(this.currentFolder);
        const inCustomerFolder = this.isInCustomerFolder();
        const searchPlaceholder = inCustomerFolder ? 'Search PDFs...' : 'Search folders and PDFs...';

        content.innerHTML = `
            <div class="job-selector-search">
                <span class="search-icon">🔍</span>
                <input type="text" placeholder="${searchPlaceholder}" class="job-search-input">
            </div>
            <ul class="job-selector-list">
                ${parentPath !== null ? `
                    <li class="job-selector-item job-back-item" data-path="${parentPath}" data-type="back">
                        <span class="job-icon">⬆️</span>
                        <span class="job-name">..</span>
                    </li>
                ` : ''}
                ${this.jobs.map(job => `
                    <li class="job-selector-item" data-path="${job.path}" data-name="${job.name}" data-type="${job.type}">
                        <span class="job-icon">${job.type === 'pdf' ? '📄' : '📁'}</span>
                        <span class="job-name">${job.name}</span>
                    </li>
                `).join('')}
            </ul>
        `;

        // Search functionality
        const searchInput = content.querySelector('.job-search-input');
        searchInput.addEventListener('input', (e) => {
            const filter = e.target.value.toLowerCase();
            const items = content.querySelectorAll('.job-selector-item');
            items.forEach(item => {
                if (item.dataset.type === 'back') return; // Always show back button
                const name = (item.dataset.name || '').toLowerCase();
                item.style.display = name.includes(filter) ? '' : 'none';
            });
        });

        // Job selection
        const items = content.querySelectorAll('.job-selector-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;

                if (type === 'folder' || type === 'back') {
                    // Navigate into folder or back
                    this.currentFolder = item.dataset.path;
                    this.loadJobs();
                } else if (type === 'pdf') {
                    // Select PDF
                    items.forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    this.selectedJob = {
                        name: item.dataset.name,
                        path: item.dataset.path,
                        type: item.dataset.type
                    };
                    this.overlay.querySelector('.dropbox-btn-select').disabled = false;
                }
            });

            // Double-click to load PDF immediately
            item.addEventListener('dblclick', () => {
                if (item.dataset.type === 'pdf') {
                    this.selectedJob = {
                        name: item.dataset.name,
                        path: item.dataset.path,
                        type: item.dataset.type
                    };
                    this.loadSelectedJob();
                }
            });
        });
    }

    // Load the selected job's contract
    async loadSelectedJob() {
        if (!this.selectedJob) return;

        const selectBtn = this.overlay.querySelector('.dropbox-btn-select');
        const content = this.overlay.querySelector('.job-selector-content');

        selectBtn.disabled = true;
        selectBtn.textContent = 'Loading...';

        content.innerHTML = `
            <div class="job-selector-loading">
                <div class="dropbox-upload-spinner"></div>
                <p>Loading contract for ${this.selectedJob.name}...</p>
            </div>
        `;

        try {
            // Find and download the contract PDF
            const contractData = await this.loadContractFromJob(this.selectedJob);

            // Close modal and pass data to callback
            this.close(false);
            this.onJobSelected(contractData, this.selectedJob);

        } catch (error) {
            console.error('Error loading contract:', error);
            content.innerHTML = `
                <div class="job-selector-error">
                    <p>Failed to load contract:</p>
                    <p>${error.message}</p>
                    <button class="dropbox-btn dropbox-btn-cancel" id="backBtn">Back to list</button>
                </div>
            `;

            const backBtn = content.querySelector('#backBtn');
            backBtn.addEventListener('click', () => this.loadJobs());

            selectBtn.disabled = false;
            selectBtn.textContent = 'Load Job';
        }
    }

    // Load contract PDF from job folder or direct PDF file and parse it
    async loadContractFromJob(job) {
        let pdfPath;
        let pdfName;

        if (job.type === 'pdf') {
            // Direct PDF selection
            pdfPath = job.path;
            pdfName = job.name;
        } else {
            // Folder selection - look for contract PDF inside
            const result = await dropboxService.listFolderWithFiles(
                job.path,
                JOB_CONFIG.CONTRACT_PATTERN
            );

            if (result.files.length === 0) {
                throw new Error(`No contract PDF found in ${job.name}. Looking for files matching F13_Contract_*.pdf`);
            }

            // Use the first matching contract
            pdfPath = result.files[0].path_lower;
            pdfName = result.files[0].name;
        }

        // Download the PDF
        const pdfBuffer = await dropboxService.downloadFile(pdfPath);

        // Parse the PDF
        const contractData = await contractParser.parseContract(pdfBuffer);

        // Add job info
        contractData.jobFolder = job.name;
        contractData.jobPath = job.path;
        contractData.pdfName = pdfName;

        return contractData;
    }

    // Close the modal
    close(triggerCancel = true) {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        if (triggerCancel && this.onCancel) {
            this.onCancel();
        }
    }
}
