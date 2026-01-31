// Form Builder V4 - Visual Drag & Drop Builder
// JotForm-style: Palette on left, live canvas on right, no modals
import { createElement, $, on } from '../../utils/dom.js';
import { getFieldTypesByCategory, getDefaultFieldConfig, validateFieldConfig, generateFieldName, fieldTypes } from './FieldFactory.js';
import { formTemplateStorage } from '../../services/formTemplateStorage.js';
import { createField } from './FieldFactory.js';
import { toast } from '../../utils/toast.js';

export class FormBuilder {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' ? $(`#${containerId}`) : containerId;
        this.options = {
            onSave: null,
            onCancel: null,
            ...options
        };

        this.template = null;
        this.fields = [];
        this.fieldInstances = new Map(); // Store rendered field instances
        this.cleanupFunctions = [];
        this.selectedFieldId = null;
        this.draggedType = null;
        this.draggedFieldId = null;

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

        const wrapper = createElement('div', { className: 'vfb-wrapper' });

        // Header bar
        const header = this.createHeader();
        wrapper.appendChild(header);

        // Main 3-column layout: Palette | Canvas | Settings
        const main = createElement('div', { className: 'vfb-main' });

        // Left: Field Palette
        const palette = this.createPalette();
        main.appendChild(palette);

        // Center: Canvas area
        const canvas = this.createCanvas();
        main.appendChild(canvas);

        // Right: Settings panel (always visible)
        const settings = this.createSettingsPanel();
        main.appendChild(settings);

        wrapper.appendChild(main);

        this.container.appendChild(wrapper);

