// Checkbox Group Field - Multiple selection checkboxes
import { createElement, on } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class CheckboxGroupField extends BaseField {
    constructor(config, onValueChange = null) {
        super(config, onValueChange);
        this.value = config.defaultValue || [];
        this.checkboxes = [];
    }

    render() {
        this.element = this.createContainer();

        const label = this.createLabel();
        this.element.appendChild(label);

        const group = createElement('div', {
            className: 'checkbox-group-container'
        });

        const options = this.config.options || [];
        options.forEach((option, index) => {
            const checkboxWrapper = createElement('label', {
                className: 'checkbox-group-item'
            });

            const checkbox = createElement('input', {
                type: 'checkbox',
                name: `${this.config.name}[]`,
                value: option.value,
                id: `${this.config.id}_${index}`
            });

            if (this.value.includes(option.value)) {
                checkbox.checked = true;
            }

            const checkboxLabel = createElement('span', {
                className: 'checkbox-group-label',
                textContent: option.label
            });

            const cleanup = on(checkbox, 'change', () => {
                this.updateValue();
                if (this.onValueChange) {
                    this.onValueChange(this.getName(), this.getValue());
                }
            });
            this.cleanupFunctions.push(cleanup);

            this.checkboxes.push(checkbox);
            checkboxWrapper.appendChild(checkbox);
            checkboxWrapper.appendChild(checkboxLabel);
            group.appendChild(checkboxWrapper);
        });

        this.element.appendChild(group);
        return this.element;
    }

    updateValue() {
        this.value = this.checkboxes
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    }

    getValue() {
        if (this.checkboxes.length > 0) {
            this.updateValue();
        }
        return this.value;
    }

    setValue(value) {
        this.value = Array.isArray(value) ? value : [];
        this.checkboxes.forEach(checkbox => {
            checkbox.checked = this.value.includes(checkbox.value);
        });
    }

    validate() {
        const value = this.getValue();

        if (this.config.required && value.length === 0) {
            return {
                field: this.config.name,
                label: this.config.label,
                message: `${this.config.label} is required - please select at least one option`
            };
        }

        if (this.config.minSelect && value.length < this.config.minSelect) {
            return {
                field: this.config.name,
                label: this.config.label,
                message: `Please select at least ${this.config.minSelect} option(s)`
            };
        }

        if (this.config.maxSelect && value.length > this.config.maxSelect) {
            return {
                field: this.config.name,
                label: this.config.label,
                message: `Please select no more than ${this.config.maxSelect} option(s)`
            };
        }

        return null;
    }
}
