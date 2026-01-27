// Job Configuration - Dropbox paths and surveyor list

export const JOB_CONFIG = {
    // Base path for all contract documents
    BASE_PATH: '/Viking work/AAAA Master Copy to new file (1) (1) (1) (1)/Contract Documents',

    // Subfolder containing contract PDFs (relative to BASE_PATH)
    CONTRACTS_FOLDER: 'Sales Documents',

    // Subfolder for saving surveys (relative to BASE_PATH)
    SURVEYS_FOLDER: 'Install/Survey',

    // Contract filename pattern (used to identify contract PDFs)
    CONTRACT_PATTERN: /^F13_Contract_.*\.pdf$/i,

    // List of surveyors for dropdown
    SURVEYORS: [
        'Chris Leisk',
        'Nick Leisk',
        // Add more surveyors here
    ]
};

// Get full path to contracts folder
export function getContractsPath() {
    return `${JOB_CONFIG.BASE_PATH}/${JOB_CONFIG.CONTRACTS_FOLDER}`;
}

// Get full path to surveys folder
export function getSurveysPath() {
    return `${JOB_CONFIG.BASE_PATH}/${JOB_CONFIG.SURVEYS_FOLDER}`;
}

// Get survey save path for a specific project
export function getSurveyPath(projectRef) {
    return `${getSurveysPath()}/${projectRef}`;
}
