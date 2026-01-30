// Signature Field Component - Canvas-based signature pad
import { createElement, on } from '../../../utils/dom.js';
import { BaseField } from './BaseField.js';

export class SignatureField extends BaseField {
    constructor(config, onValueChange) {
        super(config, onValueChange);
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.signatureData = null;
    }

    render() {
        this.element = this.createContainer();
        this.element.appendChild(this.createLabel());

        // Signature wrapper
        const wrapper = createElement('div', { className: 'signature-wrapper' });

        // Canvas element
        this.canvas = createElement('canvas', {
            className: 'signature-canvas',
            id: this.config.id
        });
        this.canvas.width = this.config.width || 300;
        this.canvas.height = this.config.height || 150;

        wrapper.appendChild(this.canvas);

        // Buttons container
        const buttons = createElement('div', { className: 'signature-buttons' });

        // Clear button
        const clearBtn = createElement('button', {
            type: 'button',
            className: 'signature-clear-btn',
            textContent: 'Clear'
        });

        buttons.appendChild(clearBtn);
        wrapper.appendChild(buttons);

        this.element.appendChild(wrapper);

        // Setup canvas context
        this.ctx = this.canvas.getContext('2d');
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Fill with white background
        this.clearCanvas();

        // Setup drawing events
        this.setupDrawing();

        // Clear button handler
        const clearCleanup = on(clearBtn, 'click', () => this.clear());
        this.cleanupFunctions.push(clearCleanup);

        return this.element;
    }

    setupDrawing() {
        // Mouse events
        const mouseDownCleanup = on(this.canvas, 'mousedown', (e) => this.startDrawing(e));
        const mouseMoveCleanup = on(this.canvas, 'mousemove', (e) => this.draw(e));
        const mouseUpCleanup = on(this.canvas, 'mouseup', () => this.stopDrawing());
        const mouseOutCleanup = on(this.canvas, 'mouseout', () => this.stopDrawing());

        // Touch events
        const touchStartCleanup = on(this.canvas, 'touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        }, { passive: false });

        const touchMoveCleanup = on(this.canvas, 'touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        }, { passive: false });

        const touchEndCleanup = on(this.canvas, 'touchend', () => this.stopDrawing());

        this.cleanupFunctions.push(
            mouseDownCleanup, mouseMoveCleanup, mouseUpCleanup, mouseOutCleanup,
            touchStartCleanup, touchMoveCleanup, touchEndCleanup
        );
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const coords = this.getCanvasCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    draw(e) {
        if (!this.isDrawing) return;

        const coords = this.getCanvasCoordinates(e);

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();

        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveSignature();
        }
    }

    saveSignature() {
        // Check if canvas has any drawing (not just white)
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        let hasDrawing = false;

        for (let i = 0; i < data.length; i += 4) {
            // Check if pixel is not white (255, 255, 255)
            if (data[i] < 255 || data[i + 1] < 255 || data[i + 2] < 255) {
                hasDrawing = true;
                break;
            }
        }

        this.signatureData = hasDrawing ? this.canvas.toDataURL('image/png') : null;

        if (this.onValueChange) {
            this.onValueChange(this.getName(), this.getValue());
        }
    }

    clearCanvas() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    clear() {
        this.clearCanvas();
        this.signatureData = null;

        if (this.onValueChange) {
            this.onValueChange(this.getName(), this.getValue());
        }
    }

    getValue() {
        return this.signatureData;
    }

    setValue(value) {
        this.signatureData = value;

        if (value) {
            const img = new Image();
            img.onload = () => {
                this.clearCanvas();
                this.ctx.drawImage(img, 0, 0);
            };
            img.src = value;
        } else {
            this.clearCanvas();
        }
    }

    validate() {
        if (this.config.required && !this.signatureData) {
            return {
                field: this.config.name,
                label: this.config.label,
                message: `${this.config.label} is required`
            };
        }
        return null;
    }

    destroy() {
        this.signatureData = null;
        this.ctx = null;
        this.canvas = null;
        super.destroy();
    }
}
