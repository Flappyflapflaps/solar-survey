// Time Field - Time picker input
import { createElement } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class TimeField extends BaseField {
    constructor(config, onValueChange = null) {
        super(config, onValueChange);
        this.value = config.defaultValue || '';
    }

    render() {
        this.element = this.createContainer();

        const label = this.createLabel();
        this.element.appendChild(label);

        this.input = createElement('input', {
            type: 'time',
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
        if (this.config.step) {
            this.input.step = this.config.step;
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
