// Form Template Storage Service
// Handles localStorage for custom form templates and filled form data

class FormTemplateStorage {
    constructor() {
        this.templatesIndexKey = 'solarSurveyFormTemplates';
        this.templateDataKeyPrefix = 'solarSurveyFormTemplate_';
        this.formDataIndexKey = 'solarSurveyCustomFormDataIndex';
        this.formDataKeyPrefix = 'solarSurveyCustomFormData_';
    }

    // Check if localStorage is available
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Generate unique ID
    generateId(prefix = 'template') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}_${timestamp}_${random}`;
    }

    // ==================== TEMPLATE METHODS ====================

    // List all saved templates (metadata only)
    listTemplates() {
        try {
            const indexJson = localStorage.getItem(this.templatesIndexKey);
            if (!indexJson) return [];

            const templates = JSON.parse(indexJson);
            return templates.sort((a, b) => b.updatedAt - a.updatedAt);
        } catch (error) {
            console.error('Error listing templates:', error);
            return [];
        }
    }

    // Save a template
    saveTemplate(template) {
        try {
            const now = Date.now();
            const isNew = !template.id;

            if (isNew) {
                template.id = this.generateId('template');
                template.createdAt = now;
            }
            template.updatedAt = now;
            template.version = (template.version || 0) + 1;

            // Save template data
            const templateKey = this.templateDataKeyPrefix + template.id;
            localStorage.setItem(templateKey, JSON.stringify(template));

            // Update index
            const templates = this.listTemplates();
            const existingIndex = templates.findIndex(t => t.id === template.id);

            const metadata = {
                id: template.id,
                name: template.name,
                description: template.description || '',
                fieldCount: template.fields ? template.fields.length : 0,
                createdAt: template.createdAt,
                updatedAt: template.updatedAt
            };

            if (existingIndex >= 0) {
                templates[existingIndex] = metadata;
            } else {
                templates.push(metadata);
            }

            localStorage.setItem(this.templatesIndexKey, JSON.stringify(templates));

            return { success: true, template };
        } catch (error) {
            console.error('Error saving template:', error);
            if (error.name === 'QuotaExceededError') {
                return { success: false, error: 'Storage quota exceeded' };
            }
            return { success: false, error: error.message };
        }
    }

    // Load a template by ID
    loadTemplate(id) {
        try {
            const templateKey = this.templateDataKeyPrefix + id;
            const templateJson = localStorage.getItem(templateKey);

            if (!templateJson) {
                return { success: false, error: 'Template not found' };
            }

            const template = JSON.parse(templateJson);
            return { success: true, template };
        } catch (error) {
            console.error('Error loading template:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete a template
    deleteTemplate(id) {
        try {
            // Remove template data
            const templateKey = this.templateDataKeyPrefix + id;
            localStorage.removeItem(templateKey);

            // Update index
            const templates = this.listTemplates();
            const filtered = templates.filter(t => t.id !== id);
            localStorage.setItem(this.templatesIndexKey, JSON.stringify(filtered));

            // Also delete any form data associated with this template
            this.deleteFormDataByTemplate(id);

            return { success: true };
        } catch (error) {
            console.error('Error deleting template:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== FORM DATA METHODS ====================

    // List all saved form data (optionally filter by template)
    listFormData(templateId = null) {
        try {
            const indexJson = localStorage.getItem(this.formDataIndexKey);
            if (!indexJson) return [];

            let formDataList = JSON.parse(indexJson);

            if (templateId) {
                formDataList = formDataList.filter(fd => fd.templateId === templateId);
            }

            return formDataList.sort((a, b) => b.updatedAt - a.updatedAt);
        } catch (error) {
            console.error('Error listing form data:', error);
            return [];
        }
    }

    // Save filled form data
    saveFormData(templateId, data, name = '') {
        try {
            const now = Date.now();
            const id = this.generateId('formdata');

            const formData = {
                id,
                templateId,
                name: name || `Form ${new Date(now).toLocaleString()}`,
                data,
                createdAt: now,
                updatedAt: now
            };

            // Save form data
            const dataKey = this.formDataKeyPrefix + id;
            localStorage.setItem(dataKey, JSON.stringify(formData));

            // Update index
            const formDataList = this.listFormData();
            const metadata = {
                id,
                templateId,
                name: formData.name,
                createdAt: now,
                updatedAt: now
            };
            formDataList.push(metadata);
            localStorage.setItem(this.formDataIndexKey, JSON.stringify(formDataList));

            return { success: true, formData };
        } catch (error) {
            console.error('Error saving form data:', error);
            if (error.name === 'QuotaExceededError') {
                return { success: false, error: 'Storage quota exceeded' };
            }
            return { success: false, error: error.message };
        }
    }

    // Update existing form data
    updateFormData(id, data, name = null) {
        try {
            const dataKey = this.formDataKeyPrefix + id;
            const existingJson = localStorage.getItem(dataKey);

            if (!existingJson) {
                return { success: false, error: 'Form data not found' };
            }

            const formData = JSON.parse(existingJson);
            formData.data = data;
            formData.updatedAt = Date.now();
            if (name !== null) {
                formData.name = name;
            }

            localStorage.setItem(dataKey, JSON.stringify(formData));

            // Update index
            const formDataList = this.listFormData();
            const index = formDataList.findIndex(fd => fd.id === id);
            if (index >= 0) {
                formDataList[index].updatedAt = formData.updatedAt;
                if (name !== null) {
                    formDataList[index].name = name;
                }
                localStorage.setItem(this.formDataIndexKey, JSON.stringify(formDataList));
            }

            return { success: true, formData };
        } catch (error) {
            console.error('Error updating form data:', error);
            return { success: false, error: error.message };
        }
    }

    // Load form data by ID
    loadFormData(id) {
        try {
            const dataKey = this.formDataKeyPrefix + id;
            const dataJson = localStorage.getItem(dataKey);

            if (!dataJson) {
                return { success: false, error: 'Form data not found' };
            }

            const formData = JSON.parse(dataJson);
            return { success: true, formData };
        } catch (error) {
            console.error('Error loading form data:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete form data by ID
    deleteFormData(id) {
        try {
            const dataKey = this.formDataKeyPrefix + id;
            localStorage.removeItem(dataKey);

            // Update index
            const formDataList = this.listFormData();
            const filtered = formDataList.filter(fd => fd.id !== id);
            localStorage.setItem(this.formDataIndexKey, JSON.stringify(filtered));

            return { success: true };
        } catch (error) {
            console.error('Error deleting form data:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete all form data for a template
    deleteFormDataByTemplate(templateId) {
        try {
            const formDataList = this.listFormData(templateId);

            formDataList.forEach(fd => {
                const dataKey = this.formDataKeyPrefix + fd.id;
                localStorage.removeItem(dataKey);
            });

            // Update index
            const allFormData = this.listFormData();
            const filtered = allFormData.filter(fd => fd.templateId !== templateId);
            localStorage.setItem(this.formDataIndexKey, JSON.stringify(filtered));

            return { success: true };
        } catch (error) {
            console.error('Error deleting form data by template:', error);
            return { success: false, error: error.message };
        }
    }
}

const formTemplateStorage = new FormTemplateStorage();
export { formTemplateStorage };
