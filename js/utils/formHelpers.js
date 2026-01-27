// Form helper utilities

export function collectFormData(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return data;
}

export function populateForm(formElement, data) {
    Object.keys(data).forEach(key => {
        const field = formElement.querySelector(`[name="${key}"]`);
        if (field) {
            field.value = data[key] || '';
            
            // Trigger change event for select elements
            if (field.tagName === 'SELECT') {
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });
}

export function clearForm(formElement) {
    formElement.reset();
    // Clear all file inputs
    formElement.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = '';
    });
}

export function getFieldValue(formElement, fieldName) {
    const field = formElement.querySelector(`[name="${fieldName}"]`);
    return field ? field.value : '';
}

export function setFieldValue(formElement, fieldName, value) {
    const field = formElement.querySelector(`[name="${fieldName}"]`);
    if (field) {
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }
}


