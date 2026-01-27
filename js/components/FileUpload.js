// FileUpload service to handle file uploads, previews, and file data management

import { formState } from '../state/formState.js';
import { $, createElement, on } from '../utils/dom.js';

export class FileUpload {
    constructor(inputId, previewId, options = {}) {
        this.inputId = inputId;
        this.previewId = previewId;
        this.options = {
            multiple: false,
            accept: options.accept || '*/*',
            onFileChange: options.onFileChange || null,
            ...options
        };
        
        this.input = null;
        this.preview = null;
        this.cleanupFunctions = [];
        
        this.init();
    }

    init() {
        this.input = $(`#${this.inputId}`);
        this.preview = $(`#${this.previewId}`);
        
        if (!this.input) {
            console.warn(`FileUpload: Input element #${this.inputId} not found`);
            return;
        }
        
        if (!this.preview) {
            console.warn(`FileUpload: Preview element #${this.previewId} not found`);
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        const cleanup = on(this.input, 'change', (e) => this.handleFileChange(e));
        this.cleanupFunctions.push(cleanup);
    }

    handleFileChange(event) {
        if (this.options.multiple) {
            this.handleMultipleFiles(event);
        } else {
            this.handleSingleFile(event);
        }
    }

    handleSingleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileKey = this.inputId;
        formState.setFileData(fileKey, file);

        this.readFile(file, (dataUrl) => {
            this.renderPreview(file, dataUrl, fileKey);
            if (this.options.onFileChange) {
                this.options.onFileChange(file, fileKey);
            }
        });
    }

    handleMultipleFiles(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const fileKey = this.inputId;
        formState.setFileData(fileKey, files);

        this.preview.innerHTML = '';
        
        files.forEach((file, index) => {
            this.readFile(file, (dataUrl) => {
                this.renderPreview(file, dataUrl, fileKey, index);
            });
        });

        if (this.options.onFileChange) {
            this.options.onFileChange(files, fileKey);
        }
    }

    readFile(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => callback(e.target.result);
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
        };
        reader.readAsDataURL(file);
    }

    renderPreview(file, dataUrl, fileKey, index = null) {
        const isImage = file.type.startsWith('image/');
        const previewItem = createElement('div', { className: 'file-preview-item' });
        
        if (isImage) {
            const img = createElement('img', {
                src: dataUrl,
                alt: file.name
            });
            previewItem.appendChild(img);
        } else {
            const span = createElement('span', { textContent: file.name });
            previewItem.appendChild(span);
        }

        const removeBtn = createElement('button', {
            type: 'button',
            className: 'remove-file',
            textContent: '×'
        });

        removeBtn.addEventListener('click', () => {
            if (index !== null) {
                this.removeFileFromArray(fileKey, index);
            } else {
                this.removeFile(fileKey);
            }
        });

        previewItem.appendChild(removeBtn);
        
        if (this.options.multiple) {
            this.preview.appendChild(previewItem);
        } else {
            this.preview.innerHTML = '';
            this.preview.appendChild(previewItem);
        }
    }

    removeFile(fileKey) {
        formState.removeFileData(fileKey);
        this.preview.innerHTML = '';
        if (this.input) {
            this.input.value = '';
        }
        if (this.options.onFileChange) {
            this.options.onFileChange(null, fileKey);
        }
    }

    removeFileFromArray(fileKey, index) {
        formState.removeFileFromArray(fileKey, index);
        
        // Re-render previews
        const fileData = formState.get('fileData');
        const files = fileData[fileKey] || [];
        this.preview.innerHTML = '';
        
        files.forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.renderPreview(file, e.target.result, fileKey, i);
            };
            reader.readAsDataURL(file);
        });

        if (this.options.onFileChange) {
            this.options.onFileChange(files, fileKey);
        }
    }

    clear() {
        this.removeFile(this.inputId);
    }

    destroy() {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
        this.input = null;
        this.preview = null;
    }
}

// Factory function to initialize file uploads
export function initializeFileUploads(onFileChange = null) {
    const uploads = [];

    // Floorplan
    const floorplanUpload = new FileUpload('floorplan', 'floorplanPreview', {
        onFileChange
    });
    uploads.push(floorplanUpload);

    // Roof plan
    const roofPlanUpload = new FileUpload('roofPlan', 'roofPlanPreview', {
        onFileChange
    });
    uploads.push(roofPlanUpload);

    // Additional photos (multiple)
    const additionalPhotosUpload = new FileUpload('additionalPhotos', 'additionalPhotosPreview', {
        multiple: true,
        onFileChange
    });
    uploads.push(additionalPhotosUpload);

    // Initialize in-home photo buttons
    initializeInHomePhotoButtons(onFileChange);

    return uploads;
}

// Initialize quick-tap buttons for fast input
export function initializeQuickButtons() {
    document.querySelectorAll('.quick-options').forEach(container => {
        const targetId = container.dataset.target;
        const targetInput = document.getElementById(targetId);
        if (!targetInput) return;

        container.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Toggle selection
                const wasSelected = btn.classList.contains('selected');

                // Clear other selections in same group
                container.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('selected'));

                if (wasSelected) {
                    // Deselect - clear input
                    targetInput.value = '';
                } else {
                    // Select - set value
                    btn.classList.add('selected');
                    targetInput.value = btn.textContent;
                }

                // Trigger change event for auto-save
                targetInput.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });

        // Sync button state if input changes manually
        targetInput.addEventListener('input', () => {
            const val = targetInput.value.toLowerCase().trim();
            container.querySelectorAll('.quick-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.textContent.toLowerCase().trim() === val);
            });
        });
    });
}

// Initialize photo buttons in the in-home survey section
export function initializeInHomePhotoButtons(onFileChange = null) {
    // Initialize quick-tap buttons
    initializeQuickButtons();

    const photoButtons = document.querySelectorAll('.inhome-section .photo-btn input[type="file"]');

    photoButtons.forEach(input => {
        input.addEventListener('change', (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            // Find the preview container (sibling of the form-group's inhome-row)
            const formGroup = input.closest('.form-group');
            const previewId = input.name + 'Preview';
            let preview = formGroup.querySelector('.file-preview');

            if (!preview) {
                preview = document.createElement('div');
                preview.className = 'file-preview';
                formGroup.appendChild(preview);
            }

            // Clear existing previews if not multiple
            if (!input.hasAttribute('multiple')) {
                preview.innerHTML = '';
            }

            // Process each file
            Array.from(files).forEach((file, index) => {
                if (!file.type.startsWith('image/')) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'file-preview-item';

                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = file.name;
                    previewItem.appendChild(img);

                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'remove-file';
                    removeBtn.textContent = '×';
                    removeBtn.addEventListener('click', () => {
                        previewItem.remove();
                        // Clear the input if no previews left
                        if (preview.children.length === 0) {
                            input.value = '';
                        }
                    });

                    previewItem.appendChild(removeBtn);
                    preview.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            });

            // Update the photo button to show it has photos
            const photoBtn = input.closest('.photo-btn');
            if (photoBtn) {
                photoBtn.style.background = 'var(--success-color)';
            }

            if (onFileChange) {
                onFileChange(files, input.name);
            }
        });
    });
}


