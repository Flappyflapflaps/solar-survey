// Form Builder - UI for creating and editing form templates
import { createElement, $, on } from '../../utils/dom.js';
import { getFieldTypes, getDefaultFieldConfig, validateFieldConfig } from './FieldFactory.js';
import { formTemplateStorage } from '../../services/formTemplateStorage.js';
import { FieldEditor } from './FieldEditor.js';
import { FormRenderer } from './FormRenderer.js';

export class FormBuilder {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' ? $(`#${containerId}`) : containerId;
        this.options = {
            onSave: null,
            onCancel: null,
            onPreview: null,
            ...options
        };

        this.template = null;
        this.fields = [];
        this.cleanupFunctions = [];
        this.fieldEditor = null;
        this.previewRenderer = null;

        this.init();
    }

    init() {
        if (!this.container) {
            console.error('FormBuilder: Container not found');
            return;
        }

        this.createNewTemplate();
        this.render();
    }

    createNewTemplate() {
        this.template = {
            id: null,
            name: '',
            description: '',
            version: 0,
            fields: []
        };
        this.fields = [];
    }

    loadTemplate(template) {
        this.template = { ...template };
        this.fields = [...(template.fields || [])].sort((a, b) => a.order - b.order);
        this.render();
    }

    render() {
        this.container.innerHTML = '';

        const wrapper = createElement('div', { className: 'form-builder-wrapper' });

        // Header
        const header = this.createHeader();
        wrapper.appendChild(header);

        // Template info section
        const infoSection = this.createInfoSection();
        wrapper.appendChild(infoSection);

        // Fields section
        const fieldsSection = this.createFieldsSection();
        wrapper.appendChild(fieldsSection);

        // Add field buttons
        const addFieldSection = this.createAddFieldSection();
        wrapper.appendChild(addFieldSection);

        // Action buttons
        const actionsSection = this.createActionsSection();
        wrapper.appendChild(actionsSection);

        this.container.appendChild(wrapper);
    }

    createHeader() {
        const header = createElement('div', { className: 'form-builder-header' });

        const title = createElement('h2', {
            className: 'form-builder-title',
            textContent: this.template.id ? 'Edit Form Template' : 'Create New Form'
        });
        header.appendChild(title);

        return header;
    }

    createInfoSection() {
        const section = createElement('div', { className: 'form-builder-section' });

        // Template name input
        const nameGroup = createElement('div', { className: 'form-group' });
        const nameLabel = createElement('label', {
            htmlFor: 'templateName',
            textContent: 'Form Name *'
        });
        const nameInput = createElement('input', {
            type: 'text',
            id: 'templateName',
            className: 'form-builder-input',
            placeholder: 'Enter form name...',
            value: this.template.name || ''
        });

        const nameCleanup = on(nameInput, 'input', (e) => {
            this.template.name = e.target.value;
        });
        this.cleanupFunctions.push(nameCleanup);

        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);
        section.appendChild(nameGroup);

        // Template description input
        const descGroup = createElement('div', { className: 'form-group' });
        const descLabel = createElement('label', {
            htmlFor: 'templateDescription',
            textContent: 'Description'
        });
        const descInput = createElement('textarea', {
            id: 'templateDescription',
            className: 'form-builder-input form-builder-textarea',
            placeholder: 'Enter form description...',
            rows: 2
        });
        descInput.value = this.template.description || '';

        const descCleanup = on(descInput, 'input', (e) => {
            this.template.description = e.target.value;
        });
        this.cleanupFunctions.push(descCleanup);

        descGroup.appendChild(descLabel);
        descGroup.appendChild(descInput);
        section.appendChild(descGroup);

        return section;
    }

    createFieldsSection() {
        const section = createElement('div', { className: 'form-builder-section' });

        const heading = createElement('h3', {
            className: 'form-builder-section-title',
            textContent: 'Fields'
        });
        section.appendChild(heading);

        const fieldsList = createElement('div', {
            className: 'form-builder-fields-list',
            id: 'builderFieldsList'
        });

        if (this.fields.length === 0) {
            const empty = createElement('div', {
                className: 'form-builder-empty',
                textContent: 'No fields yet. Add fields using the buttons below.'
            });
            fieldsList.appendChild(empty);
        } else {
            this.fields.forEach((field, index) => {
                const fieldItem = this.createFieldItem(field, index);
                fieldsList.appendChild(fieldItem);
            });
        }

        section.appendChild(fieldsList);
        return section;
    }

    createFieldItem(field, index) {
        const item = createElement('div', {
            className: 'form-builder-field-item',
            'data-field-id': field.id
        });

        // Drag handle / reorder buttons
        const reorderBtns = createElement('div', { className: 'field-reorder-buttons' });

        const upBtn = createElement('button', {
            type: 'button',
            className: 'field-reorder-btn',
            textContent: '▲',
            disabled: index === 0
        });
        const upCleanup = on(upBtn, 'click', () => this.moveField(index, -1));
        this.cleanupFunctions.push(upCleanup);

        const downBtn = createElement('button', {
            type: 'button',
            className: 'field-reorder-btn',
            textContent: '▼',
            disabled: index === this.fields.length - 1
        });
        const downCleanup = on(downBtn, 'click', () => this.moveField(index, 1));
        this.cleanupFunctions.push(downCleanup);

        reorderBtns.appendChild(upBtn);
        reorderBtns.appendChild(downBtn);
        item.appendChild(reorderBtns);

        // Field info
        const info = createElement('div', { className: 'field-info' });

        const label = createElement('span', {
            className: 'field-label',
            textContent: field.label
        });

        const type = createElement('span', {
            className: 'field-type',
            textContent: `(${field.type})`
        });

        const requiredBadge = field.required
            ? createElement('span', { className: 'field-required-badge', textContent: 'Required' })
            : null;

        info.appendChild(label);
        info.appendChild(type);
        if (requiredBadge) info.appendChild(requiredBadge);
        item.appendChild(info);

        // Action buttons
        const actions = createElement('div', { className: 'field-actions' });

        const editBtn = createElement('button', {
            type: 'button',
            className: 'field-action-btn field-edit-btn',
            textContent: 'Edit'
        });
        const editCleanup = on(editBtn, 'click', () => this.editField(index));
        this.cleanupFunctions.push(editCleanup);

        const deleteBtn = createElement('button', {
            type: 'button',
            className: 'field-action-btn field-delete-btn',
            textContent: '×'
        });
        const deleteCleanup = on(deleteBtn, 'click', () => this.deleteField(index));
        this.cleanupFunctions.push(deleteCleanup);

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);

        return item;
    }

    createAddFieldSection() {
        const section = createElement('div', { className: 'form-builder-section form-builder-add-section' });

        const heading = createElement('h4', {
            className: 'form-builder-add-title',
            textContent: 'Add Field:'
        });
        section.appendChild(heading);

        const buttonsWrapper = createElement('div', { className: 'form-builder-add-buttons' });

        const fieldTypes = getFieldTypes();
        fieldTypes.forEach(({ type, label, icon }) => {
            const btn = createElement('button', {
                type: 'button',
                className: 'form-builder-add-btn',
                'data-field-type': type
            });
            btn.innerHTML = `<span class="add-btn-icon">${icon}</span><span class="add-btn-label">${label}</span>`;

            const cleanup = on(btn, 'click', () => this.addField(type));
            this.cleanupFunctions.push(cleanup);

            buttonsWrapper.appendChild(btn);
        });

        section.appendChild(buttonsWrapper);
        return section;
    }

    createActionsSection() {
        const section = createElement('div', { className: 'form-builder-actions' });

        // Preview button
        const previewBtn = createElement('button', {
            type: 'button',
            className: 'btn-secondary form-builder-btn',
            textContent: 'Preview'
        });
        const previewCleanup = on(previewBtn, 'click', () => this.preview());
        this.cleanupFunctions.push(previewCleanup);

        // Cancel button
        const cancelBtn = createElement('button', {
            type: 'button',
            className: 'btn-secondary form-builder-btn',
            textContent: 'Cancel'
        });
        const cancelCleanup = on(cancelBtn, 'click', () => this.cancel());
        this.cleanupFunctions.push(cancelCleanup);

        // Save button
        const saveBtn = createElement('button', {
            type: 'button',
            className: 'btn-primary form-builder-btn',
            textContent: 'Save Template'
        });
        const saveCleanup = on(saveBtn, 'click', () => this.save());
        this.cleanupFunctions.push(saveCleanup);

        section.appendChild(previewBtn);
        section.appendChild(cancelBtn);
        section.appendChild(saveBtn);

        return section;
    }

    addField(type) {
        const order = this.fields.length;
        const fieldConfig = getDefaultFieldConfig(type, order);

        if (fieldConfig) {
            this.fields.push(fieldConfig);
            this.render();
        }
    }

    editField(index) {
        const field = this.fields[index];
        if (!field) return;

        this.fieldEditor = new FieldEditor(field, (updatedField) => {
            this.fields[index] = updatedField;
            this.render();
        });
        this.fieldEditor.show();
    }

    deleteField(index) {
        if (!confirm('Are you sure you want to delete this field?')) {
            return;
        }

        this.fields.splice(index, 1);
        // Update order values
        this.fields.forEach((field, i) => {
            field.order = i;
        });
        this.render();
    }

    moveField(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.fields.length) return;

        // Swap fields
        const temp = this.fields[index];
        this.fields[index] = this.fields[newIndex];
        this.fields[newIndex] = temp;

        // Update order values
        this.fields.forEach((field, i) => {
            field.order = i;
        });

        this.render();
    }

    validate() {
        const errors = [];

        if (!this.template.name || this.template.name.trim() === '') {
            errors.push('Form name is required');
        }

        if (this.fields.length === 0) {
            errors.push('Form must have at least one field');
        }

        this.fields.forEach(field => {
            const validation = validateFieldConfig(field);
            if (!validation.isValid) {
                errors.push(...validation.errors.map(e => `${field.label}: ${e}`));
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    preview() {
        const validation = this.validate();
        if (!validation.isValid) {
            alert('Cannot preview:\n' + validation.errors.join('\n'));
            return;
        }

        // Create preview template
        const previewTemplate = {
            ...this.template,
            fields: this.fields
        };

        if (this.options.onPreview) {
            this.options.onPreview(previewTemplate);
        } else {
            // Default: open in modal
            this.showPreviewModal(previewTemplate);
        }
    }

    showPreviewModal(template) {
        // Create modal overlay
        const overlay = createElement('div', { className: 'form-builder-modal-overlay' });

        const modal = createElement('div', { className: 'form-builder-modal form-builder-preview-modal' });

        // Modal header
        const header = createElement('div', { className: 'form-builder-modal-header' });
        const title = createElement('h3', { textContent: 'Form Preview' });
        const closeBtn = createElement('button', {
            type: 'button',
            className: 'form-builder-modal-close',
            textContent: '×'
        });

        header.appendChild(title);
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // Modal body - render the form
        const body = createElement('div', { className: 'form-builder-modal-body' });
        modal.appendChild(body);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Render form preview
        this.previewRenderer = new FormRenderer(body, template);

        // Close handlers
        const closeModal = () => {
            if (this.previewRenderer) {
                this.previewRenderer.destroy();
                this.previewRenderer = null;
            }
            overlay.remove();
        };

        on(closeBtn, 'click', closeModal);
        on(overlay, 'click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }

    save() {
        const validation = this.validate();
        if (!validation.isValid) {
            alert('Cannot save:\n' + validation.errors.join('\n'));
            return;
        }

        // Prepare template for saving
        const templateToSave = {
            ...this.template,
            fields: this.fields
        };

        const result = formTemplateStorage.saveTemplate(templateToSave);

        if (result.success) {
            this.template = result.template;
            alert('Template saved successfully!');

            if (this.options.onSave) {
                this.options.onSave(result.template);
            }
        } else {
            alert('Error saving template: ' + result.error);
        }
    }

    cancel() {
        if (this.fields.length > 0) {
            if (!confirm('Discard changes?')) {
                return;
            }
        }

        if (this.options.onCancel) {
            this.options.onCancel();
        }
    }

    getTemplate() {
        return {
            ...this.template,
            fields: this.fields
        };
    }

    destroy() {
        this.cleanupFunctions.forEach(cleanup => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
        });
        this.cleanupFunctions = [];

        if (this.fieldEditor) {
            this.fieldEditor.destroy();
            this.fieldEditor = null;
        }

        if (this.previewRenderer) {
            this.previewRenderer.destroy();
            this.previewRenderer = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
