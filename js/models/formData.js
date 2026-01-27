// Form Data Model with Schema and Validation

class FormDataModel {
    constructor() {
        this.schema = this.defineSchema();
    }

    defineSchema() {
        return {
            // Surveyor Information
            carriedOutBy: { type: 'string', required: false },
            customerName: { type: 'string', required: false },
            address: { type: 'string', required: false },
            mobile: { type: 'string', required: false },
            postCode: { type: 'string', required: false },
            home: { type: 'string', required: false },
            what3words: { type: 'string', required: false },
            email: { type: 'string', required: false, validate: 'email' },
            
            // Property Details
            conservationArea: { type: 'string', required: false },
            conservationAreaNotes: { type: 'string', required: false },
            terrain: { type: 'string', required: false },
            terrainSpec: { type: 'string', required: false },
            propertyExposed: { type: 'string', required: false },
            propertyExposedNotes: { type: 'string', required: false },
            parkingAvailable: { type: 'string', required: false },
            parkingAvailableNotes: { type: 'string', required: false },
            parkingSpec: { type: 'string', required: false },
            occupancyType: { type: 'string', required: false },
            kwhPerAnnum: { type: 'number', required: false },
            dno: { type: 'string', required: false },
            dnoSpec: { type: 'string', required: false },
            
            // Building Details
            construction: { type: 'string', required: false },
            constructionSpec: { type: 'string', required: false },
            wallThickness: { type: 'string', required: false },
            internalWalk: { type: 'string', required: false },
            buildingType: { type: 'string', required: false },
            buildingTypeSpec: { type: 'string', required: false },
            protectedSpecies: { type: 'string', required: false },
            protectedSpeciesNotes: { type: 'string', required: false },
            nests: { type: 'string', required: false },
            nestsNotes: { type: 'string', required: false },
            nestSpec: { type: 'string', required: false },
            
            // Electrical
            fuseboardLocation: { type: 'string', required: false },
            meterLocation: { type: 'string', required: false },
            electricalCondition: { type: 'string', required: false },
            phases: { type: 'number', required: false },
            mainFuseSize: { type: 'string', required: false },
            earthingSystem: { type: 'string', required: false },
            maximumDemand: { type: 'string', required: false },
            loopedSupply: { type: 'string', required: false },
            loopedSupplyNotes: { type: 'string', required: false },
            loopImpedance: { type: 'string', required: false },
            spaceForCU: { type: 'string', required: false },
            spaceForCUNotes: { type: 'string', required: false },
            underfloorAccess: { type: 'string', required: false },
            underfloorAccessNotes: { type: 'string', required: false },
            cableRoute: { type: 'string', required: false },
            floorCoverings: { type: 'string', required: false },
            floorCoveringsSpec: { type: 'string', required: false },
            
            // Inverter & System
            inverterLocation: { type: 'string', required: false },
            inverterInteriorExterior: { type: 'string', required: false },
            wifiAvailable: { type: 'string', required: false },
            wifiAvailableNotes: { type: 'string', required: false },
            mountingSurface: { type: 'string', required: false },
            loftFloored: { type: 'string', required: false },
            loftFlooredNotes: { type: 'string', required: false },
            loftLight: { type: 'string', required: false },
            loftLightNotes: { type: 'string', required: false },
            loftLadder: { type: 'string', required: false },
            loftLadderNotes: { type: 'string', required: false },
            waterHeating: { type: 'string', required: false },
            waterHeatingSpec: { type: 'string', required: false },
            smokeAlarms: { type: 'string', required: false },
            smokeAlarmsNotes: { type: 'string', required: false },
            smokeAlarmBrand: { type: 'string', required: false },
            smokeAlarmType: { type: 'string', required: false },
            smokeAlarmHardwired: { type: 'string', required: false },
            
            // Notes & Photos
            notes: { type: 'string', required: false }
        };
    }

    // Collect all form data including roof aspects
    collectFormData(formElement, roofAspectCount) {
        const formData = new FormData(formElement);
        const data = {};
        
        // Collect standard form fields
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Collect roof aspect data
        for (let i = 1; i <= roofAspectCount; i++) {
            const aspect = document.getElementById(`roofAspect${i}`);
            if (aspect) {
                const aspectInputs = aspect.querySelectorAll('input, select, textarea');
                aspectInputs.forEach(input => {
                    if (input.name && input.value) {
                        data[input.name] = input.value;
                    }
                });
            }
        }
        
        return this.normalizeData(data);
    }

    // Normalize data types
    normalizeData(data) {
        const normalized = { ...data };
        
        Object.keys(normalized).forEach(key => {
            const fieldSchema = this.schema[key];
            if (fieldSchema) {
                if (fieldSchema.type === 'number') {
                    const num = parseFloat(normalized[key]);
                    normalized[key] = isNaN(num) ? '' : num;
                } else if (fieldSchema.type === 'string') {
                    normalized[key] = String(normalized[key] || '').trim();
                }
            } else if (key.startsWith('roof') && key.includes('_')) {
                // Handle roof aspect fields
                normalized[key] = String(normalized[key] || '').trim();
            }
        });
        
        return normalized;
    }

    // Validate form data
    validate(data) {
        const errors = [];
        
        Object.keys(this.schema).forEach(key => {
            const field = this.schema[key];
            const value = data[key];
            
            if (field.required && (!value || value.trim() === '')) {
                errors.push(`${key} is required`);
            }
            
            if (value && field.validate === 'email' && !this.isValidEmail(value)) {
                errors.push(`${key} must be a valid email address`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Serialize data for storage
    serialize(data) {
        return JSON.stringify(data);
    }

    // Deserialize data from storage
    deserialize(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error deserializing form data:', error);
            return {};
        }
    }

    // Get roof aspect data
    getRoofAspectData(data, index) {
        const prefix = `roof${index}_`;
        const aspectData = {};
        
        Object.keys(data).forEach(key => {
            if (key.startsWith(prefix)) {
                const fieldName = key.replace(prefix, '');
                aspectData[fieldName] = data[key];
            }
        });
        
        return aspectData;
    }

    // Get all roof aspects data
    getAllRoofAspectsData(data, roofAspectCount) {
        const aspects = [];
        for (let i = 1; i <= roofAspectCount; i++) {
            aspects.push(this.getRoofAspectData(data, i));
        }
        return aspects;
    }
}

// Export singleton instance
const formDataModel = new FormDataModel();
export { formDataModel };

