// PDF Export Service - Refactored with template system

import { formDataModel } from '../../models/formData.js';

class PDFExporter {
    constructor() {
        this.doc = null;
        this.pageWidth = 0;
        this.pageHeight = 0;
        this.margin = 15;
        this.maxWidth = 0;
        this.yPos = 0;
        this.lineHeight = 7;
        this.sectionSpacing = 10;
        this.leftCol = 0;
        this.rightCol = 0;
    }

    // Main export function
    export(formData, roofAspectCount) {
        if (typeof window.jspdf === 'undefined') {
            console.error('jsPDF library not loaded');
            return;
        }

        const { jsPDF } = window.jspdf;
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        this.pageWidth = this.doc.internal.pageSize.getWidth();
        this.pageHeight = this.doc.internal.pageSize.getHeight();
        this.maxWidth = this.pageWidth - (this.margin * 2);
        this.yPos = this.margin;
        this.leftCol = this.margin;
        this.rightCol = this.margin + this.maxWidth / 2 + 5;

        this.writeHeader();
        this.writeSurveyorInfo(formData);
        this.writePropertyDetails(formData);
        this.writeBuildingDetails(formData);
        this.writeRoofAspects(formData, roofAspectCount);
        this.writeElectrical(formData);
        this.writeInverterSystem(formData);
        this.writeNotes(formData);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        this.doc.save(`Solar_Site_Survey_${timestamp}.pdf`);
    }

    // Helper: Add text with word wrap
    addText(text, x, y, options = {}) {
        const fontSize = options.fontSize || 10;
        const fontStyle = options.fontStyle || 'normal';
        const color = options.color || [0, 0, 0];
        const maxWidth = options.maxWidth || (this.pageWidth - x - this.margin);
        
        this.doc.setFontSize(fontSize);
        this.doc.setFont(undefined, fontStyle);
        this.doc.setTextColor(color[0], color[1], color[2]);
        
        const lines = this.doc.splitTextToSize(text || '', maxWidth);
        this.doc.text(lines, x, y);
        return lines.length * (fontSize * 0.4) + 2;
    }

    // Helper: Check if new page needed
    checkNewPage(requiredSpace) {
        if (this.yPos + requiredSpace > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.yPos = this.margin;
            return true;
        }
        return false;
    }

