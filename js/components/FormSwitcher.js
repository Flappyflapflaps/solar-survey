// Form Switcher - Handles switching between Solar Survey, Site Survey, ASHP and Custom forms

import { initializeButtonGroups } from './ButtonGroup.js';
import { debounce } from '../utils/debounce.js';

const ASHP_STORAGE_KEY = 'ashpPostInspection';
const SITE_SURVEY_STORAGE_KEY = 'siteSurveyData';
const JOB_COMPLETED_STORAGE_KEY = 'jobCompletedData';

class FormSwitcher {
    constructor() {
        this.currentForm = 'solar';
        this.solarForm = null;
        this.ashpForm = null;
        this.siteSurveyForm = null;
        this.jobCompletedForm = null;
        this.jobCompletedContainer = null;
        this.customFormsContainer = null;
        this.mainContainer = null;
        this.formSelector = null;
        this.formDropdown = null;
        this.ashpButtonGroups = [];
        this.siteSurveyButtonGroups = [];
        this.jobCompletedButtonGroups = [];
        this.signaturePads = {};
        this.autoSaveDebounced = null;
        this.siteSurveyAutoSaveDebounced = null;
        this.jobCompletedAutoSaveDebounced = null;
    }

    init() {
        try {
            console.log('FormSwitcher: Initializing...');

            this.solarForm = document.getElementById('surveyForm');
            this.ashpForm = document.getElementById('ashpForm');
            this.siteSurveyForm = document.getElementById('siteSurveyForm');
            this.customFormsContainer = document.getElementById('customFormsContainer');
            this.mainContainer = document.getElementById('mainSurveyContainer');
            this.formSelector = document.getElementById('formTypeSelector');
            this.formDropdown = document.getElementById('formTypeDropdown');

            console.log('FormSwitcher: Elements found:', {
                solarForm: !!this.solarForm,
                ashpForm: !!this.ashpForm,
                siteSurveyForm: !!this.siteSurveyForm,
                customFormsContainer: !!this.customFormsContainer,
                formSelector: !!this.formSelector,
                formDropdown: !!this.formDropdown
            });

            if (!this.formSelector) {
                console.warn('Form selector not found');
                return;
            }

            this.setupEventListeners();
            this.initializeASHPForm();
            this.initializeSiteSurveyForm();
            this.loadASHPData();
            this.loadSiteSurveyData();
            console.log('FormSwitcher: Initialization complete');
        } catch (error) {
            console.error('FormSwitcher: Initialization error:', error);
        }
    }

