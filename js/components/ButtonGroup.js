// ButtonGroup Component for Yes/No/Notes buttons

import { formState } from '../state/formState.js';
import { debounce } from '../utils/debounce.js';
import { $, $$, on } from '../utils/dom.js';

export class ButtonGroup {
    constructor(container, fieldName, onValueChange = null) {
        this.container = container;
        this.fieldName = fieldName;
        this.onValueChange = onValueChange;
        this.buttons = [];
        this.hiddenInput = null;
        this.notesField = null;
        this.cleanupFunctions = [];
        
        this.init();
    }

    init() {
        const group = this.container.querySelector('.button-group');
        if (!group) {
            console.warn(`ButtonGroup: No .button-group found for field ${this.fieldName}`);
            return;
        }

        this.buttons = $$('.btn-choice', group);
        this.hiddenInput = $(`#${this.fieldName}`);
        this.notesField = $(`#${this.fieldName}Notes`);
        
        if (!this.hiddenInput) {
            console.warn(`ButtonGroup: No hidden input found for field ${this.fieldName}`);
            return;
        }

        this.setupEventListeners();
        this.restoreState();
    }

    setupEventListeners() {
        this.buttons.forEach(button => {
            const cleanup = on(button, 'click', () => this.handleButtonClick(button));
            this.cleanupFunctions.push(cleanup);
        });

        // Setup notes textarea listeners if it exists
        if (this.notesField) {
            const textarea = this.notesField.querySelector('textarea');
            if (textarea) {
                const debouncedSave = debounce(() => {
                    if (this.onValueChange) {
                        this.onValueChange();
                    }
                }, 2000);
                
                const inputCleanup = on(textarea, 'input', debouncedSave);
                const changeCleanup = on(textarea, 'change', debouncedSave);
                this.cleanupFunctions.push(inputCleanup, changeCleanup);
            }
        }
    }

    handleButtonClick(clickedButton) {
        const value = clickedButton.getAttribute('data-value');
        
        // Update hidden input
        if (this.hiddenInput) {
            this.hiddenInput.value = value;
        }
        
        // Update button states
        this.buttons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
        
        // Show/hide notes field
        this.toggleNotesField(value === 'Notes');
        
        // Trigger callback
        if (this.onValueChange) {
            this.onValueChange();
        }
    }

    toggleNotesField(show) {
        if (!this.notesField) return;
        
        if (show) {
            this.notesField.style.display = 'block';
            const textarea = this.notesField.querySelector('textarea');
            if (textarea) {
                textarea.focus();
            }
        } else {
            this.notesField.style.display = 'none';
            const textarea = this.notesField.querySelector('textarea');
            if (textarea) {
                textarea.value = '';
            }
        }
    }

    restoreState() {
        if (!this.hiddenInput) return;
        
        const value = this.hiddenInput.value;
        if (!value) return;
        
        // Find and activate the button with matching value
        const button = this.buttons.find(btn => 
            btn.getAttribute('data-value') === value
        );
        
        if (button) {
            button.classList.add('active');
            this.toggleNotesField(value === 'Notes');
        }
    }

    getValue() {
        return this.hiddenInput ? this.hiddenInput.value : '';
    }

    setValue(value) {
        const button = this.buttons.find(btn => 
            btn.getAttribute('data-value') === value
        );
        
        if (button) {
            this.handleButtonClick(button);
        } else if (this.hiddenInput) {
            this.hiddenInput.value = value;
        }
    }

    destroy() {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
        this.buttons = [];
        this.hiddenInput = null;
        this.notesField = null;
    }
}

// Factory function to initialize all button groups in a container
export function initializeButtonGroups(container = document, onValueChange = null) {
    const groups = $$('.button-group', container);
    const buttonGroupInstances = [];
    
    groups.forEach(group => {
        const button = group.querySelector('.btn-choice');
        if (!button) return;
        
        const fieldName = button.getAttribute('data-field');
        if (!fieldName) return;
        
        // Find the parent form-group container
        let parent = group.parentElement;
        while (parent && !parent.classList.contains('form-group')) {
            parent = parent.parentElement;
        }
        
        if (parent) {
            const instance = new ButtonGroup(parent, fieldName, onValueChange);
            buttonGroupInstances.push(instance);
        }
    });
    
    return buttonGroupInstances;
}


