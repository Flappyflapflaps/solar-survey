// Solar Site Survey Form - Main JavaScript

(function() {
    'use strict';

    // Form state
    let roofAspectCount = 0;
    let autoSaveTimer = null;
    let fileData = {
        floorplan: null,
        roofPlan: null,
        additionalPhotos: []
    };

    // Initialize form
    document.addEventListener('DOMContentLoaded', function() {
        initializeForm();
        setupEventListeners();
        loadSavedData();
        updateProgress();
    });

    // Initialize form components
    function initializeForm() {
        // Add first roof aspect
        addRoofAspect();
        
        // Setup navigation
        setupNavigation();
        
        // Setup conditional fields
        setupConditionalFields();
        
        // Setup file uploads
        setupFileUploads();
        
        // Setup button groups
        setupButtonGroups();
    }

    // Setup event listeners
    function setupEventListeners() {
        const form = document.getElementById('surveyForm');
        
        // Auto-save on input
        form.addEventListener('input', debounce(autoSave, 2000));
        form.addEventListener('change', debounce(autoSave, 2000));
        
        // Export buttons
        document.getElementById('exportBtn').addEventListener('click', exportToExcel);
        document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
        document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
        document.getElementById('clearBtn').addEventListener('click', clearForm);
        
        // Add roof aspect button
        document.getElementById('addRoofAspect').addEventListener('click', function() {
            addRoofAspect();
            autoSave();
        });
        
        // Navigation toggle
        document.getElementById('navToggle').addEventListener('click', toggleNavigation);
        
        // Smooth scroll for navigation links
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    toggleNavigation();
                }
            });
        });
    }

    // Setup navigation
    function setupNavigation() {
        // Highlight current section on scroll
        const sections = document.querySelectorAll('.form-section');
        const navItems = document.querySelectorAll('.nav-item');
        
        window.addEventListener('scroll', function() {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (window.pageYOffset >= sectionTop - 100) {
                    current = section.getAttribute('id');
                }
            });
            
            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href').substring(1) === current) {
                    item.classList.add('active');
                }
            });
        });
    }

    // Setup button groups for Yes/No/Notes buttons
    function setupButtonGroups(container) {
        const scope = container || document;
        const buttonGroups = scope.querySelectorAll('.button-group');
        
        buttonGroups.forEach(group => {
            const buttons = group.querySelectorAll('.btn-choice');
            buttons.forEach(button => {
                button.addEventListener('click', function() {
                    const fieldName = this.getAttribute('data-field');
                    const value = this.getAttribute('data-value');
                    const hiddenInput = document.getElementById(fieldName);
                    const notesField = document.getElementById(fieldName + 'Notes');
                    
                    // Update hidden input value
                    if (hiddenInput) {
                        hiddenInput.value = value;
                    }
                    
                    // Toggle active state on buttons
                    buttons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Show/hide notes field
                    if (notesField) {
                        if (value === 'Notes') {
                            notesField.style.display = 'block';
                            const textarea = notesField.querySelector('textarea');
                            if (textarea) {
                                textarea.focus();
                                // Add event listeners for notes textarea
                                textarea.addEventListener('input', debounce(autoSave, 2000));
                                textarea.addEventListener('change', debounce(autoSave, 2000));
                            }
                        } else {
                            notesField.style.display = 'none';
                            const textarea = notesField.querySelector('textarea');
                            if (textarea) {
                                textarea.value = '';
                            }
                        }
                    }
                    
                    // Trigger auto-save
                    autoSave();
                });
            });
        });
    }

    // Setup conditional fields
    function setupConditionalFields() {
        // Terrain specification
        const terrain = document.getElementById('terrain');
        const terrainSpecGroup = document.getElementById('terrainSpecGroup');
        terrain.addEventListener('change', function() {
            terrainSpecGroup.style.display = this.value === '' ? 'none' : 'block';
        });

        // Parking specification
        const parking = document.getElementById('parkingAvailable');
        const parkingSpecGroup = document.getElementById('parkingSpecGroup');
        parking.addEventListener('change', function() {
            parkingSpecGroup.style.display = this.value === 'N' ? 'block' : 'none';
        });

        // Construction specification
        const construction = document.getElementById('construction');
        const constructionSpecGroup = document.getElementById('constructionSpecGroup');
        construction.addEventListener('change', function() {
            constructionSpecGroup.style.display = this.value === 'Other' ? 'block' : 'none';
        });

        // Building type specification
        const buildingType = document.getElementById('buildingType');
        const buildingTypeSpecGroup = document.getElementById('buildingTypeSpecGroup');
        buildingType.addEventListener('change', function() {
            buildingTypeSpecGroup.style.display = this.value === 'Other' ? 'block' : 'none';
        });

        // Nest specification
        const nests = document.getElementById('nests');
        const nestSpecGroup = document.getElementById('nestSpecGroup');
        nests.addEventListener('change', function() {
            nestSpecGroup.style.display = this.value === 'Y' ? 'block' : 'none';
        });

        // Floor coverings specification
        const floorCoverings = document.getElementById('floorCoverings');
        const floorCoveringsSpecGroup = document.getElementById('floorCoveringsSpecGroup');
        floorCoverings.addEventListener('change', function() {
            floorCoveringsSpecGroup.style.display = this.value === 'Other' ? 'block' : 'none';
        });

        // Water heating specification
        const waterHeating = document.getElementById('waterHeating');
        const waterHeatingSpecGroup = document.getElementById('waterHeatingSpecGroup');
        waterHeating.addEventListener('change', function() {
            waterHeatingSpecGroup.style.display = this.value === 'Other' ? 'block' : 'none';
        });

        // DNO specification
        const dno = document.getElementById('dno');
        const dnoSpecGroup = document.getElementById('dnoSpecGroup');
        dno.addEventListener('change', function() {
            dnoSpecGroup.style.display = this.value === 'Other' ? 'block' : 'none';
        });
    }

    // Setup file uploads
    function setupFileUploads() {
        // Floorplan
        document.getElementById('floorplan').addEventListener('change', function(e) {
            handleFileUpload(e, 'floorplan', 'floorplanPreview');
        });

        // Roof plan
        document.getElementById('roofPlan').addEventListener('change', function(e) {
            handleFileUpload(e, 'roofPlan', 'roofPlanPreview');
        });

        // Additional photos
        document.getElementById('additionalPhotos').addEventListener('change', function(e) {
            handleMultipleFileUpload(e, 'additionalPhotos', 'additionalPhotosPreview');
        });
    }

    // Handle single file upload
    function handleFileUpload(event, fileKey, previewId) {
        const file = event.target.files[0];
        if (file) {
            fileData[fileKey] = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById(previewId);
                if (file.type.startsWith('image/')) {
                    preview.innerHTML = `
                        <div class="file-preview-item">
                            <img src="${e.target.result}" alt="${file.name}">
                            <button type="button" class="remove-file" onclick="removeFile('${fileKey}', '${previewId}')">×</button>
                        </div>
                    `;
                } else {
                    preview.innerHTML = `
                        <div class="file-preview-item">
                            <span>${file.name}</span>
                            <button type="button" class="remove-file" onclick="removeFile('${fileKey}', '${previewId}')">×</button>
                        </div>
                    `;
                }
            };
            reader.readAsDataURL(file);
            autoSave();
        }
    }

    // Handle multiple file upload
    function handleMultipleFileUpload(event, fileKey, previewId) {
        const files = Array.from(event.target.files);
        fileData[fileKey] = files;
        const preview = document.getElementById(previewId);
        preview.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                if (file.type.startsWith('image/')) {
                    preview.innerHTML += `
                        <div class="file-preview-item">
                            <img src="${e.target.result}" alt="${file.name}">
                            <button type="button" class="remove-file" onclick="removeFileFromArray('${fileKey}', ${index}, '${previewId}')">×</button>
                        </div>
                    `;
                }
            };
            reader.readAsDataURL(file);
        });
        autoSave();
    }

    // Remove file (exposed to global scope for onclick)
    window.removeFile = function(fileKey, previewId) {
        fileData[fileKey] = null;
        document.getElementById(previewId).innerHTML = '';
        document.getElementById(fileKey).value = '';
        autoSave();
    };

    // Remove file from array
    window.removeFileFromArray = function(fileKey, index, previewId) {
        fileData[fileKey].splice(index, 1);
        const preview = document.getElementById(previewId);
        preview.innerHTML = '';
        
        fileData[fileKey].forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                if (file.type.startsWith('image/')) {
                    preview.innerHTML += `
                        <div class="file-preview-item">
                            <img src="${e.target.result}" alt="${file.name}">
                            <button type="button" class="remove-file" onclick="removeFileFromArray('${fileKey}', ${i}, '${previewId}')">×</button>
                        </div>
                    `;
                }
            };
            reader.readAsDataURL(file);
        });
        autoSave();
    };

    // Add roof aspect
    function addRoofAspect() {
        roofAspectCount++;
        const container = document.getElementById('roofAspectsContainer');
        const aspectDiv = document.createElement('div');
        aspectDiv.className = 'roof-aspect';
        aspectDiv.id = `roofAspect${roofAspectCount}`;
        
        aspectDiv.innerHTML = `
            <div class="roof-aspect-header">
                <h3>Roof Aspect ${roofAspectCount}</h3>
                ${roofAspectCount > 1 ? '<button type="button" class="btn-remove-roof" onclick="removeRoofAspect(' + roofAspectCount + ')">Remove</button>' : ''}
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="roof${roofAspectCount}_coveringType">Covering Type:</label>
                    <input type="text" id="roof${roofAspectCount}_coveringType" name="roof${roofAspectCount}_coveringType" placeholder="Covering type">
                </div>
                <div class="form-group">
                    <label for="roof${roofAspectCount}_slopeLength">Slope length:</label>
                    <input type="text" id="roof${roofAspectCount}_slopeLength" name="roof${roofAspectCount}_slopeLength" placeholder="Length">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="roof${roofAspectCount}_orientation">Orientation from S:</label>
                    <input type="text" id="roof${roofAspectCount}_orientation" name="roof${roofAspectCount}_orientation" placeholder="Orientation">
                </div>
                <div class="form-group">
                    <label for="roof${roofAspectCount}_widthGutter">Width at Gutter:</label>
                    <input type="text" id="roof${roofAspectCount}_widthGutter" name="roof${roofAspectCount}_widthGutter" placeholder="Width">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="roof${roofAspectCount}_widthRidge">Width at Ridge:</label>
                    <input type="text" id="roof${roofAspectCount}_widthRidge" name="roof${roofAspectCount}_widthRidge" placeholder="Width">
                </div>
                <div class="form-group">
                    <label for="roof${roofAspectCount}_inclination">Inclination:</label>
                    <input type="text" id="roof${roofAspectCount}_inclination" name="roof${roofAspectCount}_inclination" placeholder="Inclination">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="roof${roofAspectCount}_rafterWidth">Rafter Width:</label>
                    <input type="text" id="roof${roofAspectCount}_rafterWidth" name="roof${roofAspectCount}_rafterWidth" placeholder="Width">
                </div>
                <div class="form-group">
                    <label for="roof${roofAspectCount}_rafterDepth">Rafter Depth:</label>
                    <input type="text" id="roof${roofAspectCount}_rafterDepth" name="roof${roofAspectCount}_rafterDepth" placeholder="Depth">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="roof${roofAspectCount}_centreSpacings">Centre spacings:</label>
                    <input type="text" id="roof${roofAspectCount}_centreSpacings" name="roof${roofAspectCount}_centreSpacings" placeholder="Spacings">
                </div>
                <div class="form-group">
                    <label for="roof${roofAspectCount}_gutterHeight">Gutter height:</label>
                    <input type="text" id="roof${roofAspectCount}_gutterHeight" name="roof${roofAspectCount}_gutterHeight" placeholder="Height">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="roof${roofAspectCount}_warranty">Is roof under warranty:</label>
                    <div class="button-group">
                        <button type="button" class="btn-choice" data-field="roof${roofAspectCount}_warranty" data-value="Y">Yes</button>
                        <button type="button" class="btn-choice" data-field="roof${roofAspectCount}_warranty" data-value="N">No</button>
                        <button type="button" class="btn-choice btn-notes" data-field="roof${roofAspectCount}_warranty" data-value="Notes">Notes</button>
                    </div>
                    <input type="hidden" id="roof${roofAspectCount}_warranty" name="roof${roofAspectCount}_warranty" value="">
                    <div class="notes-field" id="roof${roofAspectCount}_warrantyNotes" style="display: none;">
                        <textarea name="roof${roofAspectCount}_warrantyNotes" placeholder="Add notes..."></textarea>
                    </div>
                </div>
                <div class="form-group">
                    <label for="roof${roofAspectCount}_shading">Shading Present:</label>
                    <div class="button-group">
                        <button type="button" class="btn-choice" data-field="roof${roofAspectCount}_shading" data-value="Y">Yes</button>
                        <button type="button" class="btn-choice" data-field="roof${roofAspectCount}_shading" data-value="N">No</button>
                        <button type="button" class="btn-choice btn-notes" data-field="roof${roofAspectCount}_shading" data-value="Notes">Notes</button>
                    </div>
                    <input type="hidden" id="roof${roofAspectCount}_shading" name="roof${roofAspectCount}_shading" value="">
                    <div class="notes-field" id="roof${roofAspectCount}_shadingNotes" style="display: none;">
                        <textarea name="roof${roofAspectCount}_shadingNotes" placeholder="Add notes..."></textarea>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(aspectDiv);
        
        // Add event listeners for new fields
        const inputs = aspectDiv.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', debounce(autoSave, 2000));
            input.addEventListener('change', debounce(autoSave, 2000));
        });
        
        // Setup button group handlers for new roof aspect
        setupButtonGroups(aspectDiv);
    }

    // Remove roof aspect
    window.removeRoofAspect = function(id) {
        const aspect = document.getElementById(`roofAspect${id}`);
        if (aspect) {
            aspect.remove();
            autoSave();
            updateProgress();
        }
    };

    // Toggle navigation
    function toggleNavigation() {
        const navItems = document.getElementById('navItems');
        navItems.classList.toggle('active');
    }

    // Auto-save to localStorage
    function autoSave() {
        const formData = new FormData(document.getElementById('surveyForm'));
        const data = {};
        
        // Collect all form data
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Collect roof aspect data
        for (let i = 1; i <= roofAspectCount; i++) {
            const aspect = document.getElementById(`roofAspect${i}`);
            if (aspect) {
                const aspectInputs = aspect.querySelectorAll('input, select, textarea');
                aspectInputs.forEach(input => {
                    if (input.name) {
                        data[input.name] = input.value;
                    }
                });
            }
        }
        
        // Save to localStorage
        localStorage.setItem('solarSurveyData', JSON.stringify(data));
        localStorage.setItem('solarSurveyRoofCount', roofAspectCount.toString());
        
        // Show save indicator
        showSaveIndicator();
        
        // Update progress
        updateProgress();
    }

    // Show save indicator
    function showSaveIndicator() {
        const indicator = document.getElementById('saveIndicator');
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    // Load saved data
    function loadSavedData() {
        const savedData = localStorage.getItem('solarSurveyData');
        const savedRoofCount = localStorage.getItem('solarSurveyRoofCount');
        
        if (savedData) {
            const data = JSON.parse(savedData);
            
            // Populate form fields
            Object.keys(data).forEach(key => {
                const field = document.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = data[key];
                    
                    // If it's a hidden input for button groups, restore button state
                    if (field.type === 'hidden' && field.value) {
                        const button = document.querySelector(`[data-field="${key}"][data-value="${field.value}"]`);
                        if (button) {
                            button.classList.add('active');
                            
                            // Show notes field if Notes was selected
                            if (field.value === 'Notes') {
                                const notesField = document.getElementById(key + 'Notes');
                                if (notesField) {
                                    notesField.style.display = 'block';
                                }
                            }
                        }
                    }
                }
            });
            
            // Trigger conditional fields
            document.querySelectorAll('select').forEach(select => {
                if (select.value) {
                    select.dispatchEvent(new Event('change'));
                }
            });
        }
        
        if (savedRoofCount && parseInt(savedRoofCount) > 1) {
            const count = parseInt(savedRoofCount);
            for (let i = 2; i <= count; i++) {
                addRoofAspect();
            }
            
            // Load roof aspect data
            if (savedData) {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    if (key.startsWith('roof')) {
                        const field = document.querySelector(`[name="${key}"]`);
                        if (field) {
                            field.value = data[key];
                            
                            // Restore button state for roof aspects
                            if (field.type === 'hidden' && field.value) {
                                const button = document.querySelector(`[data-field="${key}"][data-value="${field.value}"]`);
                                if (button) {
                                    button.classList.add('active');
                                    
                                    if (field.value === 'Notes') {
                                        const notesField = document.getElementById(key + 'Notes');
                                        if (notesField) {
                                            notesField.style.display = 'block';
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
        
        updateProgress();
    }

    // Update progress
    function updateProgress() {
        const form = document.getElementById('surveyForm');
        const inputs = form.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input[type="number"], select, textarea');
        let filled = 0;
        let total = 0;
        
        inputs.forEach(input => {
            if (input.name && !input.name.includes('_file') && input.type !== 'hidden') {
                total++;
                if (input.value && input.value.trim() !== '') {
                    filled++;
                }
            }
        });
        
        // Count roof aspect fields
        for (let i = 1; i <= roofAspectCount; i++) {
            const aspect = document.getElementById(`roofAspect${i}`);
            if (aspect) {
                const aspectInputs = aspect.querySelectorAll('input, select, textarea');
                aspectInputs.forEach(input => {
                    if (input.name && input.type !== 'hidden') {
                        total++;
                        if (input.value && input.value.trim() !== '') {
                            filled++;
                        }
                    }
                });
            }
        }
        
        const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
        document.getElementById('progressFill').style.width = percentage + '%';
        document.getElementById('progressText').textContent = percentage + '%';
    }

    // Export to Excel
    function exportToExcel() {
        const formData = collectFormData();
        const wb = XLSX.utils.book_new();
        const ws = {};
        
        let row = 1;
        
        // Helper function to set cell value
        const setCell = (r, c, val) => {
            const cellRef = XLSX.utils.encode_cell({r: r-1, c: c-1});
            ws[cellRef] = {v: val, t: typeof val === 'number' ? 'n' : 's'};
        };
        
        // Title
        setCell(row, 1, 'Customer Site Survey (Solar)');
        row += 2;
        
        // Carried out by
        setCell(row, 1, 'Carried out by:');
        setCell(row, 3, formData.carriedOutBy || '');
        row += 2;
        
        // Contact Information
        setCell(row, 1, 'Name:');
        setCell(row, 2, formData.customerName || '');
        setCell(row, 3, 'Address:');
        setCell(row, 4, formData.address || '');
        row++;
        
        setCell(row, 1, 'Mobile:');
        setCell(row, 2, formData.mobile || '');
        row++;
        
        setCell(row, 1, 'Post Code:');
        setCell(row, 2, formData.postCode || '');
        row++;
        
        setCell(row, 1, 'Home:');
        setCell(row, 2, formData.home || '');
        setCell(row, 3, 'What 3 Words:');
        setCell(row, 4, formData.what3words || '');
        row++;
        
        setCell(row, 1, 'Email:');
        setCell(row, 2, formData.email || '');
        row += 2;
        
        // Property Details
        setCell(row, 1, 'Property Details');
        row += 2;
        
        setCell(row, 1, 'Conservation Area:');
        setCell(row, 2, formData.conservationArea || '');
        if (formData.conservationAreaNotes) {
            setCell(row, 3, 'Notes: ' + formData.conservationAreaNotes);
        }
        setCell(row, 4, 'Terrain:');
        setCell(row, 5, formData.terrain || '');
        setCell(row, 6, formData.terrainSpec || '');
        row += 2;
        
        setCell(row, 1, 'Property exposed:');
        setCell(row, 2, formData.propertyExposed || '');
        if (formData.propertyExposedNotes) {
            setCell(row, 3, 'Notes: ' + formData.propertyExposedNotes);
        }
        setCell(row, 4, 'Parking Available:');
        setCell(row, 5, formData.parkingAvailable || '');
        if (formData.parkingAvailableNotes) {
            setCell(row, 6, 'Notes: ' + formData.parkingAvailableNotes);
        }
        if (formData.parkingAvailable === 'N' && formData.parkingSpec) {
            row++;
            setCell(row, 1, 'Parking Details:');
            setCell(row, 2, formData.parkingSpec || '');
        }
        row += 2;
        
        setCell(row, 1, 'Occupancy type:');
        setCell(row, 2, formData.occupancyType || '');
        setCell(row, 3, 'kWh per annum:');
        setCell(row, 4, formData.kwhPerAnnum || '');
        row++;
        setCell(row, 1, 'DNO:');
        setCell(row, 2, formData.dno || '');
        if (formData.dnoSpec) {
            setCell(row, 3, formData.dnoSpec);
        }
        row += 3;
        
        // Building
        setCell(row, 1, 'Building');
        row += 2;
        
        setCell(row, 1, 'Construction:');
        setCell(row, 2, formData.construction || '');
        setCell(row, 3, formData.constructionSpec || '');
        row += 2;
        
        setCell(row, 1, 'Thickness of wall:');
        setCell(row, 2, formData.wallThickness || '');
        setCell(row, 3, 'Internal walk construction:');
        setCell(row, 4, formData.internalWalk || '');
        row += 2;
        
        setCell(row, 1, 'Type of Building:');
        setCell(row, 2, formData.buildingType || '');
        setCell(row, 3, formData.buildingTypeSpec || '');
        row += 2;
        
        setCell(row, 1, 'Protected species:');
        setCell(row, 2, formData.protectedSpecies || '');
        if (formData.protectedSpeciesNotes) {
            setCell(row, 3, 'Notes: ' + formData.protectedSpeciesNotes);
        }
        setCell(row, 4, 'Nests:');
        setCell(row, 5, formData.nests || '');
        if (formData.nestsNotes) {
            setCell(row, 6, 'Notes: ' + formData.nestsNotes);
        }
        if (formData.nests === 'Y' && formData.nestSpec) {
            row++;
            setCell(row, 1, 'Nest Details:');
            setCell(row, 2, formData.nestSpec || '');
        }
        row += 3;
        
        // Roof Aspects
        for (let i = 1; i <= roofAspectCount; i++) {
            setCell(row, 1, `Roof Aspect ${i} [roof drawing(s) to be completed]`);
            row += 2;
            
            setCell(row, 1, 'Covering Type:');
            setCell(row, 2, formData[`roof${i}_coveringType`] || '');
            setCell(row, 3, 'Slope length:');
            setCell(row, 4, formData[`roof${i}_slopeLength`] || '');
            setCell(row, 5, 'Orientation from S:');
            setCell(row, 6, formData[`roof${i}_orientation`] || '');
            row += 2;
            
            setCell(row, 1, 'Width at Gutter:');
            setCell(row, 2, formData[`roof${i}_widthGutter`] || '');
            setCell(row, 3, 'Width at Ridge:');
            setCell(row, 4, formData[`roof${i}_widthRidge`] || '');
            setCell(row, 5, 'Inclination:');
            setCell(row, 6, formData[`roof${i}_inclination`] || '');
            row += 2;
            
            setCell(row, 1, 'Rafter Width:');
            setCell(row, 2, formData[`roof${i}_rafterWidth`] || '');
            setCell(row, 3, 'Rafter Depth:');
            setCell(row, 4, formData[`roof${i}_rafterDepth`] || '');
            setCell(row, 5, 'Centre spacings:');
            setCell(row, 6, formData[`roof${i}_centreSpacings`] || '');
            row += 2;
            
            setCell(row, 1, 'Gutter height:');
            setCell(row, 2, formData[`roof${i}_gutterHeight`] || '');
            setCell(row, 3, 'Is roof under warranty:');
            setCell(row, 4, formData[`roof${i}_warranty`] || '');
            if (formData[`roof${i}_warrantyNotes`]) {
                setCell(row, 5, 'Notes: ' + formData[`roof${i}_warrantyNotes`]);
            }
            setCell(row, 6, 'Shading Present:');
            setCell(row, 7, formData[`roof${i}_shading`] || '');
            if (formData[`roof${i}_shadingNotes`]) {
                row++;
                setCell(row, 1, 'Shading Notes:');
                setCell(row, 2, formData[`roof${i}_shadingNotes`] || '');
            }
            row += 3;
        }
        
        if (roofAspectCount > 1) {
            setCell(row, 1, 'For additional aspects note on reverse');
            row += 3;
        }
        
        // Electrical
        setCell(row, 1, 'Electrical [Floor plan(s) to be completed]');
        row += 2;
        
        setCell(row, 1, 'Fuseboard Location:');
        setCell(row, 2, formData.fuseboardLocation || '');
        setCell(row, 3, 'Meter Location :');
        setCell(row, 4, formData.meterLocation || '');
        row += 2;
        
        setCell(row, 1, 'Condition of Electrical installation:');
        setCell(row, 2, formData.electricalCondition || '');
        setCell(row, 3, 'Number of Phases:');
        setCell(row, 4, formData.phases || '');
        row += 2;
        
        setCell(row, 1, 'Main Fuse Size:');
        setCell(row, 2, formData.mainFuseSize || '');
        setCell(row, 3, 'Earthing System:');
        setCell(row, 4, formData.earthingSystem || '');
        setCell(row, 5, 'Maximum Demand:');
        setCell(row, 6, formData.maximumDemand || '');
        row += 2;
        
        setCell(row, 1, 'Looped Supply:');
        setCell(row, 2, formData.loopedSupply || '');
        if (formData.loopedSupplyNotes) {
            setCell(row, 3, 'Notes: ' + formData.loopedSupplyNotes);
        }
        setCell(row, 4, 'L-N Loop impedance:');
        setCell(row, 5, formData.loopImpedance || '');
        setCell(row, 6, 'MUST BE PHOTOGRAPHED');
        row += 2;
        
        setCell(row, 1, 'Space for new CU:');
        setCell(row, 2, formData.spaceForCU || '');
        if (formData.spaceForCUNotes) {
            setCell(row, 3, 'Notes: ' + formData.spaceForCUNotes);
        }
        setCell(row, 4, 'Underfloor Access:');
        setCell(row, 5, formData.underfloorAccess || '');
        if (formData.underfloorAccessNotes) {
            setCell(row, 6, 'Notes: ' + formData.underfloorAccessNotes);
        }
        row++;
        setCell(row, 1, 'Cable route:');
        setCell(row, 2, formData.cableRoute || '');
        row += 2;
        
        setCell(row, 1, 'Floor Coverings:');
        setCell(row, 2, formData.floorCoverings || '');
        setCell(row, 3, formData.floorCoveringsSpec || '');
        row += 2;
        
        setCell(row, 1, 'Inverter Location:');
        setCell(row, 2, formData.inverterLocation || '');
        setCell(row, 3, 'Interior/Exterior:');
        setCell(row, 4, formData.inverterInteriorExterior || '');
        row += 2;
        
        setCell(row, 1, 'WiFi Available:');
        setCell(row, 2, formData.wifiAvailable || '');
        if (formData.wifiAvailableNotes) {
            setCell(row, 3, 'Notes: ' + formData.wifiAvailableNotes);
        }
        setCell(row, 4, 'Mounting Surface:');
        setCell(row, 5, formData.mountingSurface || '');
        row += 2;
        
        setCell(row, 1, 'Loft Floored:');
        setCell(row, 2, formData.loftFloored || '');
        if (formData.loftFlooredNotes) {
            setCell(row, 3, 'Notes: ' + formData.loftFlooredNotes);
        }
        setCell(row, 4, 'Loft Light:');
        setCell(row, 5, formData.loftLight || '');
        if (formData.loftLightNotes) {
            setCell(row, 6, 'Notes: ' + formData.loftLightNotes);
        }
        row++;
        setCell(row, 1, 'Loft Ladder:');
        setCell(row, 2, formData.loftLadder || '');
        if (formData.loftLadderNotes) {
            setCell(row, 3, 'Notes: ' + formData.loftLadderNotes);
        }
        row += 2;
        
        setCell(row, 1, 'Water Heating method:');
        setCell(row, 2, formData.waterHeating || '');
        setCell(row, 3, formData.waterHeatingSpec || '');
        row += 2;
        
        setCell(row, 1, 'Interlinked Smoke Alarms:');
        setCell(row, 2, formData.smokeAlarms || '');
        if (formData.smokeAlarmsNotes) {
            setCell(row, 3, 'Notes: ' + formData.smokeAlarmsNotes);
        }
        setCell(row, 4, 'Brand:');
        setCell(row, 5, formData.smokeAlarmBrand || '');
        setCell(row, 6, 'Type:');
        setCell(row, 7, formData.smokeAlarmType || '');
        setCell(row, 8, formData.smokeAlarmHardwired || '');
        
        // Set column widths
        ws['!cols'] = [
            {wch: 25}, {wch: 20}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 20}
        ];
        
        // Set worksheet range
        ws['!ref'] = XLSX.utils.encode_range({s: {r: 0, c: 0}, e: {r: row-1, c: 7}});
        
        XLSX.utils.book_append_sheet(wb, ws, 'Site Survey');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `Solar_Site_Survey_${timestamp}.xlsx`;
        
        XLSX.writeFile(wb, filename);
    }

    // Export to CSV
    function exportToCSV() {
        const formData = collectFormData();
        const headers = Object.keys(formData);
        const values = Object.values(formData);
        
        // Create CSV content
        let csv = headers.join(',') + '\n';
        csv += values.map(v => {
            if (v === null || v === undefined) return '';
            const str = String(v);
            // Escape commas and quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(',') + '\n';
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.setAttribute('download', `Solar_Site_Survey_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Export to PDF
    function exportToPDF() {
        const { jsPDF } = window.jspdf;
        const formData = collectFormData();
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - (margin * 2);
        let yPos = margin;
        const lineHeight = 7;
        const sectionSpacing = 10;

        // Helper function to add text with word wrap
        function addText(text, x, y, options = {}) {
            const fontSize = options.fontSize || 10;
            const fontStyle = options.fontStyle || 'normal';
            const color = options.color || [0, 0, 0];
            const maxWidth = options.maxWidth || (pageWidth - x - margin);
            
            doc.setFontSize(fontSize);
            doc.setFont(undefined, fontStyle);
            doc.setTextColor(color[0], color[1], color[2]);
            
            const lines = doc.splitTextToSize(text || '', maxWidth);
            doc.text(lines, x, y);
            return lines.length * (fontSize * 0.4) + 2;
        }

        // Helper function to check if new page needed
        function checkNewPage(requiredSpace) {
            if (yPos + requiredSpace > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
                return true;
            }
            return false;
        }

        // Helper function to add section header
        function addSectionHeader(title) {
            checkNewPage(15);
            yPos += 5;
            const headerHeight = addText(title, margin, yPos, {
                fontSize: 14,
                fontStyle: 'bold',
                color: [44, 62, 80]
            });
            yPos += headerHeight + 3;
            // Draw line under header
            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(0.5);
            doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
            yPos += 3;
        }

        // Helper function to add key-value pair
        function addKeyValue(key, value, x = margin, width = maxWidth / 2 - 5) {
            if (!value || value.trim() === '') return 0;
            checkNewPage(10);
            const keyHeight = addText(key + ':', x, yPos, {
                fontSize: 9,
                fontStyle: 'bold',
                maxWidth: width
            });
            const valueHeight = addText(value, x + 5, yPos + keyHeight, {
                fontSize: 10,
                maxWidth: width - 5
            });
            return Math.max(keyHeight, valueHeight) + 2;
        }

        // Header
        checkNewPage(20);
        yPos += 5;
        addText('Customer Site Survey (Solar)', margin, yPos, {
            fontSize: 18,
            fontStyle: 'bold',
            color: [44, 62, 80]
        });
        yPos += 8;
        const surveyDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        addText('Survey Date: ' + surveyDate, margin, yPos, {
            fontSize: 10,
            color: [100, 100, 100]
        });
        yPos += sectionSpacing + 5;

        // Surveyor Information Section
        addSectionHeader('Surveyor Information');
        
        if (formData.carriedOutBy) {
            yPos += addKeyValue('Carried out by', formData.carriedOutBy, margin, maxWidth);
        }
        yPos += 3;

        // Contact information in two columns
        let leftCol = margin;
        let rightCol = margin + maxWidth / 2 + 5;
        let currentY = yPos;

        if (formData.customerName) {
            const height = addKeyValue('Name', formData.customerName, leftCol, maxWidth / 2 - 5);
            currentY = Math.max(currentY, yPos + height);
        }
        if (formData.address) {
            const height = addKeyValue('Address', formData.address, rightCol, maxWidth / 2 - 5);
            currentY = Math.max(currentY, yPos + height);
        }
        yPos = currentY + 3;

        if (formData.mobile) {
            yPos += addKeyValue('Mobile', formData.mobile, leftCol, maxWidth / 2 - 5);
        }
        if (formData.postCode) {
            yPos += addKeyValue('Post Code', formData.postCode, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.home) {
            yPos += addKeyValue('Home', formData.home, leftCol, maxWidth / 2 - 5);
        }
        if (formData.what3words) {
            yPos += addKeyValue('What 3 Words', formData.what3words, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.email) {
            yPos += addKeyValue('Email', formData.email, margin, maxWidth);
        }
        yPos += sectionSpacing;

        // Property Details Section
        addSectionHeader('Property Details');
        
        if (formData.conservationArea) {
            let conservationText = formData.conservationArea;
            if (formData.conservationAreaNotes) {
                conservationText += ' (Notes: ' + formData.conservationAreaNotes + ')';
            }
            yPos += addKeyValue('Conservation Area', conservationText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.terrain) {
            let terrainText = formData.terrain;
            if (formData.terrainSpec) {
                terrainText += ' - ' + formData.terrainSpec;
            }
            yPos += addKeyValue('Terrain', terrainText, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.propertyExposed) {
            let exposedText = formData.propertyExposed;
            if (formData.propertyExposedNotes) {
                exposedText += ' (Notes: ' + formData.propertyExposedNotes + ')';
            }
            yPos += addKeyValue('Property Exposed', exposedText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.parkingAvailable) {
            let parkingText = formData.parkingAvailable;
            if (formData.parkingAvailableNotes) {
                parkingText += ' (Notes: ' + formData.parkingAvailableNotes + ')';
            }
            yPos += addKeyValue('Parking Available', parkingText, rightCol, maxWidth / 2 - 5);
        }
        if (formData.parkingAvailable === 'N' && formData.parkingSpec) {
            yPos += 3;
            yPos += addKeyValue('Parking Details', formData.parkingSpec, margin, maxWidth);
        }
        yPos += 3;

        if (formData.occupancyType) {
            yPos += addKeyValue('Occupancy Type', formData.occupancyType, leftCol, maxWidth / 2 - 5);
        }
        if (formData.kwhPerAnnum) {
            yPos += addKeyValue('kWh per Annum', formData.kwhPerAnnum, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.dno) {
            let dnoText = formData.dno;
            if (formData.dnoSpec) {
                dnoText += ' - ' + formData.dnoSpec;
            }
            yPos += addKeyValue('DNO', dnoText, margin, maxWidth);
        }
        yPos += sectionSpacing;

        // Building Details Section
        addSectionHeader('Building Details');
        
        if (formData.construction) {
            let constructionText = formData.construction;
            if (formData.constructionSpec) {
                constructionText += ' - ' + formData.constructionSpec;
            }
            yPos += addKeyValue('Construction', constructionText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.wallThickness) {
            yPos += addKeyValue('Wall Thickness', formData.wallThickness, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.internalWalk) {
            yPos += addKeyValue('Internal Walk Construction', formData.internalWalk, leftCol, maxWidth / 2 - 5);
        }
        if (formData.buildingType) {
            let buildingText = formData.buildingType;
            if (formData.buildingTypeSpec) {
                buildingText += ' - ' + formData.buildingTypeSpec;
            }
            yPos += addKeyValue('Type of Building', buildingText, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.protectedSpecies) {
            let protectedText = formData.protectedSpecies;
            if (formData.protectedSpeciesNotes) {
                protectedText += ' (Notes: ' + formData.protectedSpeciesNotes + ')';
            }
            yPos += addKeyValue('Protected Species', protectedText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.nests) {
            let nestsText = formData.nests;
            if (formData.nestsNotes) {
                nestsText += ' (Notes: ' + formData.nestsNotes + ')';
            }
            yPos += addKeyValue('Nests', nestsText, rightCol, maxWidth / 2 - 5);
        }
        if (formData.nests === 'Y' && formData.nestSpec) {
            yPos += 3;
            yPos += addKeyValue('Nest Details', formData.nestSpec, margin, maxWidth);
        }
        yPos += sectionSpacing;

        // Roof Aspects Section
        addSectionHeader('Roof Aspects');
        
        for (let i = 1; i <= roofAspectCount; i++) {
            const aspect = document.getElementById(`roofAspect${i}`);
            if (!aspect) continue;

            checkNewPage(50);
            yPos += 3;
            addText(`Roof Aspect ${i}`, margin, yPos, {
                fontSize: 12,
                fontStyle: 'bold',
                color: [52, 152, 219]
            });
            yPos += 8;

            // Create table for roof aspect data
            const roofData = [];
            const fields = [
                { key: `roof${i}_coveringType`, label: 'Covering Type' },
                { key: `roof${i}_slopeLength`, label: 'Slope Length' },
                { key: `roof${i}_orientation`, label: 'Orientation from S' },
                { key: `roof${i}_widthGutter`, label: 'Width at Gutter' },
                { key: `roof${i}_widthRidge`, label: 'Width at Ridge' },
                { key: `roof${i}_inclination`, label: 'Inclination' },
                { key: `roof${i}_rafterWidth`, label: 'Rafter Width' },
                { key: `roof${i}_rafterDepth`, label: 'Rafter Depth' },
                { key: `roof${i}_centreSpacings`, label: 'Centre Spacings' },
                { key: `roof${i}_gutterHeight`, label: 'Gutter Height' }
            ];

            fields.forEach(field => {
                const value = formData[field.key] || 'N/A';
                roofData.push([field.label, value]);
            });

            // Add warranty and shading
            if (formData[`roof${i}_warranty`]) {
                let warrantyText = formData[`roof${i}_warranty`];
                if (formData[`roof${i}_warrantyNotes`]) {
                    warrantyText += ' (Notes: ' + formData[`roof${i}_warrantyNotes`] + ')';
                }
                roofData.push(['Is roof under warranty', warrantyText]);
            }
            if (formData[`roof${i}_shading`]) {
                let shadingText = formData[`roof${i}_shading`];
                if (formData[`roof${i}_shadingNotes`]) {
                    shadingText += ' (Notes: ' + formData[`roof${i}_shadingNotes`] + ')';
                }
                roofData.push(['Shading Present', shadingText]);
            }

            if (roofData.length > 0) {
                doc.autoTable({
                    startY: yPos,
                    head: [['Property', 'Value']],
                    body: roofData,
                    theme: 'striped',
                    headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 3 },
                    columnStyles: {
                        0: { cellWidth: 60, fontStyle: 'bold' },
                        1: { cellWidth: 'auto' }
                    },
                    margin: { left: margin, right: margin }
                });
                yPos = doc.lastAutoTable.finalY + 5;
            }

            yPos += 5;
        }

        if (roofAspectCount > 1) {
            checkNewPage(10);
            addText('Note: For additional aspects, see reverse or additional pages.', margin, yPos, {
                fontSize: 9,
                fontStyle: 'italic',
                color: [100, 100, 100]
            });
            yPos += sectionSpacing;
        }

        // Electrical Section
        addSectionHeader('Electrical');
        
        if (formData.fuseboardLocation) {
            yPos += addKeyValue('Fuseboard Location', formData.fuseboardLocation, leftCol, maxWidth / 2 - 5);
        }
        if (formData.meterLocation) {
            yPos += addKeyValue('Meter Location', formData.meterLocation, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.electricalCondition) {
            yPos += addKeyValue('Condition of Electrical Installation', formData.electricalCondition, leftCol, maxWidth / 2 - 5);
        }
        if (formData.phases) {
            yPos += addKeyValue('Number of Phases', formData.phases, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.mainFuseSize) {
            yPos += addKeyValue('Main Fuse Size', formData.mainFuseSize, leftCol, maxWidth / 2 - 5);
        }
        if (formData.earthingSystem) {
            yPos += addKeyValue('Earthing System', formData.earthingSystem, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.maximumDemand) {
            yPos += addKeyValue('Maximum Demand', formData.maximumDemand, margin, maxWidth);
        }
        yPos += 3;

        if (formData.loopedSupply) {
            let loopedText = formData.loopedSupply;
            if (formData.loopedSupplyNotes) {
                loopedText += ' (Notes: ' + formData.loopedSupplyNotes + ')';
            }
            yPos += addKeyValue('Looped Supply', loopedText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.loopImpedance) {
            yPos += addKeyValue('L-N Loop Impedance', formData.loopImpedance, rightCol, maxWidth / 2 - 5);
        }
        yPos += 5;

        addText('⚠️ MUST BE PHOTOGRAPHED', margin, yPos, {
            fontSize: 10,
            fontStyle: 'bold',
            color: [231, 76, 60]
        });
        yPos += 8;

        if (formData.spaceForCU) {
            let spaceText = formData.spaceForCU;
            if (formData.spaceForCUNotes) {
                spaceText += ' (Notes: ' + formData.spaceForCUNotes + ')';
            }
            yPos += addKeyValue('Space for new CU', spaceText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.underfloorAccess) {
            let accessText = formData.underfloorAccess;
            if (formData.underfloorAccessNotes) {
                accessText += ' (Notes: ' + formData.underfloorAccessNotes + ')';
            }
            yPos += addKeyValue('Underfloor Access', accessText, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.cableRoute) {
            yPos += addKeyValue('Cable Route', formData.cableRoute, leftCol, maxWidth / 2 - 5);
        }
        if (formData.floorCoverings) {
            let floorText = formData.floorCoverings;
            if (formData.floorCoveringsSpec) {
                floorText += ' - ' + formData.floorCoveringsSpec;
            }
            yPos += addKeyValue('Floor Coverings', floorText, rightCol, maxWidth / 2 - 5);
        }
        yPos += sectionSpacing;

        // Inverter & System Section
        addSectionHeader('Inverter & System Details');
        
        if (formData.inverterLocation) {
            yPos += addKeyValue('Inverter Location', formData.inverterLocation, leftCol, maxWidth / 2 - 5);
        }
        if (formData.inverterInteriorExterior) {
            yPos += addKeyValue('Interior/Exterior', formData.inverterInteriorExterior, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.wifiAvailable) {
            let wifiText = formData.wifiAvailable;
            if (formData.wifiAvailableNotes) {
                wifiText += ' (Notes: ' + formData.wifiAvailableNotes + ')';
            }
            yPos += addKeyValue('WiFi Available', wifiText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.mountingSurface) {
            yPos += addKeyValue('Mounting Surface', formData.mountingSurface, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.loftFloored) {
            let loftFlooredText = formData.loftFloored;
            if (formData.loftFlooredNotes) {
                loftFlooredText += ' (Notes: ' + formData.loftFlooredNotes + ')';
            }
            yPos += addKeyValue('Loft Floored', loftFlooredText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.loftLight) {
            let loftLightText = formData.loftLight;
            if (formData.loftLightNotes) {
                loftLightText += ' (Notes: ' + formData.loftLightNotes + ')';
            }
            yPos += addKeyValue('Loft Light', loftLightText, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.loftLadder) {
            let loftLadderText = formData.loftLadder;
            if (formData.loftLadderNotes) {
                loftLadderText += ' (Notes: ' + formData.loftLadderNotes + ')';
            }
            yPos += addKeyValue('Loft Ladder', loftLadderText, margin, maxWidth);
        }
        yPos += 3;

        if (formData.waterHeating) {
            let waterText = formData.waterHeating;
            if (formData.waterHeatingSpec) {
                waterText += ' - ' + formData.waterHeatingSpec;
            }
            yPos += addKeyValue('Water Heating Method', waterText, margin, maxWidth);
        }
        yPos += 3;

        if (formData.smokeAlarms) {
            let smokeText = formData.smokeAlarms;
            if (formData.smokeAlarmsNotes) {
                smokeText += ' (Notes: ' + formData.smokeAlarmsNotes + ')';
            }
            yPos += addKeyValue('Interlinked Smoke Alarms', smokeText, leftCol, maxWidth / 2 - 5);
        }
        if (formData.smokeAlarmBrand) {
            yPos += addKeyValue('Brand', formData.smokeAlarmBrand, rightCol, maxWidth / 2 - 5);
        }
        yPos += 3;

        if (formData.smokeAlarmType) {
            yPos += addKeyValue('Type', formData.smokeAlarmType, leftCol, maxWidth / 2 - 5);
        }
        if (formData.smokeAlarmHardwired) {
            yPos += addKeyValue('Hardwired / Wireless', formData.smokeAlarmHardwired, rightCol, maxWidth / 2 - 5);
        }
        yPos += sectionSpacing;

        // Notes Section
        addSectionHeader('Notes & Additional Information');
        
        if (formData.notes) {
            checkNewPage(30);
            yPos += addKeyValue('Additional Notes', formData.notes, margin, maxWidth);
            yPos += 5;
        }

        addText('Note: Floor plans, roof plans, and additional photos should be attached separately.', margin, yPos, {
            fontSize: 9,
            fontStyle: 'italic',
            color: [100, 100, 100]
        });

        // Save PDF
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        doc.save(`Solar_Site_Survey_${timestamp}.pdf`);
    }

    // Collect all form data
    function collectFormData() {
        const formData = new FormData(document.getElementById('surveyForm'));
        const data = {};
        
        // Collect all form fields
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
        
        return data;
    }

    // Clear form
    function clearForm() {
        if (confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
            document.getElementById('surveyForm').reset();
            localStorage.removeItem('solarSurveyData');
            localStorage.removeItem('solarSurveyRoofCount');
            
            // Remove all roof aspects except first
            while (roofAspectCount > 1) {
                const aspect = document.getElementById(`roofAspect${roofAspectCount}`);
                if (aspect) {
                    aspect.remove();
                }
                roofAspectCount--;
            }
            
            // Clear file previews
            document.getElementById('floorplanPreview').innerHTML = '';
            document.getElementById('roofPlanPreview').innerHTML = '';
            document.getElementById('additionalPhotosPreview').innerHTML = '';
            
            fileData = {
                floorplan: null,
                roofPlan: null,
                additionalPhotos: []
            };
            
            updateProgress();
            showSaveIndicator();
        }
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Update progress on input (throttled)
    const updateProgressThrottled = debounce(updateProgress, 500);
    document.getElementById('surveyForm').addEventListener('input', updateProgressThrottled);
    document.getElementById('surveyForm').addEventListener('change', updateProgressThrottled);

})();

