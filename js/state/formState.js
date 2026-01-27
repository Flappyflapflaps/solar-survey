// Centralized State Management for Solar Survey Form

class FormState {
    constructor() {
        this.state = {
            roofAspectCount: 0,
            fileData: {
                floorplan: null,
                roofPlan: null,
                additionalPhotos: []
            },
            formData: {},
            isDirty: false
        };
        this.listeners = [];
    }

    // Get state value
    get(key) {
        return this.state[key];
    }

    // Set state value and notify listeners
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.state.isDirty = true;
        this.notifyListeners(key, value, oldValue);
    }

    // Update multiple state values at once
    update(updates) {
        Object.keys(updates).forEach(key => {
            const oldValue = this.state[key];
            this.state[key] = updates[key];
            this.notifyListeners(key, updates[key], oldValue);
        });
        this.state.isDirty = true;
    }

    // Get entire state
    getAll() {
        return { ...this.state };
    }

    // Reset state
    reset() {
        this.state = {
            roofAspectCount: 0,
            fileData: {
                floorplan: null,
                roofPlan: null,
                additionalPhotos: []
            },
            formData: {},
            isDirty: false
        };
        this.notifyListeners('reset', null, null);
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // Notify all listeners of state change
    notifyListeners(key, newValue, oldValue) {
        this.listeners.forEach(listener => {
            try {
                listener(key, newValue, oldValue, this.state);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    // Increment roof aspect count
    incrementRoofAspectCount() {
        this.set('roofAspectCount', this.state.roofAspectCount + 1);
        return this.state.roofAspectCount;
    }

    // Decrement roof aspect count
    decrementRoofAspectCount() {
        if (this.state.roofAspectCount > 0) {
            this.set('roofAspectCount', this.state.roofAspectCount - 1);
        }
        return this.state.roofAspectCount;
    }

    // Set file data
    setFileData(key, file) {
        const fileData = { ...this.state.fileData };
        fileData[key] = file;
        this.set('fileData', fileData);
    }

    // Remove file data
    removeFileData(key) {
        const fileData = { ...this.state.fileData };
        if (Array.isArray(fileData[key])) {
            fileData[key] = [];
        } else {
            fileData[key] = null;
        }
        this.set('fileData', fileData);
    }

    // Remove file from array
    removeFileFromArray(key, index) {
        const fileData = { ...this.state.fileData };
        if (Array.isArray(fileData[key])) {
            fileData[key] = fileData[key].filter((_, i) => i !== index);
            this.set('fileData', fileData);
        }
    }

    // Set form data
    setFormData(data) {
        this.set('formData', { ...data });
    }

    // Mark as clean (saved)
    markClean() {
        this.state.isDirty = false;
    }
}

// Export singleton instance
const formState = new FormState();
export { formState };

