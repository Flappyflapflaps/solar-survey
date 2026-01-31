// Toggle Field - Yes/No switch
import { createElement, on } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class ToggleField extends BaseField {
    constructor(config, onValueChange = null) {
        super(config, onValueChange);
        this.value = config.defaultValue !== undefined ? config.defaultValue : null;
    }

    render() {
        this.element = this.createContainer();

        const label = this.createLabel();
        this.element.appendChild(label);

        const toggleContainer = createElement('div', {
            className: 'toggle-container'
        });

        // Yes/No labels
        const yesLabel = this.config.yesLabel || 'Yes';
        const noLabel = this.config.noLabel || 'No';

        // Create toggle switch
        const toggleWrapper = createElement('label', {
            className: 'toggle-switch'
        });

        this.input = createElement('input', {
            type: 'checkbox',
            id: this.config.id,
            name: this.config.name,
            className: 'toggle-input'
        });

        if (this.value === true) {
            this.input.checked = true;
        }

        const slider = createElement('span', {
            className: 'toggle-slider'
        });

        const noText = createElement('span', {
            className: 'toggle-label toggle-label-no',
            textContent: noLabel
        });

        const yesText = createElement('span', {
            className: 'toggle-label toggle-label-yes',
            textContent: yesLabel
        });

        const cleanup = on(this.input, 'change', () => {
            this.value = this.input.checked;
            this.updateToggleState();
            if (this.onValueChange) {
                this.onValueChange(this.getName(), this.getValue());
            }
        });
        this.cleanupFunctions.push(cleanup);

        toggleWrapper.appendChild(this.input);
        toggleWrapper.appendChild(slider);

        toggleContainer.appendChild(noText);
        toggleContainer.appendChild(toggleWrapper);
        toggleContainer.appendChild(yesText);

        this.element.appendChild(toggleContainer);
        this.updateToggleState();

        return this.element;
    }

    updateToggleState() {
        if (!this.element) return;
        const container = this.element.querySelector('.toggle-container');
        if (container) {
            container.classList.toggle('toggle-on', this.value === true);
            container.classList.toggle('toggle-off', this.value === false);
        }
    }

    getValue() {
        return this.input ? this.input.checked : this.value;
    }

    setValue(value) {
        this.value = value === true || value === 'true' || value === 1;
        if (this.input) {
            this.input.checked = this.value;
        }
        this.updateToggleState();
    }

    validate() {
        if (this.config.required && this.getValue() !== true) {
            return {
                field: this.config.name,
                label: this.config.label,
                message: `${this.config.label} must be confirmed`
            };
        }
        return null;
    }
}
