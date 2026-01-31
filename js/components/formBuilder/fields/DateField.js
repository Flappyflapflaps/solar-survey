// Date Field - Date picker input
import { createElement } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class DateField extends BaseField {
    constructor(config, onValueChange = null) {
        super(config, onValueChange);
        this.value = config.defaultValue || '';
    }

    render() {
        this.element = this.createContainer();

        const label = this.createLabel();
        this.element.appendChild(label);

        this.input = createElement('input', {
            type: 'date',
            id: this.config.id,
            name: this.config.name,
            className: 'form-builder-input',
            value: this.value
        });

        if (this.config.min) {
            this.input.min = this.config.min;
        }
        if (this.config.max) {
            this.input.max = this.config.max;
        }

        this.setupChangeListener(this.input);
        this.element.appendChild(this.input);

        return this.element;
    }

    getValue() {
        return this.input ? this.input.value : this.value;
    }

    setValue(value) {
        this.value = value || '';
        if (this.input) {
            this.input.value = this.value;
        }
    }
}
