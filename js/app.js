// Main Application Entry Point - Orchestrates all modules

import { formState } from './state/formState.js';
import { formDataModel } from './models/formData.js';
import { storageService } from './services/storage.js';
import { navigationService } from './services/navigation.js';
import { excelExporter } from './services/export/excelExporter.js';
import { csvExporter } from './services/export/csvExporter.js';
import { pdfExporter } from './services/export/pdfExporter.js';
import { dropboxService } from './services/dropbox.js';
import { contractParser } from './services/contractParser.js';
import { getDnoFromPostcode } from './services/dnoLookup.js';
import { geocodingService } from './services/geocoding.js';
import { DropboxFolderPicker } from './components/DropboxFolderPicker.js';
import { JobSelector } from './components/JobSelector.js';
import { isDropboxConfigured, DROPBOX_CONFIG } from './config/dropbox.js';
import { JOB_CONFIG, getSurveyPath } from './config/jobConfig.js';
import { initializeButtonGroups } from './components/ButtonGroup.js';
import { initializeConditionalFields } from './components/ConditionalField.js';
import { RoofAspectManager } from './components/RoofAspect.js';
import { initializeFileUploads } from './components/FileUpload.js';
import { DraftsPicker } from './components/DraftsPicker.js';
import { $, on } from './utils/dom.js';
import { debounce } from './utils/debounce.js';
import { populateForm, clearForm as clearFormHelper } from './utils/formHelpers.js';
import { authService } from './services/auth.js';
import { FormBuilder } from './components/formBuilder/FormBuilder.js';
import { FormRenderer } from './components/formBuilder/FormRenderer.js';
import { TemplatePicker } from './components/formBuilder/TemplatePicker.js';
import { formTemplateStorage } from './services/formTemplateStorage.js';
import { formSwitcher } from './components/FormSwitcher.js';

class SolarSurveyApp {
    constructor() {
        this.form = null;
        this.roofAspectManager = null;
        this.conditionalFields = [];
        this.fileUploads = [];
        this.buttonGroups = [];
        this.saveIndicator = null;
        this.autoSaveDebounced = null;
        this.currentJob = null; // Currently selected job

        // Custom Forms
        this.formBuilder = null;
        this.formRenderer = null;
        this.currentCustomFormData = null;
    }

    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    async initialize() {
        this.form = $('#surveyForm');
        if (!this.form) {
            console.error('Form element not found');
            return;
        }

        this.saveIndicator = $('#saveIndicator');
        this.setupComponents();
        this.setupEventListeners();
        this.loadSavedData();
        this.updateProgress();

        // Load and display current user
        await this.initializeUser();

        // Handle Dropbox OAuth callback
        await this.handleDropboxCallback();

        // Initialize form switcher for ASHP form
        formSwitcher.init();
    }

    async initializeUser() {
        const user = await authService.getCurrentUser();
        if (user) {
            this.autoSelectSurveyor(user.displayName);
            this.showUserInHeader(user);
        }
    }

