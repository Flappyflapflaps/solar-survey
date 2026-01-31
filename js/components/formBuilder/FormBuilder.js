// Form Builder V3 - Enhanced UI for creating and editing form templates
// Features: Drag & drop, inline editing, duplicate, toast notifications, keyboard shortcuts
import { createElement, $, on } from '../../utils/dom.js';
import { getFieldTypes, getFieldTypesByCategory, getDefaultFieldConfig, validateFieldConfig, generateFieldName } from './FieldFactory.js';
import { formTemplateStorage } from '../../services/formTemplateStorage.js';
import { FieldEditor } from './FieldEditor.js';
import { FormRenderer } from './FormRenderer.js';
import { toast } from '../../utils/toast.js';

export class FormBuilder {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' ? $(`#${containerId}`) : containerId;
        this.options = {
            onSave: null,
            onCancel: null,
            onPreview: null,
            showLivePreview: false,
            ...options
        };

        this.template = null;
        this.fields = [];
        this.cleanupFunctions = [];
        this.fieldEditor = null;
        this.previewRenderer = null;
        this.draggedItem = null;
        this.dragOverItem = null;
        this.selectedFieldIndex = null;

        this.init();
    }

    init() {
        if (!this.container) {
            console.error('FormBuilder: Container not found');
            return;
        }

        this.createNewTemplate();
        this.render();
        this.setupKeyboardShortcuts();
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
        this.cleanup();
        this.container.innerHTML = '';

        const wrapper = createElement('div', { className: 'form-builder-wrapper form-builder-v3' });

        // Header with title and quick actions
        const header = this.createHeader();
        wrapper.appendChild(header);

        // Main content area
        const mainContent = createElement('div', { className: 'form-builder-main' });

        // Left side: Builder
        const builderPane = createElement('div', { className: 'form-builder-pane' });

        // Template info section
        const infoSection = this.createInfoSection();
        builderPane.appendChild(infoSection);

        // Quick add toolbar (V3)
        const quickAddBar = this.createQuickAddBar();
        builderPane.appendChild(quickAddBar);

        // Fields section
        const fieldsSection = this.createFieldsSection();
        builderPane.appendChild(fieldsSection);

        mainContent.appendChild(builderPane);

        // Right side: Live preview (optional)
        if (this.options.showLivePreview) {
            const previewPane = this.createLivePreviewPane();
            mainContent.appendChild(previewPane);
        }

        wrapper.appendChild(mainContent);

        // Action buttons
        const actionsSection = this.createActionsSection();
        wrapper.appendChild(actionsSection);

        this.container.appendChild(wrapper);
    }

    createHeader() {
        const header = createElement('div', { className: 'form-builder-header' });

        const titleRow = createElement('div', { className: 'form-builder-title-row' });

        const title = createElement('h2', {
            className: 'form-builder-title',
            textContent: this.template.id ? 'Edit Form Template' : 'Create New Form'
        });
        titleRow.appendChild(title);

        // V3: Quick action buttons in header
        const quickActions = createElement('div', { className: 'form-builder-quick-actions' });

        const previewBtn = createElement('button', {
            type: 'button',
            className: 'quick-action-btn',
            title: 'Preview (Ctrl+P)'
        });
        previewBtn.innerHTML = '<span class="quick-action-icon">👁</span>';
        const previewCleanup = on(previewBtn, 'click', () => this.preview());
        this.cleanupFunctions.push(previewCleanup);

        const undoBtn = createElement('button', {
            type: 'button',
            className: 'quick-action-btn',
            title: 'Undo (Ctrl+Z)',
            disabled: true
        });
        undoBtn.innerHTML = '<span class="quick-action-icon">↶</span>';

        quickActions.appendChild(previewBtn);
        quickActions.appendChild(undoBtn);
        titleRow.appendChild(quickActions);

        header.appendChild(titleRow);

        // V3: Keyboard shortcuts hint
        const shortcuts = createElement('div', {
            className: 'form-builder-shortcuts-hint',
            innerHTML: '<kbd>Ctrl+S</kbd> Save &nbsp; <kbd>Ctrl+P</kbd> Preview &nbsp; <kbd>Del</kbd> Delete field'
        });
        header.appendChild(shortcuts);

        return header;
    }

    createInfoSection() {
        const section = createElement('div', { className: 'form-builder-section form-builder-info-section' });

        // Template name and description in a row
        const infoRow = createElement('div', { className: 'form-builder-info-row' });

        // Template name input
        const nameGroup = createElement('div', { className: 'form-group form-group-name' });
        const nameLabel = createElement('label', {
            htmlFor: 'templateName',
            textContent: 'Form Name *'
        });
        const nameInput = createElement('input', {
            type: 'text',
            id: 'templateName',
            className: 'form-builder-input',
            placeholder: 'e.g., Site Inspection Form',
            value: this.template.name || ''
        });

        const nameCleanup = on(nameInput, 'input', (e) => {
            this.template.name = e.target.value;
        });
        this.cleanupFunctions.push(nameCleanup);

        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);
        infoRow.appendChild(nameGroup);

        // Template description input
        const descGroup = createElement('div', { className: 'form-group form-group-desc' });
        const descLabel = createElement('label', {
            htmlFor: 'templateDescription',
            textContent: 'Description'
        });
        const descInput = createElement('input', {
            type: 'text',
            id: 'templateDescription',
            className: 'form-builder-input',
            placeholder: 'Brief description of the form...'
        });
        descInput.value = this.template.description || '';

        const descCleanup = on(descInput, 'input', (e) => {
            this.template.description = e.target.value;
        });
        this.cleanupFunctions.push(descCleanup);

        descGroup.appendChild(descLabel);
        descGroup.appendChild(descInput);
        infoRow.appendChild(descGroup);

        section.appendChild(infoRow);

        return section;
    }

    // V3: Quick add toolbar with categorized field types
    createQuickAddBar() {
        const section = createElement('div', { className: 'form-builder-quick-add' });

        const categories = getFieldTypesByCategory();

        Object.keys(categories).forEach(catKey => {
            const category = categories[catKey];
            if (category.types.length === 0) return;

            const catGroup = createElement('div', { className: 'quick-add-category' });

            const catLabel = createElement('span', {
                className: 'quick-add-category-label',
                textContent: category.label
            });
            catGroup.appendChild(catLabel);

            const btnsWrapper = createElement('div', { className: 'quick-add-buttons' });

            category.types.forEach(({ type, label, icon }) => {
                const btn = createElement('button', {
                    type: 'button',
                    className: 'quick-add-btn',
                    'data-field-type': type,
                    title: `Add ${label} field`
                });
                btn.innerHTML = `<span class="quick-add-icon">${icon}</span><span class="quick-add-label">${label}</span>`;

                const cleanup = on(btn, 'click', () => this.addField(type));
                this.cleanupFunctions.push(cleanup);

                btnsWrapper.appendChild(btn);
            });

            catGroup.appendChild(btnsWrapper);
            section.appendChild(catGroup);
        });

        return section;
    }

    createFieldsSection() {
        const section = createElement('div', { className: 'form-builder-section' });

        const headerRow = createElement('div', { className: 'form-builder-section-header' });

        const heading = createElement('h3', {
            className: 'form-builder-section-title',
            textContent: 'Fields'
        });
        headerRow.appendChild(heading);

        const fieldCount = createElement('span', {
            className: 'field-count',
            textContent: `${this.fields.length} field${this.fields.length !== 1 ? 's' : ''}`
        });
        headerRow.appendChild(fieldCount);

        section.appendChild(headerRow);

        const fieldsList = createElement('div', {
            className: 'form-builder-fields-list',
            id: 'builderFieldsList'
        });

        if (this.fields.length === 0) {
            const empty = createElement('div', { className: 'form-builder-empty' });
            empty.innerHTML = `
                <div class="empty-icon">📝</div>
                <div class="empty-text">No fields yet</div>
                <div class="empty-hint">Click a field type above to add your first field</div>
            `;
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
            'data-field-id': field.id,
            'data-index': index,
            draggable: true
        });

        // V3: Drag handle
        const dragHandle = createElement('div', {
            className: 'field-drag-handle',
            title: 'Drag to reorder'
        });
        dragHandle.innerHTML = '⋮⋮';

        // Setup drag events
        const dragStartCleanup = on(item, 'dragstart', (e) => this.handleDragStart(e, index));
        const dragEndCleanup = on(item, 'dragend', () => this.handleDragEnd());
        const dragOverCleanup = on(item, 'dragover', (e) => this.handleDragOver(e, index));
        const dragLeaveCleanup = on(item, 'dragleave', () => this.handleDragLeave(item));
        const dropCleanup = on(item, 'drop', (e) => this.handleDrop(e, index));

        this.cleanupFunctions.push(dragStartCleanup, dragEndCleanup, dragOverCleanup, dragLeaveCleanup, dropCleanup);

        item.appendChild(dragHandle);

        // Field info with inline editing
        const info = createElement('div', { className: 'field-info' });

        // V3: Inline editable label
        const labelWrapper = createElement('div', { className: 'field-label-wrapper' });

        const label = createElement('span', {
            className: 'field-label field-label-editable',
            textContent: field.label,
            title: 'Click to edit label'
        });

        const labelCleanup = on(label, 'click', (e) => {
            e.stopPropagation();
            this.startInlineEdit(label, field, index, 'label');
        });
        this.cleanupFunctions.push(labelCleanup);

        labelWrapper.appendChild(label);

        // Type badge
        const type = createElement('span', {
            className: `field-type-badge field-type-${field.type}`,
            textContent: field.type
        });
        labelWrapper.appendChild(type);

        // Required badge
        if (field.required) {
            const requiredBadge = createElement('span', {
                className: 'field-required-badge',
                textContent: 'Required'
            });
            labelWrapper.appendChild(requiredBadge);
        }

        info.appendChild(labelWrapper);

        // Field name (data key) - subtle display
        const nameDisplay = createElement('div', {
            className: 'field-name-display',
            textContent: `→ ${field.name}`
        });
        info.appendChild(nameDisplay);

        item.appendChild(info);

        // Action buttons
        const actions = createElement('div', { className: 'field-actions' });

        // V3: Duplicate button
        const duplicateBtn = createElement('button', {
            type: 'button',
            className: 'field-action-btn field-duplicate-btn',
            title: 'Duplicate field'
        });
        duplicateBtn.innerHTML = '⧉';
        const duplicateCleanup = on(duplicateBtn, 'click', (e) => {
            e.stopPropagation();
            this.duplicateField(index);
        });
        this.cleanupFunctions.push(duplicateCleanup);

        // Edit button
        const editBtn = createElement('button', {
            type: 'button',
            className: 'field-action-btn field-edit-btn',
            title: 'Edit field settings'
        });
        editBtn.innerHTML = '⚙';
        const editCleanup = on(editBtn, 'click', (e) => {
            e.stopPropagation();
            this.editField(index);
        });
        this.cleanupFunctions.push(editCleanup);

        // Delete button
        const deleteBtn = createElement('button', {
            type: 'button',
            className: 'field-action-btn field-delete-btn',
            title: 'Delete field'
        });
        deleteBtn.innerHTML = '×';
        const deleteCleanup = on(deleteBtn, 'click', (e) => {
            e.stopPropagation();
            this.deleteField(index);
        });
        this.cleanupFunctions.push(deleteCleanup);

        actions.appendChild(duplicateBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);

        // Click to select
        const selectCleanup = on(item, 'click', () => {
            this.selectField(index);
        });
        this.cleanupFunctions.push(selectCleanup);

        return item;
    }

    // V3: Inline label editing
    startInlineEdit(element, field, index, property) {
        const currentValue = field[property];

        const input = createElement('input', {
            type: 'text',
            className: 'inline-edit-input',
            value: currentValue
        });

        element.style.display = 'none';
        element.parentNode.insertBefore(input, element);
        input.focus();
        input.select();

        const finishEdit = (save = true) => {
            const newValue = input.value.trim();

            if (save && newValue && newValue !== currentValue) {
                field[property] = newValue;

                // V3: Auto-generate name from label
                if (property === 'label' && !field.nameManuallySet) {
                    field.name = generateFieldName(newValue);
                }

                toast.success('Field updated');
            }

            input.remove();
            element.style.display = '';
            element.textContent = field[property];

            // Update name display if label changed
            if (property === 'label') {
                const item = element.closest('.form-builder-field-item');
                const nameDisplay = item.querySelector('.field-name-display');
                if (nameDisplay) {
                    nameDisplay.textContent = `→ ${field.name}`;
                }
            }
        };

        const keydownCleanup = on(input, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit(true);
            } else if (e.key === 'Escape') {
                finishEdit(false);
            }
        });

        const blurCleanup = on(input, 'blur', () => finishEdit(true));

        this.cleanupFunctions.push(keydownCleanup, blurCleanup);
    }

    // V3: Drag and drop handlers
    handleDragStart(e, index) {
        this.draggedItem = index;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    }

    handleDragEnd() {
        this.draggedItem = null;
        document.querySelectorAll('.form-builder-field-item').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
    }

    handleDragOver(e, index) {
        e.preventDefault();
        if (this.draggedItem === null || this.draggedItem === index) return;

        const item = e.target.closest('.form-builder-field-item');
        if (item && !item.classList.contains('dragging')) {
            item.classList.add('drag-over');
        }
    }

    handleDragLeave(item) {
        item.classList.remove('drag-over');
    }

    handleDrop(e, targetIndex) {
        e.preventDefault();
        const sourceIndex = this.draggedItem;

        if (sourceIndex === null || sourceIndex === targetIndex) return;

        // Reorder fields
        const [movedField] = this.fields.splice(sourceIndex, 1);
        this.fields.splice(targetIndex, 0, movedField);

        // Update order values
        this.fields.forEach((field, i) => {
            field.order = i;
        });

        toast.success('Field moved');
        this.render();
    }

    selectField(index) {
        // Remove previous selection
        document.querySelectorAll('.form-builder-field-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to current
        const item = document.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.classList.add('selected');
        }
        this.selectedFieldIndex = index;
    }

    // V3: Live preview pane
    createLivePreviewPane() {
        const pane = createElement('div', { className: 'form-builder-preview-pane' });

        const header = createElement('div', { className: 'preview-pane-header' });
        header.innerHTML = '<h4>Live Preview</h4>';
        pane.appendChild(header);

        const previewContainer = createElement('div', {
            className: 'preview-pane-content',
            id: 'livePreviewContainer'
        });
        pane.appendChild(previewContainer);

        return pane;
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
            className: 'btn-primary form-builder-btn form-builder-save-btn',
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
            toast.success(`${fieldConfig.label} added`);
            this.render();

            // Auto-scroll to new field
            requestAnimationFrame(() => {
                const list = document.getElementById('builderFieldsList');
                if (list) list.scrollTop = list.scrollHeight;
            });
        }
    }

    // V3: Duplicate field
    duplicateField(index) {
        const original = this.fields[index];
        if (!original) return;

        const duplicate = {
            ...original,
            id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: `${original.name}_copy`,
            label: `${original.label} (Copy)`,
            order: this.fields.length
        };

        // Deep copy options if present
        if (original.options) {
            duplicate.options = JSON.parse(JSON.stringify(original.options));
        }

        this.fields.push(duplicate);
        toast.success('Field duplicated');
        this.render();
    }

    editField(index) {
        const field = this.fields[index];
        if (!field) return;

        this.fieldEditor = new FieldEditor(field, (updatedField) => {
            this.fields[index] = updatedField;
            toast.success('Field updated');
            this.render();
        });
        this.fieldEditor.show();
    }

    deleteField(index) {
        const field = this.fields[index];

        // V3: Use custom dialog instead of confirm()
        this.showConfirmDialog(
            'Delete Field',
            `Are you sure you want to delete "${field.label}"?`,
            () => {
                this.fields.splice(index, 1);
                // Update order values
                this.fields.forEach((f, i) => {
                    f.order = i;
                });
                toast.success('Field deleted');
                this.render();
            }
        );
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

    // V3: Custom confirm dialog
    showConfirmDialog(title, message, onConfirm) {
        const overlay = createElement('div', { className: 'form-builder-modal-overlay' });
        const modal = createElement('div', { className: 'form-builder-modal confirm-dialog' });

        modal.innerHTML = `
            <div class="confirm-dialog-header">
                <h3>${title}</h3>
            </div>
            <div class="confirm-dialog-body">
                <p>${message}</p>
            </div>
            <div class="confirm-dialog-footer">
                <button type="button" class="btn-secondary" id="confirmCancel">Cancel</button>
                <button type="button" class="btn-primary btn-danger" id="confirmOk">Delete</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const cancelBtn = modal.querySelector('#confirmCancel');
        const okBtn = modal.querySelector('#confirmOk');

        const close = () => overlay.remove();

        cancelBtn.addEventListener('click', close);
        okBtn.addEventListener('click', () => {
            onConfirm();
            close();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
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
            toast.errors(validation.errors, 'Cannot preview:');
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
            toast.errors(validation.errors, 'Cannot save:');
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
            toast.success('Template saved successfully!');

            if (this.options.onSave) {
                this.options.onSave(result.template);
            }
        } else {
            toast.error('Error saving template: ' + result.error);
        }
    }

    cancel() {
        if (this.fields.length > 0) {
            this.showConfirmDialog(
                'Discard Changes',
                'Are you sure you want to discard your changes?',
                () => {
                    if (this.options.onCancel) {
                        this.options.onCancel();
                    }
                }
            );
        } else if (this.options.onCancel) {
            this.options.onCancel();
        }
    }

    // V3: Keyboard shortcuts
    setupKeyboardShortcuts() {
        const keydownHandler = (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl+S: Save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.save();
            }

            // Ctrl+P: Preview
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.preview();
            }

            // Delete: Delete selected field
            if (e.key === 'Delete' && this.selectedFieldIndex !== null) {
                e.preventDefault();
                this.deleteField(this.selectedFieldIndex);
            }

            // Escape: Deselect
            if (e.key === 'Escape') {
                this.selectedFieldIndex = null;
                document.querySelectorAll('.form-builder-field-item').forEach(item => {
                    item.classList.remove('selected');
                });
            }
        };

        document.addEventListener('keydown', keydownHandler);
        this.cleanupFunctions.push(() => document.removeEventListener('keydown', keydownHandler));
    }

    getTemplate() {
        return {
            ...this.template,
            fields: this.fields
        };
    }

    cleanup() {
        this.cleanupFunctions.forEach(cleanup => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
        });
        this.cleanupFunctions = [];
    }

    destroy() {
        this.cleanup();

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
