// Section Field - Visual divider/header for grouping fields
import { createElement } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class SectionField extends BaseField {
    constructor(config, onValueChange = null) {
        super(config, onValueChange);
    }

    render() {
        this.element = createElement('div', {
            className: 'form-builder-section-divider',
            'data-field-id': this.config.id,
            'data-field-type': this.config.type
        });

        const header = createElement('h3', {
            className: 'section-header',
            textContent: this.config.label
        });

        this.element.appendChild(header);

        if (this.config.description) {
            const description = createElement('p', {
                className: 'section-description',
                textContent: this.config.description
            });
            this.element.appendChild(description);
        }

        return this.element;
    }

    // Section fields don't have values
    getValue() {
        return null;
    }

    setValue(value) {
        // No-op for section fields
    }

    // Section fields don't need validation
    validate() {
        return null;
    }

    // Override createLabel since we handle it differently
    createLabel() {
        return null;
    }
}