    autoSelectSurveyor(displayName) {
        const select = $('#carriedOutBy');
        if (!select || !displayName) return;

        // Find matching option
        const options = Array.from(select.options);
        const match = options.find(opt =>
            opt.value.toLowerCase() === displayName.toLowerCase()
        );

        // Only auto-select if surveyor field is empty
        if (match && !select.value) {
            select.value = match.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    showUserInHeader(user) {
        const headerBrand = document.querySelector('.header-brand');
        if (!headerBrand) return;

        // Create user info element
        const userInfo = document.createElement('div');
        userInfo.className = 'header-user';
        userInfo.innerHTML = `
            <span class="user-name">${user.displayName || user.username}</span>
            <button type="button" class="logout-btn" id="logoutBtn" title="Sign out">
                Sign Out
            </button>
        `;

        headerBrand.appendChild(userInfo);

        // Add logout handler
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to sign out?')) {
                authService.logout();
            }
        });
    }

    async handleDropboxCallback() {
        try {
            const wasCallback = await dropboxService.handleCallback();
            if (wasCallback) {
                // Successfully authenticated, show folder picker
                this.showDropboxFolderPicker();
            }
        } catch (error) {
            console.error('Dropbox callback error:', error);
            alert('Dropbox sign-in failed: ' + error.message);
        }
    }

    setupComponents() {
        // Initialize roof aspect manager
        this.roofAspectManager = new RoofAspectManager('roofAspectsContainer', () => {
            this.autoSave();
        });

        // Add first roof aspect
        this.roofAspectManager.add();
        formState.set('roofAspectCount', 1);

        // Initialize conditional fields
        this.conditionalFields = initializeConditionalFields();

        // Initialize file uploads
        this.fileUploads = initializeFileUploads(() => {
            this.autoSave();
        });

        // Initialize button groups
        this.buttonGroups = initializeButtonGroups(document, () => {
            this.autoSave();
        });

        // Initialize navigation
        navigationService.init();

        // Populate surveyor dropdown
        this.populateSurveyorDropdown();

        // Mark app as loaded (for file:// protocol detection)
        window.appLoaded = true;
    }

    // Populate the surveyor dropdown from config
    populateSurveyorDropdown() {
        const select = $('#carriedOutBy');
        if (!select) return;

        // Add surveyors from config
        JOB_CONFIG.SURVEYORS.forEach(surveyor => {
            const option = document.createElement('option');
            option.value = surveyor;
            option.textContent = surveyor;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Auto-save on input
        this.autoSaveDebounced = debounce(() => this.autoSave(), 2000);
        on(this.form, 'input', this.autoSaveDebounced);
        on(this.form, 'change', this.autoSaveDebounced);

        // Export buttons
        const exportBtn = $('#exportBtn');
        const exportPdfBtn = $('#exportPdfBtn');
        const exportCsvBtn = $('#exportCsvBtn');
        const clearBtn = $('#clearBtn');
        const addRoofAspectBtn = $('#addRoofAspect');

        if (exportBtn) {
            on(exportBtn, 'click', () => this.exportToExcel());
        }
        if (exportPdfBtn) {
            on(exportPdfBtn, 'click', () => this.exportToPDF());
        }
        if (exportCsvBtn) {
            on(exportCsvBtn, 'click', () => this.exportToCSV());
        }
        if (clearBtn) {
            on(clearBtn, 'click', () => this.clearForm());
        }
        if (addRoofAspectBtn) {
            on(addRoofAspectBtn, 'click', () => {
                this.roofAspectManager.add();
                formState.incrementRoofAspectCount();
                this.autoSave();
            });
        }

        // Dropbox button
        const dropboxBtn = $('#dropboxBtn');
        if (dropboxBtn) {
            on(dropboxBtn, 'click', () => this.handleDropboxClick());
        }

        // Draft buttons
        const saveDraftBtn = $('#saveDraftBtn');
        const loadDraftBtn = $('#loadDraftBtn');
        if (saveDraftBtn) {
            on(saveDraftBtn, 'click', () => this.saveDraft());
        }
        if (loadDraftBtn) {
            on(loadDraftBtn, 'click', () => this.showDraftsPicker());
        }

        // Job selection buttons
        const selectJobBtn = $('#selectJobBtn');
        const clearJobBtn = $('#clearJobBtn');

        if (selectJobBtn) {
            on(selectJobBtn, 'click', () => this.showJobSelector());
        }
        if (clearJobBtn) {
            on(clearJobBtn, 'click', () => this.clearCurrentJob());
        }

        // Update progress on form changes
        const updateProgressDebounced = debounce(() => this.updateProgress(), 500);
        on(this.form, 'input', updateProgressDebounced);
        on(this.form, 'change', updateProgressDebounced);

        // Mobile action menu toggle
        const actionMenuToggle = $('#actionMenuToggle');
        const actionButtonsWrapper = $('#actionButtonsWrapper');
        if (actionMenuToggle && actionButtonsWrapper) {
            on(actionMenuToggle, 'click', () => {
                actionMenuToggle.classList.toggle('active');
                actionButtonsWrapper.classList.toggle('active');
            });
        }

        // Custom Forms navigation
        const customFormsNav = $('#customFormsNav');
        if (customFormsNav) {
            on(customFormsNav, 'click', (e) => {
                e.preventDefault();
                this.showCustomForms();
            });
        }

        // Back to survey button
        const backToSurveyBtn = $('#backToSurveyBtn');
        if (backToSurveyBtn) {
            on(backToSurveyBtn, 'click', () => this.hideCustomForms());
        }

        // Create form button
        const createFormBtn = $('#createFormBtn');
        if (createFormBtn) {
            on(createFormBtn, 'click', () => this.showFormBuilder());
        }

        // Open form button
        const openFormBtn = $('#openFormBtn');
        if (openFormBtn) {
            on(openFormBtn, 'click', () => this.showTemplatePicker());
        }
    }

    autoSave() {
        try {
            const roofAspectCount = formState.get('roofAspectCount');
            const formData = formDataModel.collectFormData(this.form, roofAspectCount);
            
            // Save to state
            formState.setFormData(formData);
            
            // Save to localStorage
            storageService.save(formData, roofAspectCount);
            formState.markClean();
            
            // Show save indicator
            this.showSaveIndicator();
            
            // Update progress
            this.updateProgress();
        } catch (error) {
            console.error('Error in autoSave:', error);
        }
    }

    showSaveIndicator() {
        if (!this.saveIndicator) return;
        
        this.saveIndicator.classList.add('show');
        setTimeout(() => {
            this.saveIndicator.classList.remove('show');
        }, 2000);
    }

    updateProgress() {
        const roofAspectCount = formState.get('roofAspectCount');
        const { filled, total } = navigationService.calculateProgress(this.form, roofAspectCount);
        navigationService.updateProgress(filled, total);
    }

    loadSavedData() {
        try {
            const { data, roofAspectCount } = storageService.load();
            
            if (!data || Object.keys(data).length === 0) {
                return;
            }

            // Populate form fields
            populateForm(this.form, data);

            // Restore roof aspects
            if (roofAspectCount > 1) {
                for (let i = 2; i <= roofAspectCount; i++) {
                    this.roofAspectManager.add();
                }
                formState.set('roofAspectCount', roofAspectCount);
            }

            // Restore roof aspect data
            for (let i = 1; i <= roofAspectCount; i++) {
                const aspectData = formDataModel.getRoofAspectData(data, i);
                const aspect = this.roofAspectManager.getAspect(i);
                if (aspect) {
                    aspect.setData(aspectData);
                }
            }

            // Restore button group states
            Object.keys(data).forEach(key => {
                const field = this.form.querySelector(`[name="${key}"]`);
                if (field && field.type === 'hidden' && field.value) {
                    const button = this.form.querySelector(
                        `[data-field="${key}"][data-value="${field.value}"]`
                    );
                    if (button) {
                        button.classList.add('active');
                        
                        if (field.value === 'Notes') {
                            const notesField = $(`#${key}Notes`);
                            if (notesField) {
                                notesField.style.display = 'block';
                            }
                        }
                    }
                }
            });

            // Trigger conditional fields
            this.form.querySelectorAll('select').forEach(select => {
                if (select.value) {
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Update state
            formState.setFormData(data);
            formState.set('roofAspectCount', roofAspectCount);
            
            this.updateProgress();
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }

    exportToExcel() {
        try {
            const roofAspectCount = formState.get('roofAspectCount');
            const formData = formDataModel.collectFormData(this.form, roofAspectCount);
            excelExporter.export(formData, roofAspectCount);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Error exporting to Excel. Please try again.');
        }
    }

    exportToPDF() {
        try {
            const roofAspectCount = formState.get('roofAspectCount');
            const formData = formDataModel.collectFormData(this.form, roofAspectCount);
            pdfExporter.export(formData, roofAspectCount);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Error exporting to PDF. Please try again.');
        }
    }

    exportToCSV() {
        try {
            const roofAspectCount = formState.get('roofAspectCount');
            const formData = formDataModel.collectFormData(this.form, roofAspectCount);
            csvExporter.export(formData);
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            alert('Error exporting to CSV. Please try again.');
        }
    }

    clearForm() {
        if (!confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
            return;
        }

        try {
            // Clear form
            clearFormHelper(this.form);

            // Clear roof aspects except first
            const count = this.roofAspectManager.getCount();
            for (let i = count; i > 1; i--) {
                const aspect = this.roofAspectManager.getAspect(i);
                if (aspect) {
                    aspect.destroy();
                }
            }
            // Reset aspects array
            this.roofAspectManager.aspects = this.roofAspectManager.aspects.slice(0, 1);

            // Clear file uploads
            this.fileUploads.forEach(upload => upload.clear());

            // Clear state
            formState.reset();
            formState.set('roofAspectCount', 1);

            // Clear storage
            storageService.clear();

            // Reset first roof aspect
            const firstAspect = this.roofAspectManager.getAspect(1);
            if (firstAspect && firstAspect.element) {
                const inputs = firstAspect.element.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    if (input.type !== 'hidden') {
                        input.value = '';
                    }
                });
            }

            // Clear file previews
            const floorplanPreview = $('#floorplanPreview');
            const roofPlanPreview = $('#roofPlanPreview');
            const additionalPhotosPreview = $('#additionalPhotosPreview');
            if (floorplanPreview) floorplanPreview.innerHTML = '';
            if (roofPlanPreview) roofPlanPreview.innerHTML = '';
            if (additionalPhotosPreview) additionalPhotosPreview.innerHTML = '';

            this.updateProgress();
            this.showSaveIndicator();
        } catch (error) {
            console.error('Error clearing form:', error);
        }
    }

    // Job Selection Methods
    showJobSelector() {
        if (!isDropboxConfigured()) {
            alert('Dropbox is not configured.\n\nPlease add your Dropbox App Key in:\njs/config/dropbox.js');
            return;
        }

        const selector = new JobSelector(
            (contractData, job) => {
                this.applyJobData(contractData, job);
            },
            () => {
                // Cancelled - do nothing
            }
        );
        selector.show();
    }

    // Apply job data to the form
    async applyJobData(contractData, job) {
        this.currentJob = {
            ...job,
            contractData
        };

        // Update UI to show selected job
        const jobInfo = $('#jobInfo');
        const jobRefDisplay = $('#jobRefDisplay');
        const selectJobBtn = $('#selectJobBtn');
        const equipmentSummary = $('#equipmentSummary');
        const equipmentText = $('#equipmentText');
        const projectRefInput = $('#projectRef');

        if (jobInfo) jobInfo.style.display = 'flex';
        if (jobRefDisplay) jobRefDisplay.textContent = contractData.projectRef || job.name;
        if (selectJobBtn) selectJobBtn.style.display = 'none';
        if (projectRefInput) projectRefInput.value = contractData.projectRef || job.name;

        // Show equipment summary
        if (equipmentSummary && contractData.equipment) {
            const summary = contractParser.formatEquipmentSummary(contractData.equipment);
            if (summary) {
                equipmentSummary.style.display = 'block';
                if (equipmentText) equipmentText.textContent = summary;
            }
        }

        // Auto-fill form fields
        if (contractData.customerName) {
            const field = $('#customerName');
            if (field) field.value = contractData.customerName;
        }
        if (contractData.address) {
            const field = $('#address');
            if (field) field.value = contractData.address;
        }
        if (contractData.postCode) {
            const field = $('#postCode');
            if (field) field.value = contractData.postCode;
        }

        // Auto-select DNO based on postcode
        if (contractData.postCode) {
            const dno = getDnoFromPostcode(contractData.postCode);
            if (dno) {
                const dnoField = $('#dno');
                if (dnoField) {
                    dnoField.value = dno;
                    // Trigger change event for conditional fields
                    dnoField.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }

        // Geocode address to get coords and What3Words
        if (contractData.address || contractData.postCode) {
            this.geocodeJobAddress(contractData.address, contractData.postCode);
        }

        // Trigger auto-save
        this.autoSave();

        // Show success message
        this.showJobLoadedMessage(contractData.projectRef || job.name);
    }

    // Geocode address and populate What3Words field
    async geocodeJobAddress(address, postcode) {
        try {
            const result = await geocodingService.geocodeAddress(address, postcode);
            if (result) {
                // Populate What3Words if available
                if (result.what3words) {
                    const w3wField = $('#what3words');
                    if (w3wField) {
                        w3wField.value = result.what3words;
                    }
                }

                console.log(`Geocoded: ${result.lat}, ${result.lng} (${result.source})`);
                if (result.what3words) {
                    console.log(`What3Words: ${result.what3words}`);
                }

                this.autoSave();
            }
        } catch (error) {
            console.warn('Failed to geocode address:', error);
        }
    }

    // Show job loaded message
    showJobLoadedMessage(jobRef) {
        const toast = document.createElement('div');
        toast.className = 'job-loaded-toast';
        toast.innerHTML = `<strong>${jobRef}</strong> loaded successfully`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--success-color);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            font-size: 0.9375rem;
            animation: slideUp 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Clear current job selection
    clearCurrentJob() {
        this.currentJob = null;

        const jobInfo = $('#jobInfo');
        const selectJobBtn = $('#selectJobBtn');
        const equipmentSummary = $('#equipmentSummary');
        const projectRefInput = $('#projectRef');

        if (jobInfo) jobInfo.style.display = 'none';
        if (selectJobBtn) selectJobBtn.style.display = 'flex';
        if (equipmentSummary) equipmentSummary.style.display = 'none';
        if (projectRefInput) projectRefInput.value = '';
    }

    // Dropbox Integration Methods
    handleDropboxClick() {
        if (!isDropboxConfigured()) {
            alert('Dropbox is not configured.\n\nPlease add your Dropbox App Key in:\njs/config/dropbox.js');
            return;
        }

        // If a job is selected, upload directly to that job's survey folder
        if (this.currentJob) {
            this.uploadToJobFolder();
        } else {
            this.showDropboxFolderPicker();
        }
    }

    // Upload directly to job's survey folder
    async uploadToJobFolder() {
        const projectRef = this.currentJob.contractData?.projectRef || this.currentJob.name;
        const surveyPath = getSurveyPath(projectRef);

        // Show upload progress
        const progressOverlay = this.createUploadProgress('Preparing survey...');
        document.body.appendChild(progressOverlay);

        try {
            // Collect form data
            const roofAspectCount = formState.get('roofAspectCount');
            const formData = formDataModel.collectFormData(this.form, roofAspectCount);

            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filename = `Survey_${projectRef}_${date}.xlsx`;

            // Update progress
            this.updateUploadProgress(progressOverlay, 'Creating survey folder...');

            // Create folder if it doesn't exist
            await dropboxService.createFolderIfNotExists(surveyPath);

            // Update progress
            this.updateUploadProgress(progressOverlay, 'Generating Excel file...');

            // Generate Excel file as blob
            const workbook = excelExporter.createWorkbook(formData, roofAspectCount);
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Update progress
            this.updateUploadProgress(progressOverlay, 'Uploading to Dropbox...');

            // Upload to Dropbox
            const result = await dropboxService.uploadFile(surveyPath, blob, filename);

            // Show success
            this.showUploadSuccess(progressOverlay, result.name, projectRef);

            // Ask if user wants to clear form
            setTimeout(() => {
                if (confirm('Survey uploaded successfully!\n\nWould you like to clear the form to start a new survey?')) {
                    this.clearFormWithoutConfirm();
                    this.clearCurrentJob();
                }
            }, 2000);

        } catch (error) {
            console.error('Dropbox upload error:', error);
            this.showUploadError(progressOverlay, error.message);
        }
    }

    showDropboxFolderPicker() {
        const picker = new DropboxFolderPicker(
            (folderPath, folderName) => {
                // Folder selected, upload the survey
                this.uploadToDropbox(folderPath, folderName);
            },
            () => {
                // Cancelled - do nothing
            }
        );
        picker.show();
    }

    async uploadToDropbox(folderPath, folderName) {
        // Show upload progress
        const progressOverlay = this.createUploadProgress('Preparing survey...');
        document.body.appendChild(progressOverlay);

        try {
            // Collect form data
            const roofAspectCount = formState.get('roofAspectCount');
            const formData = formDataModel.collectFormData(this.form, roofAspectCount);

            // Generate filename with customer name and date
            const customerName = formData.customerName || 'Survey';
            const date = new Date().toISOString().split('T')[0];
            const safeName = customerName.replace(/[^a-zA-Z0-9\s-]/g, '').trim() || 'Survey';
            const filename = `${safeName}_${date}.xlsx`;

            // Update progress
            this.updateUploadProgress(progressOverlay, 'Generating Excel file...');

            // Generate Excel file as blob
            const workbook = excelExporter.createWorkbook(formData, roofAspectCount);
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Update progress
            this.updateUploadProgress(progressOverlay, 'Uploading to Dropbox...');

            // Upload to Dropbox
            const result = await dropboxService.uploadFile(folderPath, blob, filename);

            // Show success
            this.showUploadSuccess(progressOverlay, result.name, folderName);

            // Ask if user wants to clear form
            setTimeout(() => {
                if (confirm('Survey uploaded successfully!\n\nWould you like to clear the form to start a new survey?')) {
                    this.clearFormWithoutConfirm();
                }
            }, 2000);

        } catch (error) {
            console.error('Dropbox upload error:', error);
            this.showUploadError(progressOverlay, error.message);
        }
    }

    createUploadProgress(message) {
        const overlay = document.createElement('div');
        overlay.className = 'dropbox-modal-overlay';
        overlay.innerHTML = `
            <div class="dropbox-upload-progress">
                <div class="dropbox-upload-spinner"></div>
                <h4>${message}</h4>
            </div>
        `;
        return overlay;
    }

    updateUploadProgress(overlay, message) {
        const h4 = overlay.querySelector('h4');
        if (h4) h4.textContent = message;
    }

    showUploadSuccess(overlay, filename, folderName) {
        const content = overlay.querySelector('.dropbox-upload-progress');
        if (content) {
            content.innerHTML = `
                <div class="dropbox-upload-success">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <h4>Upload Complete!</h4>
                    <p style="margin: 0.5rem 0; font-size: 0.875rem; color: #666;">
                        <strong>${filename}</strong><br>
                        saved to ${folderName}
                    </p>
                </div>
            `;
        }
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 3000);
    }

    showUploadError(overlay, errorMessage) {
        const content = overlay.querySelector('.dropbox-upload-progress');
        if (content) {
            content.innerHTML = `
                <div style="color: var(--error-color);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="margin-bottom: 0.5rem;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <h4>Upload Failed</h4>
                    <p style="margin: 0.5rem 0; font-size: 0.875rem;">${errorMessage}</p>
                    <button class="dropbox-btn dropbox-btn-cancel" onclick="this.closest('.dropbox-modal-overlay').remove()">
                        Close
                    </button>
                </div>
            `;
        }
    }

    // ==================== DRAFT METHODS ====================

    // Save current form as a draft
    saveDraft() {
        try {
            const roofAspectCount = formState.get('roofAspectCount');
            const formData = formDataModel.collectFormData(this.form, roofAspectCount);

            const result = storageService.saveDraft(formData, roofAspectCount);

            if (result.success) {
                this.showDraftSavedMessage(result.draft.name);
            } else {
                alert('Failed to save draft: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('Error saving draft. Please try again.');
        }
    }

    // Show the drafts picker modal
    showDraftsPicker() {
        const picker = new DraftsPicker(
            (data, roofAspectCount, draft) => {
                this.loadDraftData(data, roofAspectCount, draft);
            },
            () => {
                // Cancelled - do nothing
            }
        );
        picker.show();
    }

    // Load draft data into the form
    loadDraftData(data, roofAspectCount, draft) {
        try {
            // Clear existing form
            clearFormHelper(this.form);

            // Remove extra roof aspects
            const currentCount = this.roofAspectManager.getCount();
            for (let i = currentCount; i > 1; i--) {
                const aspect = this.roofAspectManager.getAspect(i);
                if (aspect) aspect.destroy();
            }
            this.roofAspectManager.aspects = this.roofAspectManager.aspects.slice(0, 1);

            // Clear file uploads
            this.fileUploads.forEach(upload => upload.clear());

            // Reset first roof aspect
            const firstAspect = this.roofAspectManager.getAspect(1);
            if (firstAspect && firstAspect.element) {
                const inputs = firstAspect.element.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    if (input.type !== 'hidden') input.value = '';
                });
            }

            // Populate form fields
            populateForm(this.form, data);

            // Restore roof aspects
            if (roofAspectCount > 1) {
                for (let i = 2; i <= roofAspectCount; i++) {
                    this.roofAspectManager.add();
                }
            }
            formState.set('roofAspectCount', roofAspectCount || 1);

            // Restore roof aspect data
            for (let i = 1; i <= roofAspectCount; i++) {
                const aspectData = formDataModel.getRoofAspectData(data, i);
                const aspect = this.roofAspectManager.getAspect(i);
                if (aspect) {
                    aspect.setData(aspectData);
                }
            }

            // Restore button group states
            Object.keys(data).forEach(key => {
                const field = this.form.querySelector(`[name="${key}"]`);
                if (field && field.type === 'hidden' && field.value) {
                    const button = this.form.querySelector(
                        `[data-field="${key}"][data-value="${field.value}"]`
                    );
                    if (button) {
                        button.classList.add('active');

                        if (field.value === 'Notes') {
                            const notesField = $(`#${key}Notes`);
                            if (notesField) {
                                notesField.style.display = 'block';
                            }
                        }
                    }
                }
            });

            // Trigger conditional fields
            this.form.querySelectorAll('select').forEach(select => {
                if (select.value) {
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Update state and save to active storage
            formState.setFormData(data);
            storageService.save(data, roofAspectCount || 1);

            this.updateProgress();
            this.showDraftLoadedMessage(draft.name);
        } catch (error) {
            console.error('Error loading draft:', error);
            alert('Error loading draft. Please try again.');
        }
    }

    // Show draft saved message
    showDraftSavedMessage(name) {
        const toast = document.createElement('div');
        toast.className = 'draft-toast draft-toast-success';
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>Draft saved: <strong>${this.escapeHtml(name)}</strong></span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Show draft loaded message
    showDraftLoadedMessage(name) {
        const toast = document.createElement('div');
        toast.className = 'draft-toast draft-toast-info';
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
            <span>Loaded: <strong>${this.escapeHtml(name)}</strong></span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Escape HTML helper
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearFormWithoutConfirm() {
        try {
            clearFormHelper(this.form);
            const count = this.roofAspectManager.getCount();
            for (let i = count; i > 1; i--) {
                const aspect = this.roofAspectManager.getAspect(i);
                if (aspect) aspect.destroy();
            }
            this.roofAspectManager.aspects = this.roofAspectManager.aspects.slice(0, 1);
            this.fileUploads.forEach(upload => upload.clear());
            formState.reset();
            formState.set('roofAspectCount', 1);
            storageService.clear();

            const firstAspect = this.roofAspectManager.getAspect(1);
            if (firstAspect && firstAspect.element) {
                const inputs = firstAspect.element.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    if (input.type !== 'hidden') input.value = '';
                });
            }

            const floorplanPreview = $('#floorplanPreview');
            const roofPlanPreview = $('#roofPlanPreview');
            const additionalPhotosPreview = $('#additionalPhotosPreview');
            if (floorplanPreview) floorplanPreview.innerHTML = '';
            if (roofPlanPreview) roofPlanPreview.innerHTML = '';
            if (additionalPhotosPreview) additionalPhotosPreview.innerHTML = '';

            this.updateProgress();
            this.showSaveIndicator();
        } catch (error) {
            console.error('Error clearing form:', error);
        }
    }

    // ==================== CUSTOM FORMS METHODS ====================

    showCustomForms() {
        const surveyContainer = $('.container');
        const customFormsContainer = $('#customFormsContainer');

        if (surveyContainer && customFormsContainer) {
            surveyContainer.style.display = 'none';
            customFormsContainer.style.display = 'block';
        }
    }

    hideCustomForms() {
        const surveyContainer = $('.container');
        const customFormsContainer = $('#customFormsContainer');

        // Cleanup any active builder/renderer
        this.cleanupFormBuilder();
        this.cleanupFormRenderer();

        if (surveyContainer && customFormsContainer) {
            customFormsContainer.style.display = 'none';
            surveyContainer.style.display = 'block';
        }
    }

    showFormBuilder(templateToEdit = null) {
        const builderContainer = $('#formBuilderContainer');
        const rendererContainer = $('#formRendererContainer');

        if (!builderContainer) return;

        // Hide renderer if visible
        if (rendererContainer) {
            rendererContainer.innerHTML = '';
            rendererContainer.style.display = 'none';
        }

        // Cleanup existing builder
        this.cleanupFormBuilder();

        // Show builder container
        builderContainer.style.display = 'block';

        // Create builder
        this.formBuilder = new FormBuilder(builderContainer, {
            onSave: (template) => {
                console.log('Template saved:', template);
                this.cleanupFormBuilder();
                builderContainer.style.display = 'none';
            },
            onCancel: () => {
                this.cleanupFormBuilder();
                builderContainer.style.display = 'none';
            },
            onPreview: (template) => {
                // Preview handled by FormBuilder itself
            }
        });

        // Load template if editing
        if (templateToEdit) {
            this.formBuilder.loadTemplate(templateToEdit);
        }
    }

    showTemplatePicker() {
        const picker = new TemplatePicker({
            onSelect: (template) => {
                this.showFormRenderer(template);
            },
            onEdit: (template) => {
                this.showFormBuilder(template);
            },
            onDelete: (templateId) => {
                console.log('Template deleted:', templateId);
            }
        });
        picker.show();
    }

    showFormRenderer(template) {
        const builderContainer = $('#formBuilderContainer');
        const rendererContainer = $('#formRendererContainer');

        if (!rendererContainer) return;

        // Hide builder if visible
        if (builderContainer) {
            this.cleanupFormBuilder();
            builderContainer.style.display = 'none';
        }

        // Cleanup existing renderer
        this.cleanupFormRenderer();

        // Show renderer container
        rendererContainer.style.display = 'block';

        // Create action buttons container
        const actionsHtml = `
            <div class="form-builder-renderer-actions" style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <button type="button" class="btn-primary" id="submitCustomFormBtn">Save Form Data</button>
                <button type="button" class="btn-secondary" id="clearCustomFormBtn">Clear</button>
                <button type="button" class="btn-secondary" id="closeCustomFormBtn">Close Form</button>
            </div>
        `;

        rendererContainer.innerHTML = actionsHtml + '<div id="customFormContent"></div>';

        // Create renderer
        const contentContainer = $('#customFormContent');
        this.formRenderer = new FormRenderer(contentContainer, template, {
            autoSave: true,
            onValueChange: (name, value, data) => {
                // Auto-save to localStorage
                this.currentCustomFormData = data;
            }
        });

        // Load any existing data for this template
        const savedData = this.loadCustomFormData(template.id);
        if (savedData) {
            this.formRenderer.setData(savedData);
        }

        // Setup action button handlers
        const submitBtn = $('#submitCustomFormBtn');
        const clearBtn = $('#clearCustomFormBtn');
        const closeBtn = $('#closeCustomFormBtn');

        if (submitBtn) {
            on(submitBtn, 'click', () => this.submitCustomForm(template));
        }
        if (clearBtn) {
            on(clearBtn, 'click', () => {
                if (confirm('Clear all form data?')) {
                    this.formRenderer.clear();
                    this.currentCustomFormData = null;
                }
            });
        }
        if (closeBtn) {
            on(closeBtn, 'click', () => {
                this.cleanupFormRenderer();
                rendererContainer.style.display = 'none';
                rendererContainer.innerHTML = '';
            });
        }
    }

    submitCustomForm(template) {
        if (!this.formRenderer) return;

        const validation = this.formRenderer.validate();
        if (!validation.isValid) {
            alert('Please fix the following errors:\n' + validation.errors.map(e => e.message).join('\n'));
            this.formRenderer.focusFirstInvalid();
            return;
        }

        const data = this.formRenderer.getData();

        // Save form data
        const result = formTemplateStorage.saveFormData(template.id, data, template.name);

        if (result.success) {
            alert('Form data saved successfully!');
            // Optionally clear after save
            if (confirm('Would you like to clear the form and start a new entry?')) {
                this.formRenderer.clear();
                this.currentCustomFormData = null;
            }
        } else {
            alert('Error saving form data: ' + result.error);
        }
    }

    loadCustomFormData(templateId) {
        // Try to load most recent form data for this template
        const formDataList = formTemplateStorage.listFormData(templateId);
        if (formDataList.length > 0) {
            const mostRecent = formDataList[0];
            const result = formTemplateStorage.loadFormData(mostRecent.id);
            if (result.success) {
                return result.formData.data;
            }
        }
        return null;
    }

    cleanupFormBuilder() {
        if (this.formBuilder) {
            this.formBuilder.destroy();
            this.formBuilder = null;
        }
        const builderContainer = $('#formBuilderContainer');
        if (builderContainer) {
            builderContainer.innerHTML = '';
        }
    }

    cleanupFormRenderer() {
        if (this.formRenderer) {
            this.formRenderer.destroy();
            this.formRenderer = null;
        }
        this.currentCustomFormData = null;
    }
}

// Initialize app
const app = new SolarSurveyApp();
app.init();

