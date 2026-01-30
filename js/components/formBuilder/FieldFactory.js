// Field Factory - Creates field instances by type
import { TextField } from './fields/TextField.js';
import { NumberField } from './fields/NumberField.js';
import { SelectField } from './fields/SelectField.js';
import { TextareaField } from './fields/TextareaField.js';
import { PhotoField } from './fields/PhotoField.js';
import { SignatureField } from './fields/SignatureField.js';

// Field type registry
const fieldTypes = {
    text: {
        class: TextField,
        label: 'Text',
        icon: 'T',
        defaultConfig: {
            placeholder: 'Enter text...',
            maxLength: null
        }
    },
    number: {
        class: NumberField,
        label: 'Number',
        icon: '#',
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
        defaultConfig: {
            placeholder: 'Enter text...',
            rows: 4,
            maxLength: null
        }
    },
    photo: {
        class: PhotoField,
        label: 'Photo',
        icon: '📷',
        defaultConfig: {
            multiple: true,
            maxFiles: 5
        }
    },
    signature: {
        class: SignatureField,
        label: 'Signature',
        icon: '✍',
        defaultConfig: {
            width: 300,
            height: 150
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
        icon: fieldTypes[type].icon
    }));
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

// Validate field config
export function validateFieldConfig(config) {
    const errors = [];

    if (!config.type) {
        errors.push('Field type is required');
    } else if (!fieldTypes[config.type]) {
        errors.push(`Unknown field type: ${config.type}`);
    }

    if (!config.name || config.name.trim() === '') {
        errors.push('Field name is required');
    }

    if (!config.label || config.label.trim() === '') {
        errors.push('Field label is required');
    }

    // Type-specific validation
    if (config.type === 'select') {
        if (!config.options || !Array.isArray(config.options) || config.options.length === 0) {
            errors.push('Select field must have at least one option');
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
