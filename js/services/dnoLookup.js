// DNO (Distribution Network Operator) Lookup Service
// Auto-selects DNO based on UK postcode prefix

// Scottish DNO regions by postcode prefix
const DNO_REGIONS = {
    // SSE (Scottish and Southern Electricity Networks) - North of Scotland
    SSE: [
        'AB', // Aberdeen
        'DD', // Dundee
        'FK', // Falkirk/Stirling
        'IV', // Inverness
        'KW', // Kirkwall/Wick
        'PA', // Paisley/Greenock (partial)
        'PH', // Perth
        'ZE', // Shetland
    ],
    // SP Network (SP Energy Networks) - Central/South Scotland
    'SP Network': [
        'DG', // Dumfries/Galloway
        'EH', // Edinburgh
        'G',  // Glasgow
        'KA', // Kilmarnock
        'KY', // Kirkcaldy
        'ML', // Motherwell
        'TD', // Galashiels
    ]
};

// Get DNO from postcode
export function getDnoFromPostcode(postcode) {
    if (!postcode) return null;

    // Extract prefix (letters at start of postcode)
    const prefix = postcode.trim().toUpperCase().match(/^([A-Z]{1,2})/);
    if (!prefix) return null;

    const postcodePrefix = prefix[1];

    // Check each DNO region
    for (const [dno, prefixes] of Object.entries(DNO_REGIONS)) {
        if (prefixes.includes(postcodePrefix)) {
            return dno;
        }
    }

    // Not found in known regions
    return null;
}

// Check if postcode is in Scotland
export function isScottishPostcode(postcode) {
    if (!postcode) return false;

    const prefix = postcode.trim().toUpperCase().match(/^([A-Z]{1,2})/);
    if (!prefix) return false;

    const scottishPrefixes = [
        ...DNO_REGIONS.SSE,
        ...DNO_REGIONS['SP Network']
    ];

    return scottishPrefixes.includes(prefix[1]);
}