    setupEventListeners() {
        // Form type dropdown selector
        if (this.formDropdown) {
            console.log('FormSwitcher: Setting up dropdown listener');
            this.formDropdown.addEventListener('change', (e) => {
                const formType = e.target.value;
                console.log('FormSwitcher: Dropdown changed to:', formType);
                this.switchForm(formType);
            });
        }

        // ASHP nav toggle
        const ashpNavToggle = document.getElementById('ashpNavToggle');
        const ashpNavItems = document.getElementById('ashpNavItems');
        if (ashpNavToggle && ashpNavItems) {
            ashpNavToggle.addEventListener('click', () => {
                ashpNavItems.classList.toggle('active');
            });
        }

        // Site Survey nav toggle
        const ssNavToggle = document.getElementById('siteSurveyNavToggle');
        const ssNavItems = document.getElementById('siteSurveyNavItems');
        if (ssNavToggle && ssNavItems) {
            ssNavToggle.addEventListener('click', () => {
                ssNavItems.classList.toggle('active');
            });
        }

        // ASHP action menu toggle
        const ashpActionToggle = document.getElementById('ashpActionMenuToggle');
        const ashpActionWrapper = document.getElementById('ashpActionButtonsWrapper');
        if (ashpActionToggle && ashpActionWrapper) {
            ashpActionToggle.addEventListener('click', () => {
                ashpActionWrapper.classList.toggle('active');
            });
        }

        // Site Survey action menu toggle
        const ssActionToggle = document.getElementById('ssActionMenuToggle');
        const ssActionWrapper = document.getElementById('ssActionButtonsWrapper');
        if (ssActionToggle && ssActionWrapper) {
            ssActionToggle.addEventListener('click', () => {
                ssActionWrapper.classList.toggle('active');
            });
        }

        // ASHP action buttons
        const ashpClearBtn = document.getElementById('ashpClearBtn');
        if (ashpClearBtn) {
            ashpClearBtn.addEventListener('click', () => this.clearASHPForm());
        }

        const ashpSaveDraftBtn = document.getElementById('ashpSaveDraftBtn');
        if (ashpSaveDraftBtn) {
            ashpSaveDraftBtn.addEventListener('click', () => this.saveASHPDraft());
        }

        const ashpLoadDraftBtn = document.getElementById('ashpLoadDraftBtn');
        if (ashpLoadDraftBtn) {
            ashpLoadDraftBtn.addEventListener('click', () => this.loadASHPDrafts());
        }

        const ashpExportPdfBtn = document.getElementById('ashpExportPdfBtn');
        if (ashpExportPdfBtn) {
            ashpExportPdfBtn.addEventListener('click', () => this.exportASHPToPDF());
        }

        // Site Survey action buttons
        const ssClearBtn = document.getElementById('ssClearBtn');
        if (ssClearBtn) {
            ssClearBtn.addEventListener('click', () => this.clearSiteSurveyForm());
        }

        const ssSaveDraftBtn = document.getElementById('ssSaveDraftBtn');
        if (ssSaveDraftBtn) {
            ssSaveDraftBtn.addEventListener('click', () => this.saveSiteSurveyDraft());
        }

        const ssLoadDraftBtn = document.getElementById('ssLoadDraftBtn');
        if (ssLoadDraftBtn) {
            ssLoadDraftBtn.addEventListener('click', () => this.loadSiteSurveyDrafts());
        }

        const ssExportPdfBtn = document.getElementById('ssExportPdfBtn');
        if (ssExportPdfBtn) {
            ssExportPdfBtn.addEventListener('click', () => this.exportSiteSurveyToPDF());
        }

        const ssExportCsvBtn = document.getElementById('ssExportCsvBtn');
        if (ssExportCsvBtn) {
            ssExportCsvBtn.addEventListener('click', () => this.exportSiteSurveyToCSV());
        }

        // Defect Free conditional field (ASHP)
        const defectFreeField = document.getElementById('ashpDefectFree');
        if (defectFreeField) {
            // Watch for changes via MutationObserver since it's a hidden input
            const observer = new MutationObserver(() => {
                const notesField = document.getElementById('ashpDefectFreeNotes');
                if (notesField) {
                    notesField.style.display = defectFreeField.value === 'No' ? 'block' : 'none';
                }
            });
            observer.observe(defectFreeField, { attributes: true, attributeFilter: ['value'] });
        }

        // Site Survey conditional fields
        this.setupSiteSurveyConditionalFields();
    }

    setupSiteSurveyConditionalFields() {
        // Parking Available conditional
        const parkingField = document.getElementById('ssParkingAvailable');
        if (parkingField) {
            const observer = new MutationObserver(() => {
                const specGroup = document.getElementById('ssParkingSpecGroup');
                if (specGroup) {
                    specGroup.style.display = parkingField.value === 'N' ? 'block' : 'none';
                }
            });
            observer.observe(parkingField, { attributes: true, attributeFilter: ['value'] });
        }

        // Nests conditional
        const nestsField = document.getElementById('ssNests');
        if (nestsField) {
            const observer = new MutationObserver(() => {
                const specGroup = document.getElementById('ssNestSpecGroup');
                if (specGroup) {
                    specGroup.style.display = nestsField.value === 'Y' ? 'block' : 'none';
                }
            });
            observer.observe(nestsField, { attributes: true, attributeFilter: ['value'] });
        }
    }

    initializeASHPForm() {
        if (!this.ashpForm) {
            console.log('FormSwitcher: ASHP form not found, skipping initialization');
            return;
        }

        try {
            // Initialize button groups for ASHP form
            console.log('FormSwitcher: Initializing ASHP button groups...');
            this.ashpButtonGroups = initializeButtonGroups(this.ashpForm, () => {
                this.autoSaveASHP();
            });
            console.log('FormSwitcher: ASHP button groups initialized');
        } catch (error) {
            console.error('FormSwitcher: Error initializing button groups:', error);
        }

        // Initialize signature pads
        this.initializeSignaturePads();

        // Auto-save on input
        this.autoSaveDebounced = debounce(() => this.autoSaveASHP(), 2000);
        this.ashpForm.addEventListener('input', this.autoSaveDebounced);
        this.ashpForm.addEventListener('change', this.autoSaveDebounced);
    }

