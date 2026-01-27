// Contract Parser Service - Extracts customer data from contract PDFs using pdf.js

class ContractParser {
    constructor() {
        this.pdfjsLib = null;
    }

    // Initialize pdf.js library
    async init() {
        if (this.pdfjsLib) return;

        // pdf.js should be loaded via CDN in index.html
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('pdf.js library not loaded. Please ensure it is included in index.html');
        }

        this.pdfjsLib = pdfjsLib;

        // Set worker source
        this.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // Parse a contract PDF and extract customer/project data
    async parseContract(pdfArrayBuffer) {
        await this.init();

        try {
            // Load the PDF
            const loadingTask = this.pdfjsLib.getDocument({ data: pdfArrayBuffer });
            const pdf = await loadingTask.promise;

            // Extract text from first page (contains all the key info)
            const page = await pdf.getPage(1);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');

            // Parse the extracted text
            return this.extractData(text);
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw new Error('Failed to parse contract PDF: ' + error.message);
        }
    }

    // Extract structured data from raw text
    extractData(text) {
        // Debug: Log extracted text
        console.log('=== PDF TEXT EXTRACTED ===');
        console.log(text);
        console.log('=== END PDF TEXT ===');

        const data = {
            projectRef: '',
            customerName: '',
            address: '',
            postCode: '',
            quotationIssuedBy: '',
            dateIssued: '',
            equipment: {
                panels: { type: '', quantity: 0 },
                battery: { type: '', quantity: 0 },
                inverter: { type: '', quantity: 0 },
                evCharger: { type: '', quantity: 0 },
                mountingGear: { type: '' },
                flatRoofMount: { type: '', quantity: 0 }
            }
        };

        // Extract Project Ref
        const projectRefMatch = text.match(/Project\s*Ref:\s*([A-Za-z0-9\-]+)/i);
        if (projectRefMatch) {
            data.projectRef = projectRefMatch[1].trim();
        }

        // Extract Customer Name
        const customerNameMatch = text.match(/Customer\s*Name:\s*([A-Za-z\s]+?)(?:\s*Project|$)/i);
        if (customerNameMatch) {
            data.customerName = customerNameMatch[1].trim();
        }

        // Extract Address (this pattern handles the format in the contract)
        const addressMatch = text.match(/Address:\s*(.+?)(?:\s*Quotation\s*issued)/i);
        if (addressMatch) {
            data.address = addressMatch[1].trim();
        }

        // Extract Postcode from address (UK postcode pattern)
        const postcodeMatch = data.address.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
        if (postcodeMatch) {
            data.postCode = postcodeMatch[1].trim().toUpperCase();
        }

        // Extract Quotation Issued By
        const issuedByMatch = text.match(/Quotation\s*issued\s*by:\s*([A-Za-z\s]+?)(?:\s*Date)/i);
        if (issuedByMatch) {
            data.quotationIssuedBy = issuedByMatch[1].trim();
        }

        // Extract Date Issued
        const dateMatch = text.match(/Date\s*issued:\s*(\d{4}-\d{2}-\d{2})/i);
        if (dateMatch) {
            data.dateIssued = dateMatch[1].trim();
        }

        // Extract Equipment - Solar Panels
        const panelsMatch = text.match(/Solar\s*Panels\s+([^0-9]+?)\s+(\d+)/i);
        if (panelsMatch) {
            data.equipment.panels.type = panelsMatch[1].trim();
            data.equipment.panels.quantity = parseInt(panelsMatch[2], 10);
        }

        // Extract Equipment - Battery
        const batteryMatch = text.match(/Battery\s+([^0-9]+?)\s+(\d+)/i);
        if (batteryMatch) {
            data.equipment.battery.type = batteryMatch[1].trim();
            data.equipment.battery.quantity = parseInt(batteryMatch[2], 10);
        }

        // Extract Equipment - Inverter
        const inverterMatch = text.match(/Inverter\s+([^0-9]+?)\s+(\d+)/i);
        if (inverterMatch) {
            data.equipment.inverter.type = inverterMatch[1].trim();
            data.equipment.inverter.quantity = parseInt(inverterMatch[2], 10);
        }

        // Extract Equipment - EV Charger
        const evMatch = text.match(/EV\s*Charger\s+([^0-9]+?)\s+(\d+)/i);
        if (evMatch) {
            data.equipment.evCharger.type = evMatch[1].trim();
            data.equipment.evCharger.quantity = parseInt(evMatch[2], 10);
        }

        // Extract Equipment - Flat Roof Mount
        const flatRoofMatch = text.match(/Flat\s*Roof\s*Mount\s+([^0-9]+?)\s+(\d+)/i);
        if (flatRoofMatch) {
            data.equipment.flatRoofMount.type = flatRoofMatch[1].trim();
            data.equipment.flatRoofMount.quantity = parseInt(flatRoofMatch[2], 10);
        }

        // Debug: Log parsed data
        console.log('=== PARSED CONTRACT DATA ===');
        console.log(JSON.stringify(data, null, 2));
        console.log('=== END PARSED DATA ===');

        return data;
    }

    // Format equipment summary for display
    formatEquipmentSummary(equipment) {
        const lines = [];

        if (equipment.panels.quantity > 0) {
            lines.push(`${equipment.panels.quantity}x ${equipment.panels.type}`);
        }
        if (equipment.battery.quantity > 0) {
            lines.push(`${equipment.battery.quantity}x ${equipment.battery.type}`);
        }
        if (equipment.inverter.quantity > 0) {
            lines.push(`${equipment.inverter.quantity}x ${equipment.inverter.type}`);
        }
        if (equipment.evCharger.quantity > 0) {
            lines.push(`${equipment.evCharger.quantity}x ${equipment.evCharger.type}`);
        }
        if (equipment.flatRoofMount.quantity > 0) {
            lines.push(`${equipment.flatRoofMount.quantity}x ${equipment.flatRoofMount.type}`);
        }

        return lines.join('\n');
    }
}

export const contractParser = new ContractParser();
