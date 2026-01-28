// Drafts Picker Component - For saving and loading survey drafts

import { storageService } from '../services/storage.js';

export class DraftsPicker {
    constructor(onLoad, onCancel) {
        this.onLoad = onLoad;
        this.onCancel = onCancel;
        this.modal = null;
    }

    // Show the drafts picker modal
    show() {
        this.createModal();
        document.body.appendChild(this.modal);
        this.renderDrafts();
    }

    // Create the modal HTML
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'drafts-modal-overlay';
        this.modal.innerHTML = `
            <div class="drafts-modal">
                <div class="drafts-modal-header">
                    <h3>Saved Drafts</h3>
                    <button class="drafts-close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="drafts-list">
                    <!-- Drafts will be rendered here -->
                </div>
                <div class="drafts-modal-footer">
                    <button class="drafts-btn drafts-btn-cancel">Close</button>
                </div>
            </div>
        `;

        // Event listeners
        this.modal.querySelector('.drafts-close-btn').addEventListener('click', () => this.close());
        this.modal.querySelector('.drafts-btn-cancel').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    // Render the list of drafts
    renderDrafts() {
        const listContainer = this.modal.querySelector('.drafts-list');
        const drafts = storageService.listDrafts();

        if (drafts.length === 0) {
            listContainer.innerHTML = `
                <div class="drafts-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.3; margin-bottom: 0.5rem;">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                    </svg>
                    <p>No saved drafts yet.</p>
                    <p class="drafts-hint">Use "Save Draft" to save your current progress.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = '';

        drafts.forEach(draft => {
            const item = document.createElement('div');
            item.className = 'drafts-item';

            const dateStr = this.formatDate(draft.timestamp);
            const subtitle = [draft.customerName, draft.postCode].filter(Boolean).join(' - ') || 'No customer info';

            item.innerHTML = `
                <div class="drafts-item-content">
                    <div class="drafts-item-main">
                        <span class="drafts-item-name">${this.escapeHtml(draft.name)}</span>
                        <span class="drafts-item-subtitle">${this.escapeHtml(subtitle)}</span>
                    </div>
                    <span class="drafts-item-date">${dateStr}</span>
                </div>
                <div class="drafts-item-actions">
                    <button class="drafts-btn drafts-btn-load" data-id="${draft.id}" title="Load this draft">Load</button>
                    <button class="drafts-btn drafts-btn-delete" data-id="${draft.id}" title="Delete this draft">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            `;

            // Load button handler
            item.querySelector('.drafts-btn-load').addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadDraft(draft);
            });

            // Delete button handler
            item.querySelector('.drafts-btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteDraft(draft);
            });

            // Click on item also loads
            item.querySelector('.drafts-item-content').addEventListener('click', () => {
                this.loadDraft(draft);
            });

            listContainer.appendChild(item);
        });
    }

    // Load a draft
    loadDraft(draft) {
        if (!confirm(`Load "${draft.name}"?\n\nThis will replace your current form data.`)) {
            return;
        }

        const result = storageService.loadDraft(draft.id);
        if (!result.success) {
            alert('Failed to load draft: ' + result.error);
            return;
        }

        if (this.onLoad) {
            this.onLoad(result.data, result.roofAspectCount, draft);
        }
        this.close(false); // Don't trigger onCancel
    }

    // Delete a draft
    deleteDraft(draft) {
        if (!confirm(`Delete "${draft.name}"?\n\nThis cannot be undone.`)) {
            return;
        }

        const result = storageService.deleteDraft(draft.id);
        if (!result.success) {
            alert('Failed to delete draft: ' + result.error);
            return;
        }

        // Re-render the list
        this.renderDrafts();
    }

    // Format timestamp to readable date
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            // Today - show time
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
        }
    }

    // Close modal
    close(triggerCancel = true) {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        if (triggerCancel && this.onCancel) {
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