    initializeSignaturePads() {
        console.log('FormSwitcher: Initializing signature pads...');
        const customerCanvas = document.getElementById('ashpCustomerSignature');
        const inspectorCanvas = document.getElementById('ashpInspectorSignature');

        if (customerCanvas) {
            this.signaturePads.customer = this.createSignaturePad(customerCanvas, 'ashpCustomerSignatureData');
        }
        if (inspectorCanvas) {
            this.signaturePads.inspector = this.createSignaturePad(inspectorCanvas, 'ashpInspectorSignatureData');
        }

        // Clear buttons
        document.querySelectorAll('.signature-clear').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const canvas = document.getElementById(targetId);
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    // Clear the hidden input
                    const hiddenInput = document.getElementById(targetId + 'Data');
                    if (hiddenInput) hiddenInput.value = '';
                }
            });
        });
    }

    createSignaturePad(canvas, hiddenInputId) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        const getCoordinates = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            if (e.touches && e.touches[0]) {
                return {
                    x: (e.touches[0].clientX - rect.left) * scaleX,
                    y: (e.touches[0].clientY - rect.top) * scaleY
                };
            }
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };

        const startDrawing = (e) => {
            isDrawing = true;
            const coords = getCoordinates(e);
            lastX = coords.x;
            lastY = coords.y;
            e.preventDefault();
        };

        const draw = (e) => {
            if (!isDrawing) return;
            e.preventDefault();

            const coords = getCoordinates(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(coords.x, coords.y);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();

            lastX = coords.x;
            lastY = coords.y;
        };

        const stopDrawing = () => {
            if (isDrawing) {
                isDrawing = false;
                // Save signature data
                const hiddenInput = document.getElementById(hiddenInputId);
                if (hiddenInput) {
                    hiddenInput.value = canvas.toDataURL();
                }
                this.autoSaveASHP();
            }
        };

        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch events
        canvas.addEventListener('touchstart', startDrawing);
        canvas.addEventListener('touchmove', draw);
        canvas.addEventListener('touchend', stopDrawing);

        return { canvas, ctx };
    }

    switchForm(formType) {
        console.log('FormSwitcher: Switching to', formType);

        if (formType === this.currentForm) {
            console.log('FormSwitcher: Already on this form, skipping');
            return;
        }

        this.currentForm = formType;

        // Update dropdown value
        if (this.formDropdown) {
            this.formDropdown.value = formType;
        }

        // Update title
        const titleEl = document.getElementById('formTitle');

        // Show/hide forms and navigation
        const solarNav = document.getElementById('navMenu');
        const siteSurveyNav = document.getElementById('siteSurveyNavMenu');
        const header = document.querySelector('.header');

        if (formType === 'solar') {
            if (titleEl) titleEl.textContent = 'Solar Site Survey';
            if (this.mainContainer) this.mainContainer.style.display = 'block';
            if (this.solarForm) this.solarForm.style.display = 'block';
            if (this.ashpForm) this.ashpForm.style.display = 'none';
            if (this.siteSurveyForm) this.siteSurveyForm.style.display = 'none';
            if (this.customFormsContainer) this.customFormsContainer.style.display = 'none';
            if (solarNav) solarNav.style.display = 'block';
            if (siteSurveyNav) siteSurveyNav.style.display = 'none';
            if (header) header.style.display = 'block';
        } else if (formType === 'siteSurvey') {
            if (titleEl) titleEl.textContent = 'Customer Site Survey (Solar)';
            if (this.mainContainer) this.mainContainer.style.display = 'block';
            if (this.solarForm) this.solarForm.style.display = 'none';
            if (this.ashpForm) this.ashpForm.style.display = 'none';
            if (this.siteSurveyForm) this.siteSurveyForm.style.display = 'block';
            if (this.customFormsContainer) this.customFormsContainer.style.display = 'none';
            if (solarNav) solarNav.style.display = 'none';
            if (siteSurveyNav) siteSurveyNav.style.display = 'block';
            if (header) header.style.display = 'block';
        } else if (formType === 'ashp') {
            if (titleEl) titleEl.textContent = 'ASHP Post Inspection';
            if (this.mainContainer) this.mainContainer.style.display = 'block';
            if (this.solarForm) this.solarForm.style.display = 'none';
            if (this.ashpForm) this.ashpForm.style.display = 'block';
            if (this.siteSurveyForm) this.siteSurveyForm.style.display = 'none';
            if (this.customFormsContainer) this.customFormsContainer.style.display = 'none';
            if (solarNav) solarNav.style.display = 'none';
            if (siteSurveyNav) siteSurveyNav.style.display = 'none';
            if (header) header.style.display = 'block';
        } else if (formType === 'custom') {
            if (this.mainContainer) this.mainContainer.style.display = 'none';
            if (this.customFormsContainer) this.customFormsContainer.style.display = 'block';
        }

        console.log('FormSwitcher: Switch complete, forms displayed:', {
            solarForm: this.solarForm?.style.display,
            ashpForm: this.ashpForm?.style.display,
            siteSurveyForm: this.siteSurveyForm?.style.display,
            customForms: this.customFormsContainer?.style.display
        });

        // Scroll to top
        window.scrollTo(0, 0);
    }

    collectASHPData() {
        if (!this.ashpForm) return {};

        const formData = new FormData(this.ashpForm);
        const data = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Get hidden input values (button groups)
        this.ashpForm.querySelectorAll('input[type="hidden"]').forEach(input => {
            if (input.name && input.value) {
                data[input.name] = input.value;
            }
        });

        return data;
    }

    autoSaveASHP() {
        const data = this.collectASHPData();
        localStorage.setItem(ASHP_STORAGE_KEY, JSON.stringify(data));
        this.showSaveIndicator();
    }

    loadASHPData() {
        const savedData = localStorage.getItem(ASHP_STORAGE_KEY);
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);
            this.populateASHPForm(data);
        } catch (e) {
            console.error('Error loading ASHP data:', e);
        }
    }

    populateASHPForm(data) {
        if (!this.ashpForm || !data) return;

        Object.entries(data).forEach(([key, value]) => {
            const element = this.ashpForm.querySelector(`[name="${key}"]`);
            if (!element) return;

            if (element.type === 'hidden') {
                element.value = value;
                // Update button group visual state
                const buttons = this.ashpForm.querySelectorAll(`[data-field="${key}"]`);
                buttons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === value);
                });
            } else if (element.tagName === 'SELECT') {
                element.value = value;
            } else if (element.tagName === 'TEXTAREA') {
                element.value = value;
            } else {
                element.value = value;
            }

            // Load signature data
            if (key.endsWith('SignatureData') && value) {
                const canvasId = key.replace('Data', '');
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = value;
                }
            }
        });

        // Handle conditional fields
        const defectFreeFieldPopulate = document.getElementById('ashpDefectFree');
        const notesFieldPopulate = document.getElementById('ashpDefectFreeNotes');
        if (defectFreeFieldPopulate && notesFieldPopulate) {
            notesFieldPopulate.style.display = defectFreeFieldPopulate.value === 'No' ? 'block' : 'none';
        }
    }

    clearASHPForm() {
        if (!confirm('Are you sure you want to clear the ASHP form? This cannot be undone.')) {
            return;
        }

        if (this.ashpForm) {
            this.ashpForm.reset();

            // Clear hidden inputs
            this.ashpForm.querySelectorAll('input[type="hidden"]').forEach(input => {
                input.value = '';
            });

            // Clear button group selections
            this.ashpForm.querySelectorAll('.btn-choice').forEach(btn => {
                btn.classList.remove('active');
            });

            // Clear signature pads
            Object.values(this.signaturePads).forEach(pad => {
                if (pad && pad.ctx) {
                    pad.ctx.clearRect(0, 0, pad.canvas.width, pad.canvas.height);
                }
            });

            // Clear file previews
            const photoPreview = document.getElementById('ashpPhotosPreview');
            if (photoPreview) photoPreview.innerHTML = '';
        }

        localStorage.removeItem(ASHP_STORAGE_KEY);
    }

    saveASHPDraft() {
        const name = prompt('Enter a name for this draft:');
        if (!name) return;

        const data = this.collectASHPData();
        const drafts = this.getASHPDrafts();

        const draft = {
            id: Date.now().toString(),
            name,
            data,
            createdAt: new Date().toISOString()
        };

        drafts.push(draft);
        localStorage.setItem('ashpDrafts', JSON.stringify(drafts));
        alert('Draft saved successfully!');
    }

    getASHPDrafts() {
        const drafts = localStorage.getItem('ashpDrafts');
        return drafts ? JSON.parse(drafts) : [];
    }

    loadASHPDrafts() {
        const drafts = this.getASHPDrafts();
        if (drafts.length === 0) {
            alert('No saved drafts found.');
            return;
        }

        const draftList = drafts.map((d, i) => `${i + 1}. ${d.name} (${new Date(d.createdAt).toLocaleDateString()})`).join('\n');
        const choice = prompt(`Select a draft to load:\n\n${draftList}\n\nEnter number:`);

        if (!choice) return;

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < drafts.length) {
            this.populateASHPForm(drafts[index].data);
            alert('Draft loaded successfully!');
        }
    }

    async exportASHPToPDF() {
        const data = this.collectASHPData();

        // Use jsPDF if available
        if (typeof window.jspdf === 'undefined') {
            alert('PDF library not loaded. Please try again.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('ASHP Post Inspection Report', 105, 20, { align: 'center' });

        // Add content
        doc.setFontSize(10);
        let y = 35;

        const addSection = (title, fields) => {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(title, 14, y);
            y += 7;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            fields.forEach(([label, key]) => {
                const value = data[key] || 'N/A';
                doc.text(`${label}: ${value}`, 14, y);
                y += 5;
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
            });
            y += 5;
        };

        addSection('Title Page', [
            ['Customer', 'ashpCustomer'],
            ['Conducted On', 'ashpConductedDate'],
            ['Prepared By', 'ashpPreparedBy'],
            ['Location', 'ashpLocation']
        ]);

        addSection('ASHP Unit', [
            ['Unit Location', 'ashpUnitLocation'],
            ['Make', 'ashpMake'],
            ['Model', 'ashpModel'],
            ['Mounting', 'ashpMounting'],
            ['Anti Freeze Type', 'ashpAntiFreezeType'],
            ['Condense Route', 'ashpCondenseRoute'],
            ['Clearances Compliant', 'ashpClearancesCompliant'],
            ['Unit Level', 'ashpUnitLevel'],
            ['Unit Undamaged', 'ashpUnitUndamaged']
        ]);

        addSection('Cylinder & Vessels', [
            ['Location', 'ashpCylinderLocation'],
            ['Make', 'ashpCylinderMake'],
            ['Size (ltr)', 'ashpCylinderSize'],
            ['Vessels Correct', 'ashpVesselsCorrect'],
            ['PRV Pipework Complete', 'ashpPRVComplete']
        ]);

        addSection('Controls', [
            ['Type of Controls', 'ashpControlsType'],
            ['Settings', 'ashpSettings'],
            ['Customer Received Instructions', 'ashpCustomerInstructions'],
            ['Heating Curve', 'ashpHeatingCurve'],
            ['Flowrate (lph)', 'ashpFlowrate']
        ]);

        addSection('Emitters', [
            ['Emitter Type', 'ashpEmitterType'],
            ['Radiators Level & Unmarked', 'ashpRadiatorsLevel'],
            ['Radiators Free from Leaks', 'ashpRadiatorsFreeLeaks'],
            ['By-pass Radiator Correct', 'ashpBypassCorrect'],
            ['TRVs Fitted Correctly', 'ashpTRVsFitted']
        ]);

        addSection('Pipework', [
            ['Pipework Installed Correctly', 'ashpPipeworkInstalled'],
            ['Pipework Free from Leaks', 'ashpPipeworkFreeLeaks'],
            ['Pipework Correctly Clipped', 'ashpPipeworkClipped'],
            ['Pipework Correctly Insulated', 'ashpPipeworkInsulated']
        ]);

        addSection('General', [
            ['Installation Defect Free', 'ashpDefectFree'],
            ['Notes', 'ashpNotes']
        ]);

        // Add signatures if present
        if (data.ashpCustomerSignatureData) {
            doc.addPage();
            doc.setFontSize(12);
            doc.text('Customer Signature:', 14, 20);
            doc.addImage(data.ashpCustomerSignatureData, 'PNG', 14, 25, 80, 40);
            doc.text(`Date: ${data.ashpCustomerSignatureDate || 'N/A'}`, 14, 70);
        }

        if (data.ashpInspectorSignatureData) {
            doc.text('Inspector Signature:', 14, 85);
            doc.addImage(data.ashpInspectorSignatureData, 'PNG', 14, 90, 80, 40);
            doc.text(`Date: ${data.ashpInspectorSignatureDate || 'N/A'}`, 14, 135);
        }

        // Generate filename
        const location = data.ashpLocation || 'Unknown';
        const date = new Date().toISOString().split('T')[0];
        const filename = `ASHP_Inspection_${location.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.pdf`;

        doc.save(filename);
    }

    showSaveIndicator() {
        const indicator = document.getElementById('saveIndicator');
        if (indicator) {
            indicator.classList.add('show');
            setTimeout(() => indicator.classList.remove('show'), 2000);
        }
    }

    // ==================== SITE SURVEY METHODS ====================

    initializeSiteSurveyForm() {
        if (!this.siteSurveyForm) {
            console.log('FormSwitcher: Site Survey form not found, skipping initialization');
            return;
        }

        try {
            // Initialize button groups for Site Survey form
            console.log('FormSwitcher: Initializing Site Survey button groups...');
            this.siteSurveyButtonGroups = initializeButtonGroups(this.siteSurveyForm, () => {
                this.autoSaveSiteSurvey();
            });
            console.log('FormSwitcher: Site Survey button groups initialized');

            // Initialize quick options for Site Survey form
            this.initializeSiteSurveyQuickOptions();

            // Populate surveyor dropdown (same as main form)
            this.populateSiteSurveySurveyorDropdown();

        } catch (error) {
            console.error('FormSwitcher: Error initializing Site Survey button groups:', error);
        }

        // Auto-save on input
        this.siteSurveyAutoSaveDebounced = debounce(() => this.autoSaveSiteSurvey(), 2000);
        this.siteSurveyForm.addEventListener('input', this.siteSurveyAutoSaveDebounced);
        this.siteSurveyForm.addEventListener('change', this.siteSurveyAutoSaveDebounced);
    }

    initializeSiteSurveyQuickOptions() {
        // Quick options for Site Survey form
        const quickOptionsContainers = this.siteSurveyForm.querySelectorAll('.quick-options');
        quickOptionsContainers.forEach(container => {
            const targetId = container.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (!targetInput) return;

            container.querySelectorAll('.quick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    targetInput.value = btn.textContent.trim();
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
        });
    }

    populateSiteSurveySurveyorDropdown() {
        const select = document.getElementById('ssCarriedOutBy');
        if (!select) return;

        // Get surveyors from config (import if needed, or use same logic as main form)
        // For now, we'll copy the surveyors from the main form's dropdown
        const mainSelect = document.getElementById('carriedOutBy');
        if (mainSelect) {
            Array.from(mainSelect.options).forEach(opt => {
                if (opt.value) {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.textContent;
                    select.appendChild(option);
                }
            });
        }
    }

    collectSiteSurveyData() {
        if (!this.siteSurveyForm) return {};

        const formData = new FormData(this.siteSurveyForm);
        const data = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Get hidden input values (button groups)
        this.siteSurveyForm.querySelectorAll('input[type="hidden"]').forEach(input => {
            if (input.name && input.value) {
                data[input.name] = input.value;
            }
        });

        return data;
    }

    autoSaveSiteSurvey() {
        const data = this.collectSiteSurveyData();
        localStorage.setItem(SITE_SURVEY_STORAGE_KEY, JSON.stringify(data));
        this.showSaveIndicator();
    }

    loadSiteSurveyData() {
        const savedData = localStorage.getItem(SITE_SURVEY_STORAGE_KEY);
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);
            this.populateSiteSurveyForm(data);
        } catch (e) {
            console.error('Error loading Site Survey data:', e);
        }
    }

    populateSiteSurveyForm(data) {
        if (!this.siteSurveyForm || !data) return;

        Object.entries(data).forEach(([key, value]) => {
            const element = this.siteSurveyForm.querySelector(`[name="${key}"]`);
            if (!element) return;

            if (element.type === 'hidden') {
                element.value = value;
                // Update button group visual state
                const buttons = this.siteSurveyForm.querySelectorAll(`[data-field="${key}"]`);
                buttons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === value);
                });
            } else if (element.tagName === 'SELECT') {
                element.value = value;
            } else if (element.tagName === 'TEXTAREA') {
                element.value = value;
            } else {
                element.value = value;
            }
        });

        // Handle conditional fields
        const parkingField = document.getElementById('ssParkingAvailable');
        const parkingSpecGroup = document.getElementById('ssParkingSpecGroup');
        if (parkingField && parkingSpecGroup) {
            parkingSpecGroup.style.display = parkingField.value === 'N' ? 'block' : 'none';
        }

        const nestsField = document.getElementById('ssNests');
        const nestsSpecGroup = document.getElementById('ssNestSpecGroup');
        if (nestsField && nestsSpecGroup) {
            nestsSpecGroup.style.display = nestsField.value === 'Y' ? 'block' : 'none';
        }
    }

    clearSiteSurveyForm() {
        if (!confirm('Are you sure you want to clear the Site Survey form? This cannot be undone.')) {
            return;
        }

        if (this.siteSurveyForm) {
            this.siteSurveyForm.reset();

            // Clear hidden inputs
            this.siteSurveyForm.querySelectorAll('input[type="hidden"]').forEach(input => {
                input.value = '';
            });

            // Clear button group selections
            this.siteSurveyForm.querySelectorAll('.btn-choice').forEach(btn => {
                btn.classList.remove('active');
            });

            // Clear file previews
            const previews = ['ssFloorplanPreview', 'ssRoofPlanPreview', 'ssSitePhotosPreview'];
            previews.forEach(id => {
                const preview = document.getElementById(id);
                if (preview) preview.innerHTML = '';
            });
        }

        localStorage.removeItem(SITE_SURVEY_STORAGE_KEY);
    }

    saveSiteSurveyDraft() {
        const name = prompt('Enter a name for this draft:');
        if (!name) return;

        const data = this.collectSiteSurveyData();
        const drafts = this.getSiteSurveyDrafts();

        const draft = {
            id: Date.now().toString(),
            name,
            data,
            createdAt: new Date().toISOString()
        };

        drafts.push(draft);
        localStorage.setItem('siteSurveyDrafts', JSON.stringify(drafts));
        alert('Draft saved successfully!');
    }

    getSiteSurveyDrafts() {
        const drafts = localStorage.getItem('siteSurveyDrafts');
        return drafts ? JSON.parse(drafts) : [];
    }

    loadSiteSurveyDrafts() {
        const drafts = this.getSiteSurveyDrafts();
        if (drafts.length === 0) {
            alert('No saved drafts found.');
            return;
        }

        const draftList = drafts.map((d, i) => `${i + 1}. ${d.name} (${new Date(d.createdAt).toLocaleDateString()})`).join('\n');
        const choice = prompt(`Select a draft to load:\n\n${draftList}\n\nEnter number:`);

        if (!choice) return;

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < drafts.length) {
            this.populateSiteSurveyForm(drafts[index].data);
            alert('Draft loaded successfully!');
        }
    }

    async exportSiteSurveyToPDF() {
        const data = this.collectSiteSurveyData();

        // Use jsPDF if available
        if (typeof window.jspdf === 'undefined') {
            alert('PDF library not loaded. Please try again.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Customer Site Survey (Solar)', 105, 20, { align: 'center' });

        // Add content
        doc.setFontSize(10);
        let y = 35;

        const addSection = (title, fields) => {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(title, 14, y);
            y += 7;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            fields.forEach(([label, key]) => {
                const value = data[key] || 'N/A';
                doc.text(`${label}: ${value}`, 14, y);
                y += 5;
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
            });
            y += 5;
        };

        addSection('Customer Details', [
            ['Carried out by', 'ssCarriedOutBy'],
            ['Name', 'ssCustomerName'],
            ['Address', 'ssAddress'],
            ['Mobile', 'ssMobile'],
            ['Home', 'ssHome'],
            ['Post Code', 'ssPostCode'],
            ['What 3 Words', 'ssWhat3Words'],
            ['Email', 'ssEmail']
        ]);

        addSection('Property Details', [
            ['Conservation Area', 'ssConservationArea'],
            ['Terrain', 'ssTerrain'],
            ['Property Exposed', 'ssPropertyExposed'],
            ['Parking Available', 'ssParkingAvailable'],
            ['Parking Specification', 'ssParkingSpec'],
            ['Occupancy Type', 'ssOccupancyType'],
            ['kWh per annum', 'ssKwhPerAnnum'],
            ['DNO', 'ssDno']
        ]);

        addSection('Building', [
            ['Construction', 'ssConstruction'],
            ['Wall Thickness', 'ssWallThickness'],
            ['Internal Walk Construction', 'ssInternalWalkConstruction'],
            ['Building Type', 'ssBuildingType'],
            ['Protected Species', 'ssProtectedSpecies'],
            ['Nests', 'ssNests'],
            ['Nest/Species Type', 'ssNestSpec']
        ]);

        addSection('Roof Aspect 1', [
            ['Covering Type', 'ssRoof1CoveringType'],
            ['Slope Length', 'ssRoof1SlopeLength'],
            ['Orientation from S', 'ssRoof1OrientationFromS'],
            ['Width at Gutter', 'ssRoof1WidthAtGutter'],
            ['Width at Ridge', 'ssRoof1WidthAtRidge'],
            ['Inclination', 'ssRoof1Inclination'],
            ['Rafter Width', 'ssRoof1RafterWidth'],
            ['Rafter Depth', 'ssRoof1RafterDepth'],
            ['Centre Spacings', 'ssRoof1CentreSpacings'],
            ['Gutter Height', 'ssRoof1GutterHeight'],
            ['Under Warranty', 'ssRoof1UnderWarranty'],
            ['Shading Present', 'ssRoof1ShadingPresent']
        ]);

        addSection('Roof Aspect 2', [
            ['Covering Type', 'ssRoof2CoveringType'],
            ['Slope Length', 'ssRoof2SlopeLength'],
            ['Orientation from S', 'ssRoof2OrientationFromS'],
            ['Width at Gutter', 'ssRoof2WidthAtGutter'],
            ['Width at Ridge', 'ssRoof2WidthAtRidge'],
            ['Inclination', 'ssRoof2Inclination'],
            ['Rafter Width', 'ssRoof2RafterWidth'],
            ['Rafter Depth', 'ssRoof2RafterDepth'],
            ['Centre Spacings', 'ssRoof2CentreSpacings'],
            ['Gutter Height', 'ssRoof2GutterHeight'],
            ['Under Warranty', 'ssRoof2UnderWarranty'],
            ['Shading Present', 'ssRoof2ShadingPresent']
        ]);

        addSection('Electrical', [
            ['Fuseboard Location', 'ssFuseboardLocation'],
            ['Meter Location', 'ssMeterLocation'],
            ['Electrical Condition', 'ssElectricalCondition'],
            ['Number of Phases', 'ssNumberOfPhases'],
            ['Main Fuse Size', 'ssMainFuseSize'],
            ['Earthing System', 'ssEarthingSystem'],
            ['Maximum Demand', 'ssMaximumDemand'],
            ['Looped Supply', 'ssLoopedSupply'],
            ['L-N Loop Impedance', 'ssLoopImpedance'],
            ['Space for new CU', 'ssSpaceForNewCU'],
            ['Underfloor Access', 'ssUnderfloorAccess'],
            ['Cable Route', 'ssCableRoute'],
            ['Floor Coverings', 'ssFloorCoverings'],
            ['Inverter Location', 'ssInverterLocation'],
            ['Interior/Exterior', 'ssInverterInteriorExterior'],
            ['WiFi Available', 'ssWifiAvailable'],
            ['Mounting Surface', 'ssMountingSurface'],
            ['Loft Floored', 'ssLoftFloored'],
            ['Loft Light', 'ssLoftLight'],
            ['Loft Ladder', 'ssLoftLadder'],
            ['Water Heating', 'ssWaterHeating'],
            ['Smoke Alarms', 'ssSmokeAlarms'],
            ['Smoke Alarm Brand', 'ssSmokeAlarmBrand'],
            ['Smoke Alarm Type', 'ssSmokeAlarmType'],
            ['Hardwired/Wireless', 'ssSmokeAlarmWired']
        ]);

        addSection('Notes', [
            ['Notes', 'ssSurveyNotes']
        ]);

        // Generate filename
        const customerName = data.ssCustomerName || 'Unknown';
        const date = new Date().toISOString().split('T')[0];
        const filename = `Site_Survey_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.pdf`;

        doc.save(filename);
    }

    exportSiteSurveyToCSV() {
        const data = this.collectSiteSurveyData();

        // Create CSV content
        const headers = Object.keys(data);
        const values = Object.values(data).map(v => `"${(v || '').toString().replace(/"/g, '""')}"`);

        const csvContent = headers.join(',') + '\n' + values.join(',');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const customerName = data.ssCustomerName || 'Unknown';
        const date = new Date().toISOString().split('T')[0];
        link.download = `Site_Survey_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.csv`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }
}

// Export singleton instance
export const formSwitcher = new FormSwitcher();
