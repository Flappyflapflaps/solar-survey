// Template Picker - Modal for selecting saved form templates
import { createElement, on } from '../../utils/dom.js';
import { formTemplateStorage } from '../../services/formTemplateStorage.js';

export class TemplatePicker {
    constructor(options = {}) {
        this.options = {
            onSelect: null,
            onEdit: null,
            onDelete: null,
            onCancel: null,
            mode: 'select', // 'select', 'manage'
            ...options
        };

        this.modal = null;
        this.overlay = null;
        this.templates = [];
        this.cleanupFunctions = [];
    }

    show() {
        this.loadTemplates();
        this.createModal();
        document.body.appendChild(this.overlay);
    }

    loadTemplates() {
        this.templates = formTemplateStorage.listTemplates();
    }

    createModal() {
        // Overlay
        this.overlay = createElement('div', { className: 'form-builder-modal-overlay' });

        // Modal
        this.modal = createElement('div', { className: 'form-builder-modal template-picker-modal' });

        // Header
        const header = createElement('div', { className: 'form-builder-modal-header' });
        const title = createElement('h3', { textContent: 'Select Form Template' });
        const closeBtn = createElement('button', {
            type: 'button',
            className: 'form-builder-modal-close',
            textContent: '×'
        });
        const closeCleanup = on(closeBtn, 'click', () => this.close());
        this.cleanupFunctions.push(closeCleanup);

        header.appendChild(title);
        header.appendChild(closeBtn);
        this.modal.appendChild(header);

        // Body
        const body = createElement('div', { className: 'form-builder-modal-body template-picker-body' });
        this.renderTemplatesList(body);
        this.modal.appendChild(body);

        // Footer
        const footer = createElement('div', { className: 'form-builder-modal-footer' });
        const cancelBtn = createElement('button', {
            type: 'button',
            className: 'btn-secondary',
            textContent: 'Cancel'
        });
        const cancelCleanup = on(cancelBtn, 'click', () => this.close());
        this.cleanupFunctions.push(cancelCleanup);

        footer.appendChild(cancelBtn);
        this.modal.appendChild(footer);

        this.overlay.appendChild(this.modal);

        // Click outside to close
        const overlayCleanup = on(this.overlay, 'click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        this.cleanupFunctions.push(overlayCleanup);
    }

    renderTemplatesList(container) {
        container.innerHTML = '';

        if (this.templates.length === 0) {
            const empty = createElement('div', { className: 'template-picker-empty' });
            empty.innerHTML = `
                <p>No form templates yet.</p>
                <p class="template-picker-hint">Create a new form template to get started.</p>
            `;
            container.appendChild(empty);
            return;
        }

        const list = createElement('div', { className: 'template-picker-list' });

        this.templates.forEach(template => {
            const item = this.createTemplateItem(template);
            list.appendChild(item);
        });

        container.appendChild(list);
    }

    createTemplateItem(template) {
        const item = createElement('div', {
            className: 'template-picker-item',
            'data-template-id': template.id
        });

        // Template info
        const info = createElement('div', { className: 'template-picker-item-info' });

        const name = createElement('div', {
            className: 'template-picker-item-name',
            textContent: template.name
        });

        const meta = createElement('div', { className: 'template-picker-item-meta' });

        const fieldCount = createElement('span', {
            className: 'template-meta-fields',
            textContent: `${template.fieldCount} field${template.fieldCount !== 1 ? 's' : ''}`
        });

        const date = createElement('span', {
            className: 'template-meta-date',
            textContent: this.formatDate(template.updatedAt)
        });

        meta.appendChild(fieldCount);
        meta.appendChild(date);

        info.appendChild(name);
        if (template.description) {
            const desc = createElement('div', {
                className: 'template-picker-item-desc',
                textContent: template.description
            });
            info.appendChild(desc);
        }
        info.appendChild(meta);

        item.appendChild(info);

        // Actions
        const actions = createElement('div', { className: 'template-picker-item-actions' });

        // Select/Use button
        const selectBtn = createElement('button', {
            type: 'button',
            className: 'btn-primary btn-small',
            textContent: 'Use'
        });
        const selectCleanup = on(selectBtn, 'click', () => this.selectTemplate(template.id));
        this.cleanupFunctions.push(selectCleanup);
        actions.appendChild(selectBtn);

        // Edit button
        if (this.options.onEdit) {
            const editBtn = createElement('button', {
                type: 'button',
                className: 'btn-secondary btn-small',
                textContent: 'Edit'
            });
            const editCleanup = on(editBtn, 'click', () => this.editTemplate(template.id));
            this.cleanupFunctions.push(editCleanup);
            actions.appendChild(editBtn);
        }

        // Delete button
        const deleteBtn = createElement('button', {
            type: 'button',
            className: 'btn-danger btn-small',
            textContent: '×'
        });
        const deleteCleanup = on(deleteBtn, 'click', () => this.deleteTemplate(template.id));
        this.cleanupFunctions.push(deleteCleanup);
        actions.appendChild(deleteBtn);

        item.appendChild(actions);

        return item;
    }

    selectTemplate(id) {
        const result = formTemplateStorage.loadTemplate(id);

        if (!result.success) {
            alert('Error loading template: ' + result.error);
            return;
        }

        if (this.options.onSelect) {
            this.options.onSelect(result.template);
        }

        this.close();
    }

    editTemplate(id) {
        const result = formTemplateStorage.loadTemplate(id);

        if (!result.success) {
            alert('Error loading template: ' + result.error);
            return;
        }

        if (this.options.onEdit) {
            this.options.onEdit(result.template);
        }

        this.close();
    }

    deleteTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;

        if (!confirm(`Delete template "${template.name}"?\n\nThis will also delete any saved form data for this template.`)) {
            return;
        }

        const result = formTemplateStorage.deleteTemplate(id);

        if (!result.success) {
            alert('Error deleting template: ' + result.error);
            return;
        }

        // Refresh list
        this.loadTemplates();
        const body = this.modal.querySelector('.template-picker-body');
        if (body) {
            this.renderTemplatesList(body);
        }

        if (this.options.onDelete) {
            this.options.onDelete(id);
        }
    }

    formatDate(timestamp) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    close() {
        if (this.options.onCancel) {
            this.options.onCancel();
        }
        this.destroy();
    }

    destroy() {
        this.cleanupFunctions.forEach(cleanup => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
        });
        this.cleanupFunctions = [];

        if (this.overlay && this.overlay.parentNode) {
            this.overlay.remove();
        }

        this.modal = null;
        this.overlay = null;
    }
}
