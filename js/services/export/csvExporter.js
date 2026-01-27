// CSV Export Service

import { formDataModel } from '../../models/formData.js';

class CSVExporter {
    export(formData) {
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
        URL.revokeObjectURL(url);
    }
}

// Export singleton instance
const csvExporter = new CSVExporter();
export { csvExporter };

