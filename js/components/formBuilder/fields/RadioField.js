// Radio Field - Single selection radio buttons
import { createElement, on } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class RadioField extends BaseField {
    constructor(config, onValueChange = null) {
        super(config, onValueChange);
        this.value = config.defaultValue || '';
        this.radios = [];
    }

    render() {
        this.element = this.createContainer();

        const label = this.createLabel();
        this.element.appendChild(label);

        const group = createElement('div', {
            className: 'radio-group-container'
        });

        const options = this.config.options || [];
        options.forEach((option, index) => {
            const radioWrapper = createElement('label', {
                className: 'radio-group-item'
            });

            const radio = createElement('input', {
                type: 'radio',
                name: this.config.name,
                value: option.value,
                id: `${this.config.id}_${index}`
            });

            if (this.value === option.value) {
                radio.checked = true;
            }

            const radioLabel = createElement('span', {
                className: 'radio-group-label',
                textContent: option.label
            });

            const cleanup = on(radio, 'change', () => {
                this.value = radio.value;
                if (this.onValueChange) {
                    this.onValueChange(this.getName(), this.getValue());
                }
            });
            this.cleanupFunctions.push(cleanup);

            this.radios.push(radio);
            radioWrapper.appendChild(radio);
            radioWrapper.appendChild(radioLabel);
            group.appendChild(radioWrapper);
        });

        this.element.appendChild(group);
        return this.element;
    }

    getValue() {
        const checked = this.radios.find(r => r.checked);
        return checked ? checked.value : this.value;
    }

    setValue(value) {
        this.value = value || '';
        this.radios.forEach(radio => {
            radio.checked = radio.value === this.value;
        });
    }
}