        // Render existing fields on canvas
        this.renderFieldsOnCanvas();
    }

    createHeader() {
        const header = createElement('div', { className: 'vfb-header' });

        // Left side: Form name input
        const nameGroup = createElement('div', { className: 'vfb-header-name' });
        const nameInput = createElement('input', {
            type: 'text',
            className: 'vfb-name-input',
            placeholder: 'Untitled Form',
            value: this.template.name || ''
        });
        const nameCleanup = on(nameInput, 'input', (e) => {
            this.template.name = e.target.value;
        });
        this.cleanupFunctions.push(nameCleanup);
        nameGroup.appendChild(nameInput);

        // Right side: Action buttons
        const actions = createElement('div', { className: 'vfb-header-actions' });

        const previewBtn = createElement('button', {
            type: 'button',
            className: 'vfb-btn vfb-btn-secondary',
            textContent: 'Preview'
        });
        const previewCleanup = on(previewBtn, 'click', () => this.preview());
        this.cleanupFunctions.push(previewCleanup);

        const cancelBtn = createElement('button', {
            type: 'button',
            className: 'vfb-btn vfb-btn-secondary',
            textContent: 'Cancel'
        });
        const cancelCleanup = on(cancelBtn, 'click', () => this.cancel());
        this.cleanupFunctions.push(cancelCleanup);

        const saveBtn = createElement('button', {
            type: 'button',
            className: 'vfb-btn vfb-btn-primary',
            textContent: 'Save Form'
        });
        const saveCleanup = on(saveBtn, 'click', () => this.save());
        this.cleanupFunctions.push(saveCleanup);

        actions.appendChild(previewBtn);
        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);

        header.appendChild(nameGroup);
        header.appendChild(actions);

        return header;
    }

    createPalette() {
        const palette = createElement('div', { className: 'vfb-palette' });

        const title = createElement('div', { className: 'vfb-palette-title' });
        title.textContent = 'Drag a field';
        palette.appendChild(title);

        const categories = getFieldTypesByCategory();

        Object.keys(categories).forEach(catKey => {
            const category = categories[catKey];
            if (category.types.length === 0) return;

            const catSection = createElement('div', { className: 'vfb-palette-category' });

            const catLabel = createElement('div', {
                className: 'vfb-palette-category-label',
                textContent: category.label
            });
            catSection.appendChild(catLabel);

            const fieldList = createElement('div', { className: 'vfb-palette-fields' });

            category.types.forEach(({ type, label, icon }) => {
                const fieldBtn = createElement('div', {
                    className: 'vfb-palette-field',
                    draggable: true,
                    'data-field-type': type
                });
                fieldBtn.innerHTML = `<span class="vfb-palette-icon">${icon}</span><span class="vfb-palette-label">${label}</span>`;

                // Drag start from palette
                const dragStartCleanup = on(fieldBtn, 'dragstart', (e) => {
                    this.draggedType = type;
                    this.draggedFieldId = null;
                    e.target.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('text/plain', type);
                    document.querySelector('.vfb-canvas')?.classList.add('drag-active');
                });

                const dragEndCleanup = on(fieldBtn, 'dragend', (e) => {
                    this.draggedType = null;
                    e.target.classList.remove('dragging');
                    document.querySelector('.vfb-canvas')?.classList.remove('drag-active');
                    document.querySelectorAll('.vfb-drop-zone').forEach(z => z.classList.remove('drag-over'));
                });

                // Click to add (fallback)
                const clickCleanup = on(fieldBtn, 'click', () => {
                    this.addField(type);
                });

                this.cleanupFunctions.push(dragStartCleanup, dragEndCleanup, clickCleanup);
                fieldList.appendChild(fieldBtn);
            });

            catSection.appendChild(fieldList);
            palette.appendChild(catSection);
        });

        return palette;
    }

    createCanvas() {
        const canvasWrapper = createElement('div', { className: 'vfb-canvas-wrapper' });

        const canvasHeader = createElement('div', { className: 'vfb-canvas-header' });
        canvasHeader.innerHTML = `<span class="vfb-canvas-title">Your Form</span><span class="vfb-field-count">${this.fields.length} fields</span>`;
        canvasWrapper.appendChild(canvasHeader);

        const canvas = createElement('div', {
            className: 'vfb-canvas',
            id: 'vfbCanvas'
        });

        // Drop zone handling on canvas
        const dragOverCleanup = on(canvas, 'dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = this.draggedType ? 'copy' : 'move';
        });

        const dropCleanup = on(canvas, 'drop', (e) => {
            e.preventDefault();
            if (this.draggedType) {
                this.addField(this.draggedType);
            }
            canvas.classList.remove('drag-active');
        });

        this.cleanupFunctions.push(dragOverCleanup, dropCleanup);

        canvasWrapper.appendChild(canvas);
        return canvasWrapper;
    }

    createSettingsPanel() {
        const panel = createElement('div', {
            className: 'vfb-settings-panel',
            id: 'vfbSettingsPanel'
        });

        const header = createElement('div', { className: 'vfb-settings-header' });
        header.innerHTML = '<span>Field Settings</span>';
        panel.appendChild(header);

        const body = createElement('div', {
            className: 'vfb-settings-body',
            id: 'vfbSettingsBody'
        });

        // Show placeholder when no field selected
        body.innerHTML = `
            <div class="vfb-settings-empty">
                <div class="vfb-settings-empty-icon">👆</div>
                <div class="vfb-settings-empty-text">Select a field to edit its settings</div>
            </div>
        `;

        panel.appendChild(body);

        return panel;
    }

    renderFieldsOnCanvas() {
        const canvas = document.getElementById('vfbCanvas');
        if (!canvas) return;

        canvas.innerHTML = '';
        this.fieldInstances.clear();

        if (this.fields.length === 0) {
            const empty = createElement('div', { className: 'vfb-canvas-empty' });
            empty.innerHTML = `
                <div class="vfb-empty-icon">📋</div>
                <div class="vfb-empty-title">Start building your form</div>
                <div class="vfb-empty-text">Drag fields from the left panel or click to add</div>
            `;
            canvas.appendChild(empty);
            return;
        }

        this.fields.forEach((fieldConfig, index) => {
            const fieldWrapper = this.createCanvasField(fieldConfig, index);
            canvas.appendChild(fieldWrapper);
        });

        // Update field count
        const countEl = document.querySelector('.vfb-field-count');
        if (countEl) countEl.textContent = `${this.fields.length} field${this.fields.length !== 1 ? 's' : ''}`;
    }

    createCanvasField(fieldConfig, index) {
        const wrapper = createElement('div', {
            className: 'vfb-canvas-field',
            'data-field-id': fieldConfig.id,
            'data-index': index,
            draggable: true
        });

        if (this.selectedFieldId === fieldConfig.id) {
            wrapper.classList.add('selected');
        }

        // Floating toolbar
        const toolbar = createElement('div', { className: 'vfb-field-toolbar' });
        toolbar.innerHTML = `
            <button type="button" class="vfb-toolbar-btn" data-action="duplicate" title="Duplicate">⧉</button>
            <button type="button" class="vfb-toolbar-btn vfb-toolbar-delete" data-action="delete" title="Delete">🗑</button>
        `;

        const toolbarCleanup = on(toolbar, 'click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation();
            const action = btn.dataset.action;
            if (action === 'duplicate') this.duplicateField(fieldConfig.id);
            if (action === 'delete') this.deleteField(fieldConfig.id);
        });
        this.cleanupFunctions.push(toolbarCleanup);

        wrapper.appendChild(toolbar);

        // Render actual field preview
        const fieldPreview = createElement('div', { className: 'vfb-field-preview' });

        // Create a simplified preview of the field
        const typeInfo = fieldTypes[fieldConfig.type];
        const icon = typeInfo?.icon || '?';

        // For layout types, render differently
        if (fieldConfig.type === 'section') {
            fieldPreview.innerHTML = `
                <div class="vfb-preview-section">
                    <div class="vfb-preview-section-title">${fieldConfig.label}</div>
                    ${fieldConfig.description ? `<div class="vfb-preview-section-desc">${fieldConfig.description}</div>` : ''}
                </div>
            `;
        } else if (fieldConfig.type === 'info') {
            fieldPreview.innerHTML = `
                <div class="vfb-preview-info vfb-preview-info-${fieldConfig.style || 'info'}">
                    <span class="vfb-preview-info-icon">${icon}</span>
                    <span>${fieldConfig.content || 'Info block'}</span>
                </div>
            `;
        } else {
            // Regular input field preview
            fieldPreview.innerHTML = `
                <label class="vfb-preview-label">
                    ${fieldConfig.label}
                    ${fieldConfig.required ? '<span class="vfb-required">*</span>' : ''}
                </label>
                ${this.getFieldPreviewHTML(fieldConfig)}
            `;
        }

        wrapper.appendChild(fieldPreview);

        // Drag handle indicator
        const dragHint = createElement('div', { className: 'vfb-drag-hint' });
        dragHint.innerHTML = '⋮⋮';
        wrapper.appendChild(dragHint);

        // Event: Click to select
        const clickCleanup = on(wrapper, 'click', (e) => {
            if (e.target.closest('.vfb-field-toolbar')) return;
            this.selectField(fieldConfig.id);
        });

        // Event: Drag to reorder
        const dragStartCleanup = on(wrapper, 'dragstart', (e) => {
            this.draggedFieldId = fieldConfig.id;
            this.draggedType = null;
            wrapper.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        const dragEndCleanup = on(wrapper, 'dragend', () => {
            this.draggedFieldId = null;
            wrapper.classList.remove('dragging');
            document.querySelectorAll('.vfb-canvas-field').forEach(f => f.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom'));
        });

        const dragOverCleanup = on(wrapper, 'dragover', (e) => {
            e.preventDefault();
            if (!this.draggedFieldId || this.draggedFieldId === fieldConfig.id) {
                if (this.draggedType) {
                    // Dragging from palette - show insert indicator
                    const rect = wrapper.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    wrapper.classList.remove('drag-over-top', 'drag-over-bottom');
                    wrapper.classList.add(e.clientY < midY ? 'drag-over-top' : 'drag-over-bottom');
                }
                return;
            }
            const rect = wrapper.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            wrapper.classList.remove('drag-over-top', 'drag-over-bottom');
            wrapper.classList.add(e.clientY < midY ? 'drag-over-top' : 'drag-over-bottom');
        });

        const dragLeaveCleanup = on(wrapper, 'dragleave', () => {
            wrapper.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        const dropCleanup = on(wrapper, 'drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const rect = wrapper.getBoundingClientRect();
            const insertBefore = e.clientY < rect.top + rect.height / 2;

            if (this.draggedType) {
                // Dropping new field from palette
                this.addFieldAt(this.draggedType, index + (insertBefore ? 0 : 1));
            } else if (this.draggedFieldId && this.draggedFieldId !== fieldConfig.id) {
                // Reordering existing field
                this.moveField(this.draggedFieldId, fieldConfig.id, insertBefore);
            }

            wrapper.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        this.cleanupFunctions.push(clickCleanup, dragStartCleanup, dragEndCleanup, dragOverCleanup, dragLeaveCleanup, dropCleanup);

        return wrapper;
    }

    getFieldPreviewHTML(config) {
        const placeholder = config.placeholder || '';

        switch (config.type) {
            case 'text':
                return `<input type="text" class="vfb-preview-input" placeholder="${placeholder}" disabled>`;
            case 'number':
                return `<input type="number" class="vfb-preview-input" placeholder="${placeholder}" disabled>`;
            case 'textarea':
                return `<textarea class="vfb-preview-textarea" placeholder="${placeholder}" disabled rows="3"></textarea>`;
            case 'select':
                const opts = (config.options || []).map(o => `<option>${o.label}</option>`).join('');
                return `<select class="vfb-preview-select" disabled><option>${placeholder || 'Select...'}</option>${opts}</select>`;
            case 'date':
                return `<input type="date" class="vfb-preview-input" disabled>`;
            case 'time':
                return `<input type="time" class="vfb-preview-input" disabled>`;
            case 'checkbox':
                const checks = (config.options || []).map(o => `
                    <label class="vfb-preview-check"><input type="checkbox" disabled> ${o.label}</label>
                `).join('');
                return `<div class="vfb-preview-checks">${checks}</div>`;
            case 'radio':
                const radios = (config.options || []).map(o => `
                    <label class="vfb-preview-radio"><input type="radio" disabled> ${o.label}</label>
                `).join('');
                return `<div class="vfb-preview-radios">${radios}</div>`;
            case 'toggle':
                return `<div class="vfb-preview-toggle"><span>${config.noLabel || 'No'}</span><div class="vfb-toggle-track"><div class="vfb-toggle-thumb"></div></div><span>${config.yesLabel || 'Yes'}</span></div>`;
            case 'photo':
                return `<div class="vfb-preview-photo">📷 Click to add photo</div>`;
            case 'signature':
                return `<div class="vfb-preview-signature">✍ Sign here</div>`;
            default:
                return `<input type="text" class="vfb-preview-input" placeholder="${placeholder}" disabled>`;
        }
    }

    selectField(fieldId) {
        this.selectedFieldId = fieldId;

        // Update canvas selection
        document.querySelectorAll('.vfb-canvas-field').forEach(f => {
            f.classList.toggle('selected', f.dataset.fieldId === fieldId);
        });

        // Show settings panel
        this.showSettingsPanel(fieldId);
    }

    deselectField() {
        this.selectedFieldId = null;
        document.querySelectorAll('.vfb-canvas-field').forEach(f => f.classList.remove('selected'));

        // Show empty placeholder in settings panel
        const body = document.getElementById('vfbSettingsBody');
        if (body) {
            body.innerHTML = `
                <div class="vfb-settings-empty">
                    <div class="vfb-settings-empty-icon">👆</div>
                    <div class="vfb-settings-empty-text">Select a field to edit its settings</div>
                </div>
            `;
        }
    }

    showSettingsPanel(fieldId) {
        const field = this.fields.find(f => f.id === fieldId);
        if (!field) return;

        const body = document.getElementById('vfbSettingsBody');
        if (!body) return;

        body.innerHTML = '';

        // Build settings form
        const typeInfo = fieldTypes[field.type];

        // Type indicator
        const typeRow = createElement('div', { className: 'vfb-setting-type' });
        typeRow.innerHTML = `<span class="vfb-setting-type-icon">${typeInfo?.icon || '?'}</span> ${typeInfo?.label || field.type}`;
        body.appendChild(typeRow);

        // Label
        body.appendChild(this.createSettingInput('label', 'Label', field.label, (val) => {
            field.label = val;
            if (!field.nameManuallySet) {
                field.name = generateFieldName(val);
            }
            this.renderFieldsOnCanvas();
        }));

        // Field name (not for layout types)
        if (!['section', 'info'].includes(field.type)) {
            body.appendChild(this.createSettingInput('name', 'Field ID', field.name, (val) => {
                field.name = val;
                field.nameManuallySet = true;
            }));

            // Required toggle
            body.appendChild(this.createSettingToggle('required', 'Required', field.required, (val) => {
                field.required = val;
                this.renderFieldsOnCanvas();
            }));
        }

        // Placeholder (for text inputs)
        if (['text', 'number', 'textarea', 'select'].includes(field.type)) {
            body.appendChild(this.createSettingInput('placeholder', 'Placeholder', field.placeholder || '', (val) => {
                field.placeholder = val;
                this.renderFieldsOnCanvas();
            }));
        }

        // Type-specific settings
        this.addTypeSpecificSettings(body, field);

        // Delete button at bottom
        const deleteBtn = createElement('button', {
            type: 'button',
            className: 'vfb-btn vfb-btn-danger vfb-settings-delete',
            textContent: 'Delete Field'
        });
        const deleteCleanup = on(deleteBtn, 'click', () => this.deleteField(fieldId));
        this.cleanupFunctions.push(deleteCleanup);
        body.appendChild(deleteBtn);
    }

    createSettingInput(name, label, value, onChange) {
        const group = createElement('div', { className: 'vfb-setting-group' });
        group.innerHTML = `<label class="vfb-setting-label">${label}</label>`;

        const input = createElement('input', {
            type: 'text',
            className: 'vfb-setting-input',
            value: value || ''
        });

        const cleanup = on(input, 'input', (e) => onChange(e.target.value));
        this.cleanupFunctions.push(cleanup);

        group.appendChild(input);
        return group;
    }

    createSettingToggle(name, label, checked, onChange) {
        const group = createElement('div', { className: 'vfb-setting-group vfb-setting-toggle-group' });

        const labelEl = createElement('label', { className: 'vfb-setting-label', textContent: label });

        const toggle = createElement('label', { className: 'vfb-setting-toggle' });
        const checkbox = createElement('input', { type: 'checkbox' });
        checkbox.checked = !!checked;
        const slider = createElement('span', { className: 'vfb-setting-toggle-slider' });

        const cleanup = on(checkbox, 'change', (e) => onChange(e.target.checked));
        this.cleanupFunctions.push(cleanup);

        toggle.appendChild(checkbox);
        toggle.appendChild(slider);

        group.appendChild(labelEl);
        group.appendChild(toggle);
        return group;
    }

    createSettingTextarea(name, label, value, onChange) {
        const group = createElement('div', { className: 'vfb-setting-group' });
        group.innerHTML = `<label class="vfb-setting-label">${label}</label>`;

        const textarea = createElement('textarea', {
            className: 'vfb-setting-textarea',
            rows: 3
        });
        textarea.value = value || '';

        const cleanup = on(textarea, 'input', (e) => onChange(e.target.value));
        this.cleanupFunctions.push(cleanup);

        group.appendChild(textarea);
        return group;
    }

    addTypeSpecificSettings(container, field) {
        const type = field.type;

        // Options editor for select, checkbox, radio
        if (['select', 'checkbox', 'radio'].includes(type)) {
            container.appendChild(this.createOptionsEditor(field));
        }

        // Number min/max
        if (type === 'number') {
            container.appendChild(this.createSettingInput('min', 'Min Value', field.min, (val) => {
                field.min = val ? parseFloat(val) : null;
            }));
            container.appendChild(this.createSettingInput('max', 'Max Value', field.max, (val) => {
                field.max = val ? parseFloat(val) : null;
            }));
        }

        // Toggle labels
        if (type === 'toggle') {
            container.appendChild(this.createSettingInput('yesLabel', 'Yes Label', field.yesLabel || 'Yes', (val) => {
                field.yesLabel = val;
                this.renderFieldsOnCanvas();
            }));
            container.appendChild(this.createSettingInput('noLabel', 'No Label', field.noLabel || 'No', (val) => {
                field.noLabel = val;
                this.renderFieldsOnCanvas();
            }));
        }

        // Section description
        if (type === 'section') {
            container.appendChild(this.createSettingTextarea('description', 'Description', field.description, (val) => {
                field.description = val;
                this.renderFieldsOnCanvas();
            }));
        }

        // Info content and style
        if (type === 'info') {
            container.appendChild(this.createSettingTextarea('content', 'Content', field.content, (val) => {
                field.content = val;
                this.renderFieldsOnCanvas();
            }));

            const styleGroup = createElement('div', { className: 'vfb-setting-group' });
            styleGroup.innerHTML = `<label class="vfb-setting-label">Style</label>`;
            const styleSelect = createElement('select', { className: 'vfb-setting-input' });
            ['info', 'warning', 'success', 'error', 'tip'].forEach(s => {
                const opt = createElement('option', { value: s, textContent: s.charAt(0).toUpperCase() + s.slice(1) });
                if (field.style === s) opt.selected = true;
                styleSelect.appendChild(opt);
            });
            const styleCleanup = on(styleSelect, 'change', (e) => {
                field.style = e.target.value;
                this.renderFieldsOnCanvas();
            });
            this.cleanupFunctions.push(styleCleanup);
            styleGroup.appendChild(styleSelect);
            container.appendChild(styleGroup);
        }

        // Photo settings
        if (type === 'photo') {
            container.appendChild(this.createSettingToggle('multiple', 'Allow Multiple', field.multiple, (val) => {
                field.multiple = val;
            }));
        }
    }

    createOptionsEditor(field) {
        const group = createElement('div', { className: 'vfb-setting-group vfb-options-editor' });
        group.innerHTML = `<label class="vfb-setting-label">Options</label>`;

        const list = createElement('div', { className: 'vfb-options-list' });

        const renderOptions = () => {
            list.innerHTML = '';
            (field.options || []).forEach((opt, i) => {
                const row = createElement('div', { className: 'vfb-option-row' });

                const input = createElement('input', {
                    type: 'text',
                    className: 'vfb-option-input',
                    value: opt.label,
                    placeholder: 'Option label'
                });

                const inputCleanup = on(input, 'input', (e) => {
                    opt.label = e.target.value;
                    opt.value = generateFieldName(e.target.value) || `option${i}`;
                    this.renderFieldsOnCanvas();
                });
                this.cleanupFunctions.push(inputCleanup);

                const removeBtn = createElement('button', {
                    type: 'button',
                    className: 'vfb-option-remove',
                    textContent: '×'
                });
                const removeCleanup = on(removeBtn, 'click', () => {
                    field.options.splice(i, 1);
                    renderOptions();
                    this.renderFieldsOnCanvas();
                });
                this.cleanupFunctions.push(removeCleanup);

                row.appendChild(input);
                row.appendChild(removeBtn);
                list.appendChild(row);
            });
        };

        renderOptions();
        group.appendChild(list);

        const addBtn = createElement('button', {
            type: 'button',
            className: 'vfb-btn vfb-btn-small',
            textContent: '+ Add Option'
        });
        const addCleanup = on(addBtn, 'click', () => {
            if (!field.options) field.options = [];
            field.options.push({ value: `option${field.options.length + 1}`, label: `Option ${field.options.length + 1}` });
            renderOptions();
            this.renderFieldsOnCanvas();
        });
        this.cleanupFunctions.push(addCleanup);
        group.appendChild(addBtn);

        return group;
    }

    addField(type) {
        const order = this.fields.length;
        const fieldConfig = getDefaultFieldConfig(type, order);
        if (fieldConfig) {
            this.fields.push(fieldConfig);
            this.renderFieldsOnCanvas();
            this.selectField(fieldConfig.id);
            toast.success(`${fieldTypes[type]?.label || type} added`);
        }
    }

    addFieldAt(type, index) {
        const fieldConfig = getDefaultFieldConfig(type, index);
        if (fieldConfig) {
            this.fields.splice(index, 0, fieldConfig);
            this.reorderFields();
            this.renderFieldsOnCanvas();
            this.selectField(fieldConfig.id);
            toast.success(`${fieldTypes[type]?.label || type} added`);
        }
    }

    duplicateField(fieldId) {
        const index = this.fields.findIndex(f => f.id === fieldId);
        if (index === -1) return;

        const original = this.fields[index];
        const duplicate = {
            ...JSON.parse(JSON.stringify(original)),
            id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: `${original.name}_copy`,
            label: `${original.label} (Copy)`
        };

        this.fields.splice(index + 1, 0, duplicate);
        this.reorderFields();
        this.renderFieldsOnCanvas();
        this.selectField(duplicate.id);
        toast.success('Field duplicated');
    }

    deleteField(fieldId) {
        const index = this.fields.findIndex(f => f.id === fieldId);
        if (index === -1) return;

        const field = this.fields[index];
        this.fields.splice(index, 1);
        this.reorderFields();

        if (this.selectedFieldId === fieldId) {
            this.deselectField();
        }

        this.renderFieldsOnCanvas();
        toast.success(`${field.label} deleted`);
    }

    moveField(draggedId, targetId, insertBefore) {
        const draggedIndex = this.fields.findIndex(f => f.id === draggedId);
        const targetIndex = this.fields.findIndex(f => f.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const [draggedField] = this.fields.splice(draggedIndex, 1);

        let newIndex = targetIndex;
        if (draggedIndex < targetIndex) newIndex--;
        if (!insertBefore) newIndex++;

        this.fields.splice(newIndex, 0, draggedField);
        this.reorderFields();
        this.renderFieldsOnCanvas();
    }

    reorderFields() {
        this.fields.forEach((field, i) => {
            field.order = i;
        });
    }

    preview() {
        const validation = this.validate();
        if (!validation.isValid) {
            toast.errors(validation.errors, 'Cannot preview:');
            return;
        }

        // Create preview modal
        const overlay = createElement('div', { className: 'vfb-preview-overlay' });
        const modal = createElement('div', { className: 'vfb-preview-modal' });

        const header = createElement('div', { className: 'vfb-preview-header' });
        header.innerHTML = `<span>Preview: ${this.template.name || 'Untitled'}</span>`;

        const closeBtn = createElement('button', { type: 'button', className: 'vfb-preview-close', textContent: '×' });
        on(closeBtn, 'click', () => overlay.remove());
        header.appendChild(closeBtn);

        const body = createElement('div', { className: 'vfb-preview-body' });

        // Render each field
        this.fields.forEach(fieldConfig => {
            const fieldInstance = createField(fieldConfig);
            if (fieldInstance) {
                body.appendChild(fieldInstance.render());
            }
        });

        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);

        on(overlay, 'click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
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
            const result = validateFieldConfig(field);
            if (!result.isValid) {
                errors.push(...result.errors.map(e => `${field.label}: ${e}`));
            }
        });

        return { isValid: errors.length === 0, errors };
    }

    save() {
        const validation = this.validate();
        if (!validation.isValid) {
            toast.errors(validation.errors, 'Cannot save:');
            return;
        }

        const templateToSave = {
            ...this.template,
            fields: this.fields
        };

        const result = formTemplateStorage.saveTemplate(templateToSave);

        if (result.success) {
            this.template = result.template;
            toast.success('Form saved!');
            if (this.options.onSave) {
                this.options.onSave(result.template);
            }
        } else {
            toast.error('Error saving: ' + result.error);
        }
    }

    cancel() {
        if (this.fields.length > 0) {
            if (confirm('Discard changes?')) {
                if (this.options.onCancel) this.options.onCancel();
            }
        } else {
            if (this.options.onCancel) this.options.onCancel();
        }
    }

    setupKeyboardShortcuts() {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.save();
            }
            if (e.key === 'Delete' && this.selectedFieldId) {
                e.preventDefault();
                this.deleteField(this.selectedFieldId);
            }
            if (e.key === 'Escape') {
                this.deselectField();
            }
        };

        document.addEventListener('keydown', handler);
        this.cleanupFunctions.push(() => document.removeEventListener('keydown', handler));
    }

    cleanup() {
        this.cleanupFunctions.forEach(fn => typeof fn === 'function' && fn());
        this.cleanupFunctions = [];
        this.fieldInstances.clear();
    }

    destroy() {
        this.cleanup();
        if (this.container) this.container.innerHTML = '';
    }
}
