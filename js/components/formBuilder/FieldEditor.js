// Field Editor - Modal for editing field properties
import { createElement, on } from '../../utils/dom.js';
import { fieldTypes } from './FieldFactory.js';

export class FieldEditor {
    constructor(fieldConfig, onSave) {
        this.originalConfig = { ...fieldConfig };
        this.config = { ...fieldConfig };
        this.onSave = onSave;
        this.modal = null;
        this.overlay = null;
        this.cleanupFunctions = [];
    }

    show() {
        this.createModal();
        document.body.appendChild(this.overlay);
    }

    createModal() {
        // Overlay
        this.overlay = createElement('div', { className: 'form-builder-modal-overlay' });

        // Modal
        this.modal = createElement('div', { className: 'form-builder-modal field-editor-modal' });

        // Header
        const header = createElement('div', { className: 'form-builder-modal-header' });
        const title = createElement('h3', { textContent: `Edit ${this.getTypeLabel()} Field` });
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
        const body = createElement('div', { className: 'form-builder-modal-body' });
        this.createFormFields(body);
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

        const saveBtn = createElement('button', {
            type: 'button',
            className: 'btn-primary',
            textContent: 'Save Changes'
        });
        const saveCleanup = on(saveBtn, 'click', () => this.save());
        this.cleanupFunctions.push(saveCleanup);

        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);
        this.modal.appendChild(footer);

        this.overlay.appendChild(this.modal);

        // Click outside to close
        const overlayCleanup = on(this.overlay, 'click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        this.cleanupFunctions.push(overlayCleanup);
    }

    createFormFields(container) {
        // Label field
        container.appendChild(this.createInputField('label', 'Label', 'text', this.config.label, true));

        // Name field
        container.appendChild(this.createInputField('name', 'Field Name (data key)', 'text', this.config.name, true));

        // Placeholder field (not for signature/photo)
        if (!['signature', 'photo'].includes(this.config.type)) {
            container.appendChild(this.createInputField('placeholder', 'Placeholder', 'text', this.config.placeholder || ''));
        }

        // Required checkbox
        container.appendChild(this.createCheckboxField('required', 'Required', this.config.required));

        // Type-specific fields
        this.createTypeSpecificFields(container);
    }

    createTypeSpecificFields(container) {
        const type = this.config.type;

        if (type === 'number') {
            container.appendChild(this.createInputField('min', 'Minimum Value', 'number', this.config.min));
            container.appendChild(this.createInputField('max', 'Maximum Value', 'number', this.config.max));
            container.appendChild(this.createInputField('step', 'Step', 'number', this.config.step));
        }

        if (type === 'textarea') {
            container.appendChild(this.createInputField('rows', 'Rows', 'number', this.config.rows || 4));
        }

        if (type === 'text' || type === 'textarea') {
            container.appendChild(this.createInputField('maxLength', 'Max Length', 'number', this.config.maxLength));
        }

        if (type === 'select') {
            container.appendChild(this.createOptionsEditor());
        }

        if (type === 'photo') {
            container.appendChild(this.createCheckboxField('multiple', 'Allow Multiple Photos', this.config.multiple));
            container.appendChild(this.createInputField('maxFiles', 'Max Files', 'number', this.config.maxFiles || 5));
        }

        if (type === 'signature') {
            container.appendChild(this.createInputField('width', 'Width (px)', 'number', this.config.width || 300));
            container.appendChild(this.createInputField('height', 'Height (px)', 'number', this.config.height || 150));
        }
    }

    createInputField(name, label, type, value, required = false) {
        const group = createElement('div', { className: 'form-group' });

        const labelEl = createElement('label', {
            htmlFor: `field-${name}`,
            textContent: label + (required ? ' *' : '')
        });

        const input = createElement('input', {
            type,
            id: `field-${name}`,
            name,
            className: 'form-builder-input',
            value: value !== null && value !== undefined ? value : ''
        });

        const cleanup = on(input, 'input', (e) => {
            let val = e.target.value;
            if (type === 'number' && val !== '') {
                val = parseFloat(val);
                if (isNaN(val)) val = null;
            }
            this.config[name] = val === '' ? null : val;
        });
        this.cleanupFunctions.push(cleanup);

        group.appendChild(labelEl);
        group.appendChild(input);
        return group;
    }

