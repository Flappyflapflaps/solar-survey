// Info Field - Static text/instructions (non-input)
import { createElement } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class InfoField extends BaseField {
    constructor(config, onValueChange = null) {
        super(config, onValueChange);
    }

    render() {
        this.element = createElement('div', {
            className: `form-builder-info-block info-${this.config.style || 'default'}`,
            'data-field-id': this.config.id,
            'data-field-type': this.config.type
        });

        if (this.config.label) {
            const title = createElement('div', {
                className: 'info-title'
            });

            // Add icon based on style
            const icon = this.getIcon();
            if (icon) {
                const iconSpan = createElement('span', {
                    className: 'info-icon',
                    textContent: icon
                });
                title.appendChild(iconSpan);
            }

            const titleText = createElement('span', {
                textContent: this.config.label
            });
            title.appendChild(titleText);

            this.element.appendChild(title);
        }

        if (this.config.content) {
            const content = createElement('div', {
                className: 'info-content'
            });
            // Support basic HTML or plain text
            if (this.config.allowHtml) {
                content.innerHTML = this.config.content;
            } else {
                content.textContent = this.config.content;
            }
            this.element.appendChild(content);
        }

        return this.element;
    }

    getIcon() {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            success: '✅',
            error: '❌',
            tip: '💡',
            default: ''
        };
        return icons[this.config.style] || icons.default;
    }

    // Info fields don't have values
    getValue() {
        return null;
    }

    setValue(value) {
        // No-op for info fields
    }

    // Info fields don't need validation
    validate() {
        return null;
    }
}
