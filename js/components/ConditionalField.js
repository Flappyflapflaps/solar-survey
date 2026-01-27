// ConditionalField utility to manage conditional field visibility

import { $, on } from '../utils/dom.js';

export class ConditionalField {
    constructor(config) {
        this.triggerFieldId = config.triggerFieldId;
        this.targetFieldId = config.targetFieldId;
        this.showWhen = config.showWhen; // Function or value to check
        this.triggerField = null;
        this.targetField = null;
        this.cleanup = null;
        
        this.init();
    }

    init() {
        this.triggerField = $(`#${this.triggerFieldId}`);
        this.targetField = $(`#${this.targetFieldId}`);
        
        if (!this.triggerField || !this.targetField) {
            console.warn(`ConditionalField: Missing fields for ${this.triggerFieldId} -> ${this.targetFieldId}`);
            return;
        }

        // Setup change listener
        this.cleanup = on(this.triggerField, 'change', () => this.updateVisibility());
        
        // Initial visibility update
        this.updateVisibility();
    }

    updateVisibility() {
        if (!this.triggerField || !this.targetField) return;
        
        const triggerValue = this.triggerField.value;
        let shouldShow = false;
        
        if (typeof this.showWhen === 'function') {
            shouldShow = this.showWhen(triggerValue);
        } else if (Array.isArray(this.showWhen)) {
            shouldShow = this.showWhen.includes(triggerValue);
        } else {
            shouldShow = triggerValue === this.showWhen;
        }
        
        this.targetField.style.display = shouldShow ? 'block' : 'none';
    }

    destroy() {
        if (this.cleanup) {
            this.cleanup();
            this.cleanup = null;
        }
        this.triggerField = null;
        this.targetField = null;
    }
}

// Configuration for all conditional fields
export const conditionalFieldConfigs = [
    {
        triggerFieldId: 'terrain',
        targetFieldId: 'terrainSpecGroup',
        showWhen: (value) => value !== '' && value !== null
    },
    {
        triggerFieldId: 'parkingAvailable',
        targetFieldId: 'parkingSpecGroup',
        showWhen: 'N'
    },
    {
        triggerFieldId: 'construction',
        targetFieldId: 'constructionSpecGroup',
        showWhen: 'Other'
    },
    {
        triggerFieldId: 'buildingType',
        targetFieldId: 'buildingTypeSpecGroup',
        showWhen: 'Other'
    },
    {
        triggerFieldId: 'nests',
        targetFieldId: 'nestSpecGroup',
        showWhen: 'Y'
    },
    {
        triggerFieldId: 'floorCoverings',
        targetFieldId: 'floorCoveringsSpecGroup',
        showWhen: 'Other'
    },
    {
        triggerFieldId: 'waterHeating',
        targetFieldId: 'waterHeatingSpecGroup',
        showWhen: 'Other'
    },
    {
        triggerFieldId: 'dno',
        targetFieldId: 'dnoSpecGroup',
        showWhen: 'Other'
    }
];

// Initialize all conditional fields
export function initializeConditionalFields() {
    return conditionalFieldConfigs.map(config => {
        return new ConditionalField(config);
    });
}


