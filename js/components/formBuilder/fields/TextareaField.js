// Textarea Field Component
import { createElement } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class TextareaField extends BaseField {
    render() {
        this.element = this.createContainer();
        this.element.appendChild(this.createLabel());

        this.input = createElement('textarea', {
            id: this.config.id,
            name: this.config.name,
            placeholder: this.config.placeholder || '',
            className: 'form-builder-input form-builder-textarea'
        });

        if (this.config.rows) {
            this.input.rows = this.config.rows;
        } else {
            this.input.rows = 4; // Default rows
        }

        if (this.config.maxLength) {
            this.input.maxLength = this.config.maxLength;
        }

        this.element.appendChild(this.input);
        this.setupInputListener(this.input);

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
}
