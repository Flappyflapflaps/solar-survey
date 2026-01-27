// Excel Export Service - Refactored with section-based functions

import { formDataModel } from '../../models/formData.js';

class ExcelExporter {
    constructor() {
        this.ws = {};
        this.row = 1;
    }

    // Create workbook without saving (for Dropbox upload)
    createWorkbook(formData, roofAspectCount) {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded');
        }

        const wb = XLSX.utils.book_new();
        this.ws = {};
        this.row = 1;

        this.writeHeader();
        this.writeSurveyorInfo(formData);
        this.writePropertyDetails(formData);
        this.writeBuildingDetails(formData);
        this.writeRoofAspects(formData, roofAspectCount);
        this.writeElectrical(formData);
        this.writeInverterSystem(formData);
        this.writeNotes(formData);

        this.finalizeWorksheet();
        XLSX.utils.book_append_sheet(wb, this.ws, 'Site Survey');

        return wb;
    }

    // Main export function
    export(formData, roofAspectCount) {
        const wb = this.createWorkbook(formData, roofAspectCount);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `Solar_Site_Survey_${timestamp}.xlsx`;
        XLSX.writeFile(wb, filename);
    }

    // Helper: Set cell value
    setCell(r, c, val) {
        const cellRef = XLSX.utils.encode_cell({r: r-1, c: c-1});
        this.ws[cellRef] = {v: val, t: typeof val === 'number' ? 'n' : 's'};
    }

    // Helper: Add row with key-value pair
    addKeyValue(key, value, col = 2) {
        if (value) {
            this.setCell(this.row, 1, key + ':');
            this.setCell(this.row, col, value);
            this.row++;
        }
    }

    // Helper: Add row with key-value and notes
    addKeyValueWithNotes(key, value, notes, col = 2) {
        if (value) {
            this.setCell(this.row, 1, key + ':');
            this.setCell(this.row, col, value);
            if (notes) {
                this.setCell(this.row, col + 1, 'Notes: ' + notes);
            }
            this.row++;
        }
    }

    // Helper: Add section header
    addSectionHeader(title) {
        this.row += 2;
        this.setCell(this.row, 1, title);
        this.row += 2;
    }

    // Helper: Add spacing
    addSpacing(lines = 1) {
        this.row += lines;
    }

    // Write header
    writeHeader() {
        this.setCell(this.row, 1, 'Customer Site Survey (Solar)');
        this.row += 2;
    }

    // Write Surveyor Information section
    writeSurveyorInfo(formData) {
        this.addKeyValue('Carried out by', formData.carriedOutBy, 3);
        this.addSpacing(1);
        
        this.setCell(this.row, 1, 'Name:');
        this.setCell(this.row, 2, formData.customerName || '');
        this.setCell(this.row, 3, 'Address:');
        this.setCell(this.row, 4, formData.address || '');
        this.row++;
        
        this.addKeyValue('Mobile', formData.mobile);
        this.addKeyValue('Post Code', formData.postCode);
        
        this.setCell(this.row, 1, 'Home:');
        this.setCell(this.row, 2, formData.home || '');
        this.setCell(this.row, 3, 'What 3 Words:');
        this.setCell(this.row, 4, formData.what3words || '');
        this.row++;
        
        this.addKeyValue('Email', formData.email);
        this.addSpacing(1);
    }

    // Write Property Details section
    writePropertyDetails(formData) {
        this.addSectionHeader('Property Details');
        
        this.addKeyValueWithNotes('Conservation Area', formData.conservationArea, formData.conservationAreaNotes);
        this.setCell(this.row - 1, 4, 'Terrain:');
        this.setCell(this.row - 1, 5, formData.terrain || '');
        this.setCell(this.row - 1, 6, formData.terrainSpec || '');
        this.addSpacing(1);
        
        this.addKeyValueWithNotes('Property exposed', formData.propertyExposed, formData.propertyExposedNotes);
        this.setCell(this.row - 1, 4, 'Parking Available:');
        this.setCell(this.row - 1, 5, formData.parkingAvailable || '');
        if (formData.parkingAvailableNotes) {
            this.setCell(this.row - 1, 6, 'Notes: ' + formData.parkingAvailableNotes);
        }
        
        if (formData.parkingAvailable === 'N' && formData.parkingSpec) {
            this.addKeyValue('Parking Details', formData.parkingSpec);
        }
        this.addSpacing(1);
        
        this.setCell(this.row, 1, 'Occupancy type:');
        this.setCell(this.row, 2, formData.occupancyType || '');
        this.setCell(this.row, 3, 'kWh per annum:');
        this.setCell(this.row, 4, formData.kwhPerAnnum || '');
        this.row++;
        
        this.setCell(this.row, 1, 'DNO:');
        this.setCell(this.row, 2, formData.dno || '');
        if (formData.dnoSpec) {
            this.setCell(this.row, 3, formData.dnoSpec);
        }
        this.addSpacing(2);
    }

    // Write Building Details section
    writeBuildingDetails(formData) {
        this.addSectionHeader('Building');
        
        this.setCell(this.row, 1, 'Construction:');
        this.setCell(this.row, 2, formData.construction || '');
        this.setCell(this.row, 3, formData.constructionSpec || '');
        this.addSpacing(1);
        
        this.setCell(this.row, 1, 'Thickness of wall:');
        this.setCell(this.row, 2, formData.wallThickness || '');
        this.setCell(this.row, 3, 'Internal walk construction:');
        this.setCell(this.row, 4, formData.internalWalk || '');
        this.addSpacing(1);
        
        this.setCell(this.row, 1, 'Type of Building:');
        this.setCell(this.row, 2, formData.buildingType || '');
        this.setCell(this.row, 3, formData.buildingTypeSpec || '');
        this.addSpacing(1);
        
        this.addKeyValueWithNotes('Protected species', formData.protectedSpecies, formData.protectedSpeciesNotes);
        this.setCell(this.row - 1, 4, 'Nests:');
        this.setCell(this.row - 1, 5, formData.nests || '');
        if (formData.nestsNotes) {
            this.setCell(this.row - 1, 6, 'Notes: ' + formData.nestsNotes);
        }
        
        if (formData.nests === 'Y' && formData.nestSpec) {
            this.addKeyValue('Nest Details', formData.nestSpec);
        }
        this.addSpacing(2);
    }

    // Write Roof Aspects section
    writeRoofAspects(formData, roofAspectCount) {
        for (let i = 1; i <= roofAspectCount; i++) {
            this.setCell(this.row, 1, `Roof Aspect ${i} [roof drawing(s) to be completed]`);
            this.addSpacing(1);
            
            this.setCell(this.row, 1, 'Covering Type:');
            this.setCell(this.row, 2, formData[`roof${i}_coveringType`] || '');
            this.setCell(this.row, 3, 'Slope length:');
            this.setCell(this.row, 4, formData[`roof${i}_slopeLength`] || '');
            this.setCell(this.row, 5, 'Orientation from S:');
            this.setCell(this.row, 6, formData[`roof${i}_orientation`] || '');
            this.addSpacing(1);
            
            this.setCell(this.row, 1, 'Width at Gutter:');
            this.setCell(this.row, 2, formData[`roof${i}_widthGutter`] || '');
            this.setCell(this.row, 3, 'Width at Ridge:');
            this.setCell(this.row, 4, formData[`roof${i}_widthRidge`] || '');
            this.setCell(this.row, 5, 'Inclination:');
            this.setCell(this.row, 6, formData[`roof${i}_inclination`] || '');
            this.addSpacing(1);
            
            this.setCell(this.row, 1, 'Rafter Width:');
            this.setCell(this.row, 2, formData[`roof${i}_rafterWidth`] || '');
            this.setCell(this.row, 3, 'Rafter Depth:');
            this.setCell(this.row, 4, formData[`roof${i}_rafterDepth`] || '');
            this.setCell(this.row, 5, 'Centre spacings:');
            this.setCell(this.row, 6, formData[`roof${i}_centreSpacings`] || '');
            this.addSpacing(1);
            
            this.setCell(this.row, 1, 'Gutter height:');
            this.setCell(this.row, 2, formData[`roof${i}_gutterHeight`] || '');
            this.setCell(this.row, 3, 'Is roof under warranty:');
            this.setCell(this.row, 4, formData[`roof${i}_warranty`] || '');
            if (formData[`roof${i}_warrantyNotes`]) {
                this.setCell(this.row, 5, 'Notes: ' + formData[`roof${i}_warrantyNotes`]);
            }
            this.setCell(this.row, 6, 'Shading Present:');
            this.setCell(this.row, 7, formData[`roof${i}_shading`] || '');
            if (formData[`roof${i}_shadingNotes`]) {
                this.row++;
                this.setCell(this.row, 1, 'Shading Notes:');
                this.setCell(this.row, 2, formData[`roof${i}_shadingNotes`] || '');
            }
            this.addSpacing(2);
        }
        
        if (roofAspectCount > 1) {
            this.setCell(this.row, 1, 'For additional aspects note on reverse');
            this.addSpacing(2);
        }
    }

    // Write Electrical section
    writeElectrical(formData) {
        this.addSectionHeader('Electrical [Floor plan(s) to be completed]');
        
        this.setCell(this.row, 1, 'Fuseboard Location:');
        this.setCell(this.row, 2, formData.fuseboardLocation || '');
        this.setCell(this.row, 3, 'Meter Location :');
        this.setCell(this.row, 4, formData.meterLocation || '');
        this.addSpacing(1);
        
        this.setCell(this.row, 1, 'Condition of Electrical installation:');
        this.setCell(this.row, 2, formData.electricalCondition || '');
        this.setCell(this.row, 3, 'Number of Phases:');
        this.setCell(this.row, 4, formData.phases || '');
        this.addSpacing(1);
        
        this.setCell(this.row, 1, 'Main Fuse Size:');
        this.setCell(this.row, 2, formData.mainFuseSize || '');
        this.setCell(this.row, 3, 'Earthing System:');
        this.setCell(this.row, 4, formData.earthingSystem || '');
        this.setCell(this.row, 5, 'Maximum Demand:');
        this.setCell(this.row, 6, formData.maximumDemand || '');
        this.addSpacing(1);
        
        this.addKeyValueWithNotes('Looped Supply', formData.loopedSupply, formData.loopedSupplyNotes);
        this.setCell(this.row - 1, 4, 'L-N Loop impedance:');
        this.setCell(this.row - 1, 5, formData.loopImpedance || '');
        this.setCell(this.row - 1, 6, 'MUST BE PHOTOGRAPHED');
        this.addSpacing(1);
        
        this.addKeyValueWithNotes('Space for new CU', formData.spaceForCU, formData.spaceForCUNotes);
        this.setCell(this.row - 1, 4, 'Underfloor Access:');
        this.setCell(this.row - 1, 5, formData.underfloorAccess || '');
        if (formData.underfloorAccessNotes) {
            this.setCell(this.row - 1, 6, 'Notes: ' + formData.underfloorAccessNotes);
        }
        
        this.addKeyValue('Cable route', formData.cableRoute);
        this.addSpacing(1);
        
        this.setCell(this.row, 1, 'Floor Coverings:');
        this.setCell(this.row, 2, formData.floorCoverings || '');
        this.setCell(this.row, 3, formData.floorCoveringsSpec || '');
        this.addSpacing(1);
    }

    // Write Inverter & System section
    writeInverterSystem(formData) {
        this.setCell(this.row, 1, 'Inverter Location:');
        this.setCell(this.row, 2, formData.inverterLocation || '');
        this.setCell(this.row, 3, 'Interior/Exterior:');
        this.setCell(this.row, 4, formData.inverterInteriorExterior || '');
        this.addSpacing(1);
        
        this.addKeyValueWithNotes('WiFi Available', formData.wifiAvailable, formData.wifiAvailableNotes);
        this.setCell(this.row - 1, 4, 'Mounting Surface:');
        this.setCell(this.row - 1, 5, formData.mountingSurface || '');
        this.addSpacing(1);
        
        this.addKeyValueWithNotes('Loft Floored', formData.loftFloored, formData.loftFlooredNotes);
        this.setCell(this.row - 1, 4, 'Loft Light:');
        this.setCell(this.row - 1, 5, formData.loftLight || '');
        if (formData.loftLightNotes) {
            this.setCell(this.row - 1, 6, 'Notes: ' + formData.loftLightNotes);
        }
        
        this.addKeyValueWithNotes('Loft Ladder', formData.loftLadder, formData.loftLadderNotes);
        this.addSpacing(1);
        
        this.setCell(this.row, 1, 'Water Heating method:');
        this.setCell(this.row, 2, formData.waterHeating || '');
        this.setCell(this.row, 3, formData.waterHeatingSpec || '');
        this.addSpacing(1);
        
        this.addKeyValueWithNotes('Interlinked Smoke Alarms', formData.smokeAlarms, formData.smokeAlarmsNotes);
        this.setCell(this.row - 1, 4, 'Brand:');
        this.setCell(this.row - 1, 5, formData.smokeAlarmBrand || '');
        this.setCell(this.row - 1, 6, 'Type:');
        this.setCell(this.row - 1, 7, formData.smokeAlarmType || '');
        this.setCell(this.row - 1, 8, formData.smokeAlarmHardwired || '');
    }

    // Write Notes section
    writeNotes(formData) {
        if (formData.notes) {
            this.addSpacing(2);
            this.addKeyValue('Additional Notes', formData.notes);
        }
    }

    // Finalize worksheet
    finalizeWorksheet() {
        this.ws['!cols'] = [
            {wch: 25}, {wch: 20}, {wch: 15}, {wch: 20}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 20}
        ];
        this.ws['!ref'] = XLSX.utils.encode_range({s: {r: 0, c: 0}, e: {r: this.row-1, c: 7}});
    }
}

// Export singleton instance
const excelExporter = new ExcelExporter();
export { excelExporter };

