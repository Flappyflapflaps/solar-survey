// Form Renderer - Renders forms from JSON template
import { createElement, $, on } from '../../utils/dom.js';
import { debounce } from '../../utils/debounce.js';
import { createField } from './FieldFactory.js';

export class FormRenderer {
    constructor(containerId, template, options = {}) {
        this.container = typeof containerId === 'string' ? $(`#${containerId}`) : containerId;
        this.template = template;
        this.options = {
            autoSave: true,
            autoSaveDelay: 2000,
            onValueChange: null,
            onValidate: null,
            ...options
        };

        this.fieldInstances = new Map();
        this.formElement = null;
        this.cleanupFunctions = [];
        this.formData = {};

        this.init();
    }

    init() {
        if (!this.container) {
            console.error('FormRenderer: Container not found');
            return;
        }

        this.render();

        if (this.options.autoSave) {
            this.setupAutoSave();
        }
    }

    render() {
        // Clear container
        this.container.innerHTML = '';

        // Create form element
        this.formElement = createElement('form', {
            className: 'form-builder-rendered-form',
            id: `form_${this.template.id}`
        });

        // Prevent default form submission
        const submitCleanup = on(this.formElement, 'submit', (e) => e.preventDefault());
        this.cleanupFunctions.push(submitCleanup);

        // Add form title
        if (this.template.name) {
            const title = createElement('h2', {
                className: 'form-builder-form-title',
                textContent: this.template.name
            });
            this.formElement.appendChild(title);
        }

        // Add form description
        if (this.template.description) {
            const desc = createElement('p', {
                className: 'form-builder-form-description',
                textContent: this.template.description
            });
            this.formElement.appendChild(desc);
        }

        // Sort fields by order
        const sortedFields = [...(this.template.fields || [])].sort((a, b) => a.order - b.order);

        // Render each field
        sortedFields.forEach(fieldConfig => {
            const field = createField(fieldConfig, (name, value) => this.handleValueChange(name, value));

            if (field) {
                const element = field.render();
                this.formElement.appendChild(element);
                this.fieldInstances.set(fieldConfig.id, field);
            }
        });

        this.container.appendChild(this.formElement);
    }

    handleValueChange(name, value) {
        this.formData[name] = value;

        if (this.options.onValueChange) {
            this.options.onValueChange(name, value, this.getData());
        }
    }

    setupAutoSave() {
        const autoSaveDebounced = debounce(() => {
            if (this.options.onValueChange) {
                this.options.onValueChange(null, null, this.getData());
            }
        }, this.options.autoSaveDelay);

        // Listen to form input events
        const cleanup = on(this.formElement, 'input', autoSaveDebounced);
        this.cleanupFunctions.push(cleanup);
    }

    // Get all field values
    getData() {
        const data = {};

        this.fieldInstances.forEach((field, fieldId) => {
            data[field.getName()] = field.getValue();
        });

        return data;
    }

    // Set field values
    setData(data) {
        if (!data) return;

        this.formData = { ...data };

        this.fieldInstances.forEach((field) => {
            const value = data[field.getName()];
            if (value !== undefined) {
                field.setValue(value);
            }
        });
    }

    // Validate all fields
    validate() {
        const errors = [];

        this.fieldInstances.forEach((field) => {
            // Clear previous error state
            field.clearInvalid();

            const error = field.validate();
            if (error) {
                errors.push(error);
                field.setInvalid(error.message);
            }
        });

        const result = {
            isValid: errors.length === 0,
            errors
        };

        if (this.options.onValidate) {
            this.options.onValidate(result);
        }

        return result;
    }

    // Get a specific field by ID
    getField(fieldId) {
        return this.fieldInstances.get(fieldId);
    }

    // Get a specific field by name
    getFieldByName(name) {
        for (const field of this.fieldInstances.values()) {
            if (field.getName() === name) {
                return field;
            }
        }
        return null;
    }

    // Focus first invalid field
    focusFirstInvalid() {
        for (const field of this.fieldInstances.values()) {
            const error = field.validate();
            if (error) {
                field.focus();
                return field;
            }
        }
        return null;
    }

    // Clear all field values
    clear() {
        this.formData = {};

        this.fieldInstances.forEach((field) => {
            field.setValue(null);
            field.clearInvalid();
        });
    }

    // Get template info
    getTemplate() {
        return this.template;
    }

    // Destroy and cleanup
    destroy() {
        this.cleanupFunctions.forEach(cleanup => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
        });
        this.cleanupFunctions = [];

        this.fieldInstances.forEach(field => field.destroy());
        this.fieldInstances.clear();

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.formElement = null;
        this.formData = {};
    }
}