    createCheckboxField(name, label, checked) {
        const group = createElement('div', { className: 'form-group form-group-checkbox' });

        const checkbox = createElement('input', {
            type: 'checkbox',
            id: `field-${name}`,
            name,
            className: 'form-builder-checkbox'
        });
        checkbox.checked = !!checked;

        const labelEl = createElement('label', {
            htmlFor: `field-${name}`,
            textContent: label
        });

        const cleanup = on(checkbox, 'change', (e) => {
            this.config[name] = e.target.checked;
        });
        this.cleanupFunctions.push(cleanup);

        group.appendChild(checkbox);
        group.appendChild(labelEl);
        return group;
    }

    createOptionsEditor() {
        const group = createElement('div', { className: 'form-group options-editor' });

        const label = createElement('label', { textContent: 'Options' });
        group.appendChild(label);

        const optionsList = createElement('div', { className: 'options-list' });

        // Render existing options
        const options = this.config.options || [];
        options.forEach((opt, index) => {
            optionsList.appendChild(this.createOptionRow(opt, index, optionsList));
        });

        group.appendChild(optionsList);

        // Add option button
        const addBtn = createElement('button', {
            type: 'button',
            className: 'btn-secondary btn-small',
            textContent: '+ Add Option'
        });

        const addCleanup = on(addBtn, 'click', () => {
            const newOption = { value: `option${options.length + 1}`, label: `Option ${options.length + 1}` };
            if (!this.config.options) this.config.options = [];
            this.config.options.push(newOption);
            optionsList.appendChild(this.createOptionRow(newOption, this.config.options.length - 1, optionsList));
        });
        this.cleanupFunctions.push(addCleanup);

        group.appendChild(addBtn);
        return group;
    }

    createOptionRow(option, index, container) {
        const row = createElement('div', { className: 'option-row', 'data-index': index });

        const valueInput = createElement('input', {
            type: 'text',
            className: 'form-builder-input option-value',
            placeholder: 'Value',
            value: option.value
        });

        const labelInput = createElement('input', {
            type: 'text',
            className: 'form-builder-input option-label',
            placeholder: 'Label',
            value: option.label
        });

        const removeBtn = createElement('button', {
            type: 'button',
            className: 'option-remove-btn',
            textContent: '×'
        });

        const valueCleanup = on(valueInput, 'input', (e) => {
            if (this.config.options && this.config.options[index]) {
                this.config.options[index].value = e.target.value;
            }
        });

        const labelCleanup = on(labelInput, 'input', (e) => {
            if (this.config.options && this.config.options[index]) {
                this.config.options[index].label = e.target.value;
            }
        });

        const removeCleanup = on(removeBtn, 'click', () => {
            if (this.config.options) {
                this.config.options.splice(index, 1);
            }
            row.remove();
            // Update remaining row indices
            container.querySelectorAll('.option-row').forEach((r, i) => {
                r.setAttribute('data-index', i);
            });
        });

        this.cleanupFunctions.push(valueCleanup, labelCleanup, removeCleanup);

        row.appendChild(valueInput);
        row.appendChild(labelInput);
        row.appendChild(removeBtn);
        return row;
    }

    getTypeLabel() {
        const typeInfo = fieldTypes[this.config.type];
        return typeInfo ? typeInfo.label : this.config.type;
    }

    validate() {
        const errors = [];

        if (!this.config.label || this.config.label.trim() === '') {
            errors.push('Label is required');
        }

        if (!this.config.name || this.config.name.trim() === '') {
            errors.push('Field name is required');
        }

        if (this.config.type === 'select') {
            if (!this.config.options || this.config.options.length === 0) {
                errors.push('Select field must have at least one option');
            }
        }

        return errors;
    }

    save() {
        const errors = this.validate();
        if (errors.length > 0) {
            alert('Please fix the following errors:\n' + errors.join('\n'));
            return;
        }

        if (this.onSave) {
            this.onSave(this.config);
        }

        this.close();
    }

    close() {
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
