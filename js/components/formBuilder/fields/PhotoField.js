// Photo Field Component - Camera capture and file upload
import { createElement, on } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class PhotoField extends BaseField {
    constructor(config, onValueChange) {
        super(config, onValueChange);
        this.photos = [];
        this.preview = null;
    }

    render() {
        this.element = this.createContainer();
        this.element.appendChild(this.createLabel());

        // File input wrapper
        const inputWrapper = createElement('div', { className: 'photo-input-wrapper' });

        // File input with camera capture
        this.input = createElement('input', {
            type: 'file',
            id: this.config.id,
            name: this.config.name,
            accept: 'image/*',
            className: 'form-builder-file-input'
        });

        // Enable camera on mobile
        this.input.setAttribute('capture', 'environment');

        if (this.config.multiple) {
            this.input.multiple = true;
        }

        // Custom styled button
        const uploadBtn = createElement('label', {
            htmlFor: this.config.id,
            className: 'photo-upload-btn'
        });
        uploadBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>
                <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
            </svg>
            <span>${this.config.multiple ? 'Add Photos' : 'Take Photo'}</span>
        `;

        inputWrapper.appendChild(this.input);
        inputWrapper.appendChild(uploadBtn);
        this.element.appendChild(inputWrapper);

        // Preview container
        this.preview = createElement('div', { className: 'photo-preview-container' });
        this.element.appendChild(this.preview);

        // Max files hint
        if (this.config.maxFiles) {
            const hint = createElement('div', {
                className: 'field-hint',
                textContent: `Maximum ${this.config.maxFiles} photos`
            });
            this.element.appendChild(hint);
        }

        // Setup event listener
        const cleanup = on(this.input, 'change', (e) => this.handleFileChange(e));
        this.cleanupFunctions.push(cleanup);

        return this.element;
    }

    handleFileChange(e) {
        const files = Array.from(e.target.files);

        files.forEach(file => {
            // Check max files limit
            if (this.config.maxFiles && this.photos.length >= this.config.maxFiles) {
                alert(`Maximum ${this.config.maxFiles} photos allowed`);
                return;
            }

            this.processFile(file);
        });

        // Clear input so same file can be selected again
        this.input.value = '';
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const photo = {
                id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                type: file.type,
                data: e.target.result // Base64 data URL
            };

            this.photos.push(photo);
            this.renderPreview();

            if (this.onValueChange) {
                this.onValueChange(this.getName(), this.getValue());
            }
        };

        reader.onerror = () => {
            alert('Error reading file');
        };

        reader.readAsDataURL(file);
    }

    renderPreview() {
        this.preview.innerHTML = '';

        this.photos.forEach((photo, index) => {
            const item = createElement('div', { className: 'photo-preview-item' });

            const img = createElement('img', {
                src: photo.data,
                alt: photo.name
            });
            item.appendChild(img);

            // Remove button
            const removeBtn = createElement('button', {
                type: 'button',
                className: 'photo-remove-btn',
                textContent: '×'
            });

            const cleanup = on(removeBtn, 'click', () => this.removePhoto(index));
            this.cleanupFunctions.push(cleanup);

            item.appendChild(removeBtn);
            this.preview.appendChild(item);
        });
    }

    removePhoto(index) {
        this.photos.splice(index, 1);
        this.renderPreview();

        if (this.onValueChange) {
            this.onValueChange(this.getName(), this.getValue());
        }
    }

    getValue() {
        return this.photos.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            data: p.data
        }));
    }

    setValue(value) {
        this.photos = Array.isArray(value) ? [...value] : [];
        this.renderPreview();
    }

    validate() {
        if (this.config.required && this.photos.length === 0) {
            return {
                field: this.config.name,
                label: this.config.label,
                message: `${this.config.label} is required`
            };
        }
        return null;
    }

    destroy() {
        this.photos = [];
        super.destroy();
    }
}
