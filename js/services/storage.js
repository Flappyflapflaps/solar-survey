// Storage service abstraction for localStorage operations with error handling

import { formDataModel } from '../models/formData.js';

class StorageService {
    constructor() {
        this.storageKey = 'solarSurveyData';
        this.roofCountKey = 'solarSurveyRoofCount';
    }

    // Save form data
    save(data, roofAspectCount) {
        try {
            const serialized = formDataModel.serialize(data);
            localStorage.setItem(this.storageKey, serialized);
            localStorage.setItem(this.roofCountKey, String(roofAspectCount || 0));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded. Clearing old data...');
                this.clear();
                // Try once more
                try {
                    const serialized = formDataModel.serialize(data);
                    localStorage.setItem(this.storageKey, serialized);
                    localStorage.setItem(this.roofCountKey, String(roofAspectCount || 0));
                    return true;
                } catch (retryError) {
                    console.error('Error saving after clear:', retryError);
                    return false;
                }
            }
            return false;
        }
    }

    // Load form data
    load() {
        try {
            const dataString = localStorage.getItem(this.storageKey);
            const roofCountString = localStorage.getItem(this.roofCountKey);
            
            if (!dataString) {
                return { data: {}, roofAspectCount: 0 };
            }
            
            const data = formDataModel.deserialize(dataString);
            const roofAspectCount = roofCountString ? parseInt(roofCountString, 10) : 0;
            
            return { data, roofAspectCount: isNaN(roofAspectCount) ? 0 : roofAspectCount };
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return { data: {}, roofAspectCount: 0 };
        }
    }

    // Clear all stored data
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.roofCountKey);
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    // Check if data exists
    hasData() {
        try {
            return localStorage.getItem(this.storageKey) !== null;
        } catch (error) {
            console.error('Error checking localStorage:', error);
            return false;
        }
    }

    // Get storage size (approximate)
    getStorageSize() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            return total;
        } catch (error) {
            console.error('Error calculating storage size:', error);
            return 0;
        }
    }

    // Check if storage is available
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
const storageService = new StorageService();
export { storageService };

