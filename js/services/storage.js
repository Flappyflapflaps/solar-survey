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

    // ==================== DRAFT MANAGEMENT ====================

    // Key for storing draft metadata index
    get draftsIndexKey() {
        return 'solarSurveyDrafts';
    }

    // Generate unique draft ID
    _generateDraftId() {
        return 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get draft storage key
    _getDraftKey(id) {
        return `solarSurveyDraft_${id}`;
    }

    // List all saved drafts
    listDrafts() {
        try {
            const indexString = localStorage.getItem(this.draftsIndexKey);
            if (!indexString) {
                return [];
            }
            const drafts = JSON.parse(indexString);
            // Sort by timestamp descending (newest first)
            return drafts.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error listing drafts:', error);
            return [];
        }
    }

    // Save current form data as a named draft
    saveDraft(data, roofAspectCount, name = '') {
        try {
            const id = this._generateDraftId();
            const timestamp = Date.now();

            // Auto-generate name from customer/address if not provided
            const customerName = data.customerName || '';
            const address = data.address || '';
            const autoName = name ||
                (customerName && address ? `${customerName} - ${address}` :
                 customerName || address || 'Untitled Survey');

            // Create draft metadata
            const draftMeta = {
                id,
                name: autoName,
                timestamp,
                customerName,
                address,
                postCode: data.postCode || ''
            };

            // Save the draft data
            const draftData = {
                data: formDataModel.serialize(data),
                roofAspectCount: roofAspectCount || 0
            };
            localStorage.setItem(this._getDraftKey(id), JSON.stringify(draftData));

            // Update drafts index
            const drafts = this.listDrafts();
            drafts.push(draftMeta);
            localStorage.setItem(this.draftsIndexKey, JSON.stringify(drafts));

            return { success: true, draft: draftMeta };
        } catch (error) {
            console.error('Error saving draft:', error);
            if (error.name === 'QuotaExceededError') {
                return { success: false, error: 'Storage full. Please delete some old drafts.' };
            }
            return { success: false, error: error.message };
        }
    }

    // Load a specific draft by ID
    loadDraft(id) {
        try {
            const draftString = localStorage.getItem(this._getDraftKey(id));
            if (!draftString) {
                return { success: false, error: 'Draft not found' };
            }

            const draftData = JSON.parse(draftString);
            const data = formDataModel.deserialize(draftData.data);
            const roofAspectCount = draftData.roofAspectCount || 0;

            return {
                success: true,
                data,
                roofAspectCount: isNaN(roofAspectCount) ? 0 : roofAspectCount
            };
        } catch (error) {
            console.error('Error loading draft:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete a draft by ID
    deleteDraft(id) {
        try {
            // Remove draft data
            localStorage.removeItem(this._getDraftKey(id));

            // Update drafts index
            const drafts = this.listDrafts();
            const filtered = drafts.filter(d => d.id !== id);
            localStorage.setItem(this.draftsIndexKey, JSON.stringify(filtered));

            return { success: true };
        } catch (error) {
            console.error('Error deleting draft:', error);
            return { success: false, error: error.message };
        }
    }

    // Rename a draft
    renameDraft(id, newName) {
        try {
            const drafts = this.listDrafts();
            const draft = drafts.find(d => d.id === id);
            if (!draft) {
                return { success: false, error: 'Draft not found' };
            }

            draft.name = newName;
            localStorage.setItem(this.draftsIndexKey, JSON.stringify(drafts));

            return { success: true };
        } catch (error) {
            console.error('Error renaming draft:', error);
            return { success: false, error: error.message };
        }
    }

    // Get draft count
    getDraftCount() {
        return this.listDrafts().length;
    }
}

// Export singleton instance
const storageService = new StorageService();
export { storageService };

