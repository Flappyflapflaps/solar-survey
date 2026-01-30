// Base Field Class - Abstract base for all field types
import { createElement, on } from '../../../utils/dom.js';

export class BaseField {
    constructor(config, onValueChange = null) {
        this.config = config;
        this.onValueChange = onValueChange;
        this.element = null;
        this.input = null;
        this.cleanupFunctions = [];
    }

    // Abstract method - must be implemented by subclasses
    render() {
        throw new Error('render() must be implemented by subclass');
    }

    // Abstract method - must be implemented by subclasses
    getValue() {
        throw new Error('getValue() must be implemented by subclass');
    }

    // Abstract method - must be implemented by subclasses
    setValue(value) {
        throw new Error('setValue() must be implemented by subclass');
    }

    // Get field name (data key)
    getName() {
        return this.config.name;
    }

    // Get field ID
    getId() {
        return this.config.id;
    }

    // Get field type
    getType() {
        return this.config.type;
    }

    // Get field config
    getConfig() {
        return { ...this.config };
    }

    // Validate field value
    validate() {
        const value = this.getValue();

        if (this.config.required) {
            if (value === null || value === undefined || value === '') {
                return {
                    field: this.config.name,
                    label: this.config.label,
                    message: `${this.config.label} is required`
                };
            }
            // For arrays (photo field), check length
            if (Array.isArray(value) && value.length === 0) {
                return {
                    field: this.config.name,
                    label: this.config.label,
                    message: `${this.config.label} is required`
                };
            }
        }

        return null; // No error
    }

    // Create label element
    createLabel() {
        const label = createElement('label', {
            htmlFor: this.config.id,
            className: 'form-builder-label'
        });

        label.textContent = this.config.label;

        if (this.config.required) {
            const required = createElement('span', {
                className: 'required-marker',
                textContent: ' *'
            });
            label.appendChild(required);
        }

        return label;
    }

    // Create container element
    createContainer() {
        return createElement('div', {
            className: 'form-group form-builder-field',
            'data-field-id': this.config.id,
            'data-field-type': this.config.type
        });
    }

    // Setup standard input event listener
    setupInputListener(inputElement) {
        const cleanup = on(inputElement, 'input', () => {
            if (this.onValueChange) {
                this.onValueChange(this.getName(), this.getValue());
            }
        });
        this.cleanupFunctions.push(cleanup);
    }

    // Setup change event listener (for select, file inputs)
    setupChangeListener(inputElement) {
        const cleanup = on(inputElement, 'change', () => {
            if (this.onValueChange) {
                this.onValueChange(this.getName(), this.getValue());
            }
        });
        this.cleanupFunctions.push(cleanup);
    }

    // Mark field as invalid
    setInvalid(message) {
        if (this.element) {
            this.element.classList.add('field-invalid');

            // Add or update error message
            let errorEl = this.element.querySelector('.field-error');
            if (!errorEl) {
                errorEl = createElement('div', { className: 'field-error' });
                this.element.appendChild(errorEl);
            }
            errorEl.textContent = message;
        }
    }

    // Clear invalid state
    clearInvalid() {
        if (this.element) {
            this.element.classList.remove('field-invalid');
            const errorEl = this.element.querySelector('.field-error');
            if (errorEl) {
                errorEl.remove();
            }
        }
    }

    // Focus the input
    focus() {
        if (this.input && typeof this.input.focus === 'function') {
            this.input.focus();
        }
    }

    // Cleanup and destroy
    destroy() {
        this.cleanupFunctions.forEach(cleanup => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
        });
        this.cleanupFunctions = [];

        if (this.element && this.element.parentNode) {
            this.element.remove();
        }

        this.element = null;
        this.input = null;
    }
}
