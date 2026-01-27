// RoofAspect component to encapsulate roof aspect form creation and management

import { formState } from '../state/formState.js';
import { ButtonGroup, initializeButtonGroups } from './ButtonGroup.js';
import { createElement, $, on } from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';

export class RoofAspect {
    constructor(index, container, onValueChange = null) {
        this.index = index;
        this.container = container;
        this.onValueChange = onValueChange;
        this.element = null;
        this.buttonGroups = [];
        this.cleanupFunctions = [];
        
        this.create();
        this.setupEventListeners();
    }

    create() {
        const aspectDiv = createElement('div', {
            className: 'roof-aspect',
            id: `roofAspect${this.index}`
        });

        const header = this.createHeader();
        const formFields = this.createFormFields();
        
        aspectDiv.appendChild(header);
        formFields.forEach(field => aspectDiv.appendChild(field));
        
        this.container.appendChild(aspectDiv);
        this.element = aspectDiv;
        
        // Initialize button groups
        this.buttonGroups = initializeButtonGroups(aspectDiv, this.onValueChange);
    }

    createHeader() {
        const header = createElement('div', { className: 'roof-aspect-header' });
        const title = createElement('h3', { textContent: `Roof Aspect ${this.index}` });
        header.appendChild(title);
        
        if (this.index > 1) {
            const removeBtn = createElement('button', {
                type: 'button',
                className: 'btn-remove-roof',
                textContent: 'Remove'
            });
            removeBtn.addEventListener('click', () => this.remove());
            header.appendChild(removeBtn);
        }
        
        return header;
    }

    createFormFields() {
        const fields = [];
        
        // Row 1: Covering Type, Slope length
        fields.push(this.createFormRow([
            this.createInputGroup(`roof${this.index}_coveringType`, 'Covering Type:', 'Covering type'),
            this.createInputGroup(`roof${this.index}_slopeLength`, 'Slope length:', 'Length')
        ]));
        
        // Row 2: Orientation, Width at Gutter
        fields.push(this.createFormRow([
            this.createInputGroup(`roof${this.index}_orientation`, 'Orientation from S:', 'Orientation'),
            this.createInputGroup(`roof${this.index}_widthGutter`, 'Width at Gutter:', 'Width')
        ]));
        
        // Row 3: Width at Ridge, Inclination
        fields.push(this.createFormRow([
            this.createInputGroup(`roof${this.index}_widthRidge`, 'Width at Ridge:', 'Width'),
            this.createInputGroup(`roof${this.index}_inclination`, 'Inclination:', 'Inclination')
        ]));
        
        // Row 4: Rafter Width, Rafter Depth
        fields.push(this.createFormRow([
            this.createInputGroup(`roof${this.index}_rafterWidth`, 'Rafter Width:', 'Width'),
            this.createInputGroup(`roof${this.index}_rafterDepth`, 'Rafter Depth:', 'Depth')
        ]));
        
        // Row 5: Centre spacings, Gutter height
        fields.push(this.createFormRow([
            this.createInputGroup(`roof${this.index}_centreSpacings`, 'Centre spacings:', 'Spacings'),
            this.createInputGroup(`roof${this.index}_gutterHeight`, 'Gutter height:', 'Height')
        ]));
        
        // Row 6: Warranty, Shading (with button groups)
        fields.push(this.createFormRow([
            this.createButtonGroupField(`roof${this.index}_warranty`, 'Is roof under warranty:'),
            this.createButtonGroupField(`roof${this.index}_shading`, 'Shading Present:')
        ]));
        
        return fields;
    }

    createFormRow(groups) {
        const row = createElement('div', { className: 'form-row' });
        groups.forEach(group => {
            const formGroup = createElement('div', { className: 'form-group' });
            formGroup.appendChild(group);
            row.appendChild(formGroup);
        });
        return row;
    }

    createInputGroup(name, labelText, placeholder) {
        const label = createElement('label', {
            htmlFor: name,
            textContent: labelText
        });
        const input = createElement('input', {
            type: 'text',
            id: name,
            name: name,
            placeholder: placeholder
        });
        
        const container = createElement('div');
        container.appendChild(label);
        container.appendChild(input);
        return container;
    }