    // Helper: Add section header
    addSectionHeader(title) {
        this.checkNewPage(15);
        this.yPos += 5;
        const headerHeight = this.addText(title, this.margin, this.yPos, {
            fontSize: 14,
            fontStyle: 'bold',
            color: [44, 62, 80]
        });
        this.yPos += headerHeight + 3;
        // Draw line under header
        this.doc.setDrawColor(52, 152, 219);
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, this.yPos - 2, this.pageWidth - this.margin, this.yPos - 2);
        this.yPos += 3;
    }

    // Helper: Add key-value pair
    addKeyValue(key, value, x = this.margin, width = this.maxWidth / 2 - 5) {
        if (!value || String(value).trim() === '') return 0;
        this.checkNewPage(10);
        const keyHeight = this.addText(key + ':', x, this.yPos, {
            fontSize: 9,
            fontStyle: 'bold',
            maxWidth: width
        });
        const valueHeight = this.addText(String(value), x + 5, this.yPos + keyHeight, {
            fontSize: 10,
            maxWidth: width - 5
        });
        return Math.max(keyHeight, valueHeight) + 2;
    }

    // Helper: Add key-value with notes
    addKeyValueWithNotes(key, value, notes) {
        let text = String(value || '');
        if (notes) {
            text += ' (Notes: ' + notes + ')';
        }
        return this.addKeyValue(key, text);
    }

    // Helper: Add two-column row
    addTwoColumnRow(leftKey, leftValue, rightKey, rightValue) {
        let currentY = this.yPos;
        if (leftValue) {
            const height = this.addKeyValue(leftKey, leftValue, this.leftCol, this.maxWidth / 2 - 5);
            currentY = Math.max(currentY, this.yPos + height);
        }
        if (rightValue) {
            const height = this.addKeyValue(rightKey, rightValue, this.rightCol, this.maxWidth / 2 - 5);
            currentY = Math.max(currentY, this.yPos + height);
        }
        this.yPos = currentY + 3;
    }

    // Write header
    writeHeader() {
        this.checkNewPage(20);
        this.yPos += 5;
        this.addText('Customer Site Survey (Solar)', this.margin, this.yPos, {
            fontSize: 18,
            fontStyle: 'bold',
            color: [44, 62, 80]
        });
        this.yPos += 8;
        const surveyDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        this.addText('Survey Date: ' + surveyDate, this.margin, this.yPos, {
            fontSize: 10,
            color: [100, 100, 100]
        });
        this.yPos += this.sectionSpacing + 5;
    }

    // Write Surveyor Information section
    writeSurveyorInfo(formData) {
        this.addSectionHeader('Surveyor Information');
        
        if (formData.carriedOutBy) {
            this.yPos += this.addKeyValue('Carried out by', formData.carriedOutBy, this.margin, this.maxWidth);
        }
        this.yPos += 3;

        this.addTwoColumnRow('Name', formData.customerName, 'Address', formData.address);
        this.addTwoColumnRow('Mobile', formData.mobile, 'Post Code', formData.postCode);
        this.addTwoColumnRow('Home', formData.home, 'What 3 Words', formData.what3words);
        
        if (formData.email) {
            this.yPos += this.addKeyValue('Email', formData.email, this.margin, this.maxWidth);
        }
        this.yPos += this.sectionSpacing;
    }

    // Write Property Details section
    writePropertyDetails(formData) {
        this.addSectionHeader('Property Details');
        
        const conservationText = formData.conservationArea ? 
            this.formatWithNotes(formData.conservationArea, formData.conservationAreaNotes) : '';
        const terrainText = formData.terrain ? 
            this.formatWithSpec(formData.terrain, formData.terrainSpec) : '';
        this.addTwoColumnRow('Conservation Area', conservationText, 'Terrain', terrainText);
        
        const exposedText = formData.propertyExposed ? 
            this.formatWithNotes(formData.propertyExposed, formData.propertyExposedNotes) : '';
        const parkingText = formData.parkingAvailable ? 
            this.formatWithNotes(formData.parkingAvailable, formData.parkingAvailableNotes) : '';
        this.addTwoColumnRow('Property Exposed', exposedText, 'Parking Available', parkingText);
        
        if (formData.parkingAvailable === 'N' && formData.parkingSpec) {
            this.yPos += 3;
            this.yPos += this.addKeyValue('Parking Details', formData.parkingSpec, this.margin, this.maxWidth);
        }
        this.yPos += 3;
        
        this.addTwoColumnRow('Occupancy Type', formData.occupancyType, 'kWh per Annum', formData.kwhPerAnnum);
        
        if (formData.dno) {
            const dnoText = this.formatWithSpec(formData.dno, formData.dnoSpec);
            this.yPos += this.addKeyValue('DNO', dnoText, this.margin, this.maxWidth);
        }
        this.yPos += this.sectionSpacing;
    }

    // Write Building Details section
    writeBuildingDetails(formData) {
        this.addSectionHeader('Building Details');
        
        const constructionText = formData.construction ? 
            this.formatWithSpec(formData.construction, formData.constructionSpec) : '';
        this.addTwoColumnRow('Construction', constructionText, 'Wall Thickness', formData.wallThickness);
        
        const buildingText = formData.buildingType ? 
            this.formatWithSpec(formData.buildingType, formData.buildingTypeSpec) : '';
        this.addTwoColumnRow('Internal Walk Construction', formData.internalWalk, 'Type of Building', buildingText);
        
        const protectedText = formData.protectedSpecies ? 
            this.formatWithNotes(formData.protectedSpecies, formData.protectedSpeciesNotes) : '';
        const nestsText = formData.nests ? 
            this.formatWithNotes(formData.nests, formData.nestsNotes) : '';
        this.addTwoColumnRow('Protected Species', protectedText, 'Nests', nestsText);
        
        if (formData.nests === 'Y' && formData.nestSpec) {
            this.yPos += 3;
            this.yPos += this.addKeyValue('Nest Details', formData.nestSpec, this.margin, this.maxWidth);
        }
        this.yPos += this.sectionSpacing;
    }

    // Write Roof Aspects section
    writeRoofAspects(formData, roofAspectCount) {
        this.addSectionHeader('Roof Aspects');
        
        for (let i = 1; i <= roofAspectCount; i++) {
            this.checkNewPage(50);
            this.yPos += 3;
            this.addText(`Roof Aspect ${i}`, this.margin, this.yPos, {
                fontSize: 12,
                fontStyle: 'bold',
                color: [52, 152, 219]
            });
            this.yPos += 8;

            const roofData = this.buildRoofAspectData(formData, i);
            
            if (roofData.length > 0) {
                this.doc.autoTable({
                    startY: this.yPos,
                    head: [['Property', 'Value']],
                    body: roofData,
                    theme: 'striped',
                    headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 3 },
                    columnStyles: {
                        0: { cellWidth: 60, fontStyle: 'bold' },
                        1: { cellWidth: 'auto' }
                    },
                    margin: { left: this.margin, right: this.margin }
                });
                this.yPos = this.doc.lastAutoTable.finalY + 5;
            }
            this.yPos += 5;
        }

        if (roofAspectCount > 1) {
            this.checkNewPage(10);
            this.addText('Note: For additional aspects, see reverse or additional pages.', this.margin, this.yPos, {
                fontSize: 9,
                fontStyle: 'italic',
                color: [100, 100, 100]
            });
            this.yPos += this.sectionSpacing;
        }
    }

    // Build roof aspect data array
    buildRoofAspectData(formData, index) {
        const roofData = [];
        const fields = [
            { key: `roof${index}_coveringType`, label: 'Covering Type' },
            { key: `roof${index}_slopeLength`, label: 'Slope Length' },
            { key: `roof${index}_orientation`, label: 'Orientation from S' },
            { key: `roof${index}_widthGutter`, label: 'Width at Gutter' },
            { key: `roof${index}_widthRidge`, label: 'Width at Ridge' },
            { key: `roof${index}_inclination`, label: 'Inclination' },
            { key: `roof${index}_rafterWidth`, label: 'Rafter Width' },
            { key: `roof${index}_rafterDepth`, label: 'Rafter Depth' },
            { key: `roof${index}_centreSpacings`, label: 'Centre Spacings' },
            { key: `roof${index}_gutterHeight`, label: 'Gutter Height' }
        ];

        fields.forEach(field => {
            const value = formData[field.key] || 'N/A';
            roofData.push([field.label, value]);
        });

        if (formData[`roof${index}_warranty`]) {
            const warrantyText = this.formatWithNotes(
                formData[`roof${index}_warranty`],
                formData[`roof${index}_warrantyNotes`]
            );
            roofData.push(['Is roof under warranty', warrantyText]);
        }
        
        if (formData[`roof${index}_shading`]) {
            const shadingText = this.formatWithNotes(
                formData[`roof${index}_shading`],
                formData[`roof${index}_shadingNotes`]
            );
            roofData.push(['Shading Present', shadingText]);
        }

        return roofData;
    }

    // Write Electrical section
    writeElectrical(formData) {
        this.addSectionHeader('Electrical');
        
        this.addTwoColumnRow('Fuseboard Location', formData.fuseboardLocation, 'Meter Location', formData.meterLocation);
        this.addTwoColumnRow('Condition of Electrical Installation', formData.electricalCondition, 'Number of Phases', formData.phases);
        this.addTwoColumnRow('Main Fuse Size', formData.mainFuseSize, 'Earthing System', formData.earthingSystem);
        
        if (formData.maximumDemand) {
            this.yPos += this.addKeyValue('Maximum Demand', formData.maximumDemand, this.margin, this.maxWidth);
        }
        this.yPos += 3;
        
        const loopedText = formData.loopedSupply ? 
            this.formatWithNotes(formData.loopedSupply, formData.loopedSupplyNotes) : '';
        this.addTwoColumnRow('Looped Supply', loopedText, 'L-N Loop Impedance', formData.loopImpedance);
        this.yPos += 5;
        
        this.addText('⚠️ MUST BE PHOTOGRAPHED', this.margin, this.yPos, {
            fontSize: 10,
            fontStyle: 'bold',
            color: [231, 76, 60]
        });
        this.yPos += 8;
        
        const spaceText = formData.spaceForCU ? 
            this.formatWithNotes(formData.spaceForCU, formData.spaceForCUNotes) : '';
        const accessText = formData.underfloorAccess ? 
            this.formatWithNotes(formData.underfloorAccess, formData.underfloorAccessNotes) : '';
        this.addTwoColumnRow('Space for new CU', spaceText, 'Underfloor Access', accessText);
        
        const floorText = formData.floorCoverings ? 
            this.formatWithSpec(formData.floorCoverings, formData.floorCoveringsSpec) : '';
        this.addTwoColumnRow('Cable Route', formData.cableRoute, 'Floor Coverings', floorText);
        this.yPos += this.sectionSpacing;
    }

    // Write Inverter & System section
    writeInverterSystem(formData) {
        this.addSectionHeader('Inverter & System Details');
        
        this.addTwoColumnRow('Inverter Location', formData.inverterLocation, 'Interior/Exterior', formData.inverterInteriorExterior);
        
        const wifiText = formData.wifiAvailable ? 
            this.formatWithNotes(formData.wifiAvailable, formData.wifiAvailableNotes) : '';
        this.addTwoColumnRow('WiFi Available', wifiText, 'Mounting Surface', formData.mountingSurface);
        
        const loftFlooredText = formData.loftFloored ? 
            this.formatWithNotes(formData.loftFloored, formData.loftFlooredNotes) : '';
        const loftLightText = formData.loftLight ? 
            this.formatWithNotes(formData.loftLight, formData.loftLightNotes) : '';
        this.addTwoColumnRow('Loft Floored', loftFlooredText, 'Loft Light', loftLightText);
        
        if (formData.loftLadder) {
            const loftLadderText = this.formatWithNotes(formData.loftLadder, formData.loftLadderNotes);
            this.yPos += this.addKeyValue('Loft Ladder', loftLadderText, this.margin, this.maxWidth);
        }
        this.yPos += 3;
        
        if (formData.waterHeating) {
            const waterText = this.formatWithSpec(formData.waterHeating, formData.waterHeatingSpec);
            this.yPos += this.addKeyValue('Water Heating Method', waterText, this.margin, this.maxWidth);
        }
        this.yPos += 3;
        
        const smokeText = formData.smokeAlarms ? 
            this.formatWithNotes(formData.smokeAlarms, formData.smokeAlarmsNotes) : '';
        this.addTwoColumnRow('Interlinked Smoke Alarms', smokeText, 'Brand', formData.smokeAlarmBrand);
        this.addTwoColumnRow('Type', formData.smokeAlarmType, 'Hardwired / Wireless', formData.smokeAlarmHardwired);
        this.yPos += this.sectionSpacing;
    }

    // Write Notes section
    writeNotes(formData) {
        this.addSectionHeader('Notes & Additional Information');
        
        if (formData.notes) {
            this.checkNewPage(30);
            this.yPos += this.addKeyValue('Additional Notes', formData.notes, this.margin, this.maxWidth);
            this.yPos += 5;
        }

        this.addText('Note: Floor plans, roof plans, and additional photos should be attached separately.', this.margin, this.yPos, {
            fontSize: 9,
            fontStyle: 'italic',
            color: [100, 100, 100]
        });
    }

    // Helper: Format value with notes
    formatWithNotes(value, notes) {
        if (!value) return '';
        return notes ? `${value} (Notes: ${notes})` : value;
    }

    // Helper: Format value with specification
    formatWithSpec(value, spec) {
        if (!value) return '';
        return spec ? `${value} - ${spec}` : value;
    }
}

// Export singleton instance
const pdfExporter = new PDFExporter();
export { pdfExporter };

