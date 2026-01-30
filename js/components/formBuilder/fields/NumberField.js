// Number Field Component
import { createElement } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class NumberField extends BaseField {
    render() {
        this.element = this.createContainer();
        this.element.appendChild(this.createLabel());

        this.input = createElement('input', {
            type: 'number',
            id: this.config.id,
            name: this.config.name,
            placeholder: this.config.placeholder || '',
            className: 'form-builder-input'
        });

        if (this.config.min !== undefined) {
            this.input.min = this.config.min;
        }
        if (this.config.max !== undefined) {
            this.input.max = this.config.max;
        }
        if (this.config.step !== undefined) {
            this.input.step = this.config.step;
        }

        this.element.appendChild(this.input);
        this.setupInputListener(this.input);

        return this.element;
    }

    getValue() {
        if (!this.input || this.input.value === '') {
            return null;
        }
        const num = parseFloat(this.input.value);
        return isNaN(num) ? null : num;
    }

    setValue(value) {
        if (this.input) {
            this.input.value = value !== null && value !== undefined ? value : '';
        }
    }

    validate() {
        // First do base validation
        const baseError = super.validate();
        if (baseError) return baseError;

        const value = this.getValue();
        if (value === null) return null;

        if (this.config.min !== undefined && value < this.config.min) {
            return {
                field: this.config.name,
                label: this.config.label,
                message: `${this.config.label} must be at least ${this.config.min}`
            };
        }

        if (this.config.max !== undefined && value > this.config.max) {
            return {
                field: this.config.name,
                label: this.config.label,
                message: `${this.config.label} must be at most ${this.config.max}`
            };
        }

        return null;
    }
}
