// Field Factory - Creates field instances by type (V3)
import { TextField } from './fields/TextField.js';
import { NumberField } from './fields/NumberField.js';
import { SelectField } from './fields/SelectField.js';
import { TextareaField } from './fields/TextareaField.js';
import { PhotoField } from './fields/PhotoField.js';
import { SignatureField } from './fields/SignatureField.js';
// V3 New Field Types
import { DateField } from './fields/DateField.js';
import { TimeField } from './fields/TimeField.js';
import { CheckboxGroupField } from './fields/CheckboxGroupField.js';
import { RadioField } from './fields/RadioField.js';
import { ToggleField } from './fields/ToggleField.js';
import { SectionField } from './fields/SectionField.js';
import { InfoField } from './fields/InfoField.js';

// Field type registry
const fieldTypes = {
    text: {
        class: TextField,
        label: 'Text',
        icon: 'T',
        category: 'basic',
        defaultConfig: {
            placeholder: 'Enter text...',
            maxLength: null
        }
    },
    number: {
        class: NumberField,
        label: 'Number',
        icon: '#',
        category: 'basic',
        defaultConfig: {
            placeholder: 'Enter number...',
            min: null,
            max: null,
            step: null
        }
    },
    select: {
        class: SelectField,
        label: 'Dropdown',
        icon: '▼',
        category: 'basic',
        defaultConfig: {
            placeholder: 'Select an option...',
            options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
            ]
        }
    },
    textarea: {
        class: TextareaField,
        label: 'Text Area',
        icon: '¶',
        category: 'basic',
        defaultConfig: {
            placeholder: 'Enter text...',
            rows: 4,
            maxLength: null
        }
    },
    // V3 New Types
    date: {
        class: DateField,
        label: 'Date',
        icon: '📅',
        category: 'basic',
        defaultConfig: {
            min: null,
            max: null
        }
    },
    time: {
        class: TimeField,
        label: 'Time',
        icon: '🕐',
        category: 'basic',
        defaultConfig: {
            min: null,
            max: null,
            step: null
        }
    },
    checkbox: {
        class: CheckboxGroupField,
        label: 'Checkboxes',
        icon: '☑',
        category: 'choice',
        defaultConfig: {
            options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
            ],
            minSelect: null,
            maxSelect: null
        }
    },
    radio: {
        class: RadioField,
        label: 'Radio',
        icon: '◉',
        category: 'choice',
        defaultConfig: {
            options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
            ]
        }
    },
    toggle: {
        class: ToggleField,
        label: 'Yes/No',
        icon: '⚡',
        category: 'choice',
        defaultConfig: {
            yesLabel: 'Yes',
            noLabel: 'No'
        }
    },
    // Media types
    photo: {
        class: PhotoField,
        label: 'Photo',
        icon: '📷',
        category: 'media',
        defaultConfig: {
            multiple: true,
            maxFiles: 5
        }
    },
    signature: {
        class: SignatureField,
        label: 'Signature',
        icon: '✍',
        category: 'media',
        defaultConfig: {
            width: 300,
            height: 150
        }
    },
    // Layout types
    section: {
        class: SectionField,
        label: 'Section',
        icon: '═',
        category: 'layout',
        defaultConfig: {
            description: ''
        }
    },
    info: {
        class: InfoField,
        label: 'Info',
        icon: 'ℹ',
        category: 'layout',
        defaultConfig: {
            content: 'Add helpful information here...',
            style: 'info', // info, warning, success, error, tip
            allowHtml: false
        }
    }
};

// Create a field instance from config
export function createField(config, onValueChange = null) {
    const typeInfo = fieldTypes[config.type];

    if (!typeInfo) {
        console.error(`Unknown field type: ${config.type}`);
        return null;
    }

    const FieldClass = typeInfo.class;
    return new FieldClass(config, onValueChange);
}

// Get list of available field types
export function getFieldTypes() {
    return Object.keys(fieldTypes).map(type => ({
        type,
        label: fieldTypes[type].label,
        icon: fieldTypes[type].icon,
        category: fieldTypes[type].category
    }));
}

// Get field types grouped by category (V3)
export function getFieldTypesByCategory() {
    const categories = {
        basic: { label: 'Basic', types: [] },
        choice: { label: 'Choice', types: [] },
        media: { label: 'Media', types: [] },
        layout: { label: 'Layout', types: [] }
    };

    Object.keys(fieldTypes).forEach(type => {
        const info = fieldTypes[type];
        const category = info.category || 'basic';
        if (categories[category]) {
            categories[category].types.push({
                type,
                label: info.label,
                icon: info.icon
            });
        }
    });

    return categories;
}

// Get default config for a field type
export function getDefaultFieldConfig(type, order = 0) {
    const typeInfo = fieldTypes[type];
    if (!typeInfo) return null;

    const id = `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const name = `field_${id}`;

    return {
        id,
        type,
        name,
        label: `New ${typeInfo.label}`,
        required: false,
        order,
        ...typeInfo.defaultConfig
    };
}

// V3: Generate field name from label (snake_case)
export function generateFieldName(label) {
    if (!label) return '';
    return label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
        .replace(/\s+/g, '_')          // Replace spaces with underscores
        .replace(/_+/g, '_')           // Remove duplicate underscores
        .replace(/^_|_$/g, '');        // Trim leading/trailing underscores
}

// Validate field config
export function validateFieldConfig(config) {
    const errors = [];

    if (!config.type) {
        errors.push('Field type is required');
    } else if (!fieldTypes[config.type]) {
        errors.push(`Unknown field type: ${config.type}`);
    }

    // Layout fields don't need name validation
    if (!['section', 'info'].includes(config.type)) {
        if (!config.name || config.name.trim() === '') {
            errors.push('Field name is required');
        }
    }

    if (!config.label || config.label.trim() === '') {
        errors.push('Field label is required');
    }

    // Type-specific validation
    if (config.type === 'select' || config.type === 'checkbox' || config.type === 'radio') {
        if (!config.options || !Array.isArray(config.options) || config.options.length === 0) {
            errors.push('Field must have at least one option');
        }
    }

    if (config.type === 'number') {
        if (config.min !== null && config.max !== null && config.min > config.max) {
            errors.push('Minimum value cannot be greater than maximum value');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export { fieldTypes };
