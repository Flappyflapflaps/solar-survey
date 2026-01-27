// Geocoding Configuration
// For Bing Maps: Get a free API key from https://www.bingmapsportal.com/
// For What3Words: Get a free API key from https://developer.what3words.com/

export const GEOCODING_CONFIG = {
    // Bing Maps API Key (recommended for UK addresses)
    // Get yours at: https://www.bingmapsportal.com/
    BING_API_KEY: '',

    // What3Words API Key (optional - for converting coords to 3 words)
    // Get yours at: https://developer.what3words.com/
    WHAT3WORDS_API_KEY: '',
};

// Check if Bing Maps is configured
export function isBingConfigured() {
    return GEOCODING_CONFIG.BING_API_KEY &&
           GEOCODING_CONFIG.BING_API_KEY.length > 0;
}

// Check if What3Words is configured
export function isWhat3WordsConfigured() {
    return GEOCODING_CONFIG.WHAT3WORDS_API_KEY &&
           GEOCODING_CONFIG.WHAT3WORDS_API_KEY.length > 0;
}