    createButtonGroupField(fieldName, labelText) {
        const label = createElement('label', {
            htmlFor: fieldName,
            textContent: labelText
        });
        
        const buttonGroup = createElement('div', { className: 'button-group' });
        ['Y', 'N', 'Notes'].forEach(value => {
            const button = createElement('button', {
                type: 'button',
                className: value === 'Notes' ? 'btn-choice btn-notes' : 'btn-choice',
                'data-field': fieldName,
                'data-value': value,
                textContent: value === 'Notes' ? 'Notes' : value
            });
            buttonGroup.appendChild(button);
        });
        
        const hiddenInput = createElement('input', {
            type: 'hidden',
            id: fieldName,
            name: fieldName,
            value: ''
        });
        
        const notesField = createElement('div', {
            className: 'notes-field',
            id: `${fieldName}Notes`,
            style: 'display: none;'
        });
        const textarea = createElement('textarea', {
            name: `${fieldName}Notes`,
            placeholder: 'Add notes...'
        });
        notesField.appendChild(textarea);
        
        const container = createElement('div');
        container.appendChild(label);
        container.appendChild(buttonGroup);
        container.appendChild(hiddenInput);
        container.appendChild(notesField);
        return container;
    }

    setupEventListeners() {
        if (!this.element) return;
        
        const inputs = this.element.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'hidden') return;
            
            const debouncedChange = debounce(() => {
                if (this.onValueChange) {
                    this.onValueChange();
                }
            }, 2000);
            
            const inputCleanup = on(input, 'input', debouncedChange);
            const changeCleanup = on(input, 'change', debouncedChange);
            this.cleanupFunctions.push(inputCleanup, changeCleanup);
        });
    }

    remove() {
        if (this.index <= 1) return; // Don't remove the first one
        
        // Cleanup
        this.buttonGroups.forEach(group => group.destroy());
        this.cleanupFunctions.forEach(cleanup => cleanup());
        
        // Remove from DOM
        if (this.element) {
            this.element.remove();
        }
        
        // Decrement count in state
        formState.decrementRoofAspectCount();
        
        // Trigger callback
        if (this.onValueChange) {
            this.onValueChange();
        }
    }

    getData() {
        if (!this.element) return {};
        
        const data = {};
        const inputs = this.element.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.name && input.value) {
                data[input.name] = input.value;
            }
        });
        
        return data;
    }

    setData(data) {
        if (!this.element) return;
        
        Object.keys(data).forEach(key => {
            const field = this.element.querySelector(`[name="${key}"]`);
            if (field) {
                field.value = data[key] || '';
                
                // Restore button group state
                if (field.type === 'hidden' && field.value) {
                    const button = this.element.querySelector(
                        `[data-field="${key}"][data-value="${field.value}"]`
                    );
                    if (button) {
                        button.classList.add('active');
                        
                        if (field.value === 'Notes') {
                            const notesField = $(`#${key}Notes`, this.element);
                            if (notesField) {
                                notesField.style.display = 'block';
                            }
                        }
                    }
                }
            }
        });
    }

    destroy() {
        this.buttonGroups.forEach(group => group.destroy());
        this.cleanupFunctions.forEach(cleanup => cleanup());
        if (this.element) {
            this.element.remove();
        }
    }
}

// Manager class to handle multiple roof aspects
export class RoofAspectManager {
    constructor(containerId, onValueChange = null) {
        this.container = $(`#${containerId}`);
        this.onValueChange = onValueChange;
        this.aspects = [];
        
        if (!this.container) {
            console.error(`RoofAspectManager: Container #${containerId} not found`);
        }
    }

    add() {
        const index = this.aspects.length + 1;
        const aspect = new RoofAspect(index, this.container, this.onValueChange);
        this.aspects.push(aspect);
        return aspect;
    }

    remove(index) {
        const aspect = this.aspects.find(a => a.index === index);
        if (aspect) {
            aspect.remove();
            this.aspects = this.aspects.filter(a => a.index !== index);
            // Re-index remaining aspects
            this.reindex();
        }
    }

    reindex() {
        // This would require re-rendering, so for now we'll keep the original indices
        // In a production app, you might want to re-render with new indices
    }

    getAllData() {
        return this.aspects.map(aspect => aspect.getData());
    }

    setAllData(dataArray) {
        // Clear existing aspects except first
        while (this.aspects.length > 1) {
            const lastAspect = this.aspects[this.aspects.length - 1];
            lastAspect.destroy();
            this.aspects.pop();
        }
        
        // Add new aspects and populate data
        dataArray.forEach((data, index) => {
            if (index === 0 && this.aspects[0]) {
                this.aspects[0].setData(data);
            } else {
                const aspect = this.add();
                aspect.setData(data);
            }
        });
    }

    getCount() {
        return this.aspects.length;
    }

    getAspect(index) {
        return this.aspects.find(a => a.index === index);
    }
}

