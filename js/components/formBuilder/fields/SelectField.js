// Select Field Component
import { createElement } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class SelectField extends BaseField {
    render() {
        this.element = this.createContainer();
        this.element.appendChild(this.createLabel());

        this.input = createElement('select', {
            id: this.config.id,
            name: this.config.name,
            className: 'form-builder-input form-builder-select'
        });

        // Add placeholder option
        const placeholder = createElement('option', {
            value: '',
            textContent: this.config.placeholder || 'Select an option...'
        });
        this.input.appendChild(placeholder);

        // Add options
        if (this.config.options && Array.isArray(this.config.options)) {
            this.config.options.forEach(opt => {
                const option = createElement('option', {
                    value: opt.value,
                    textContent: opt.label
                });
                this.input.appendChild(option);
            });
        }

        this.element.appendChild(this.input);
        this.setupChangeListener(this.input);

        return this.element;
    }

    getValue() {
        return this.input ? this.input.value : '';
    }

    setValue(value) {
        if (this.input) {
            this.input.value = value || '';
        }
    }

    // Update options dynamically
    setOptions(options) {
        if (!this.input) return;

        // Clear existing options except placeholder
        while (this.input.children.length > 1) {
            this.input.removeChild(this.input.lastChild);
        }

        // Add new options
        options.forEach(opt => {
            const option = createElement('option', {
                value: opt.value,
                textContent: opt.label
            });
            this.input.appendChild(option);
        });
    }
}
