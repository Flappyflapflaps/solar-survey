// Geocoding Service - Converts addresses to coordinates and What3Words
import { GEOCODING_CONFIG, isBingConfigured, isWhat3WordsConfigured } from '../config/geocoding.js';

class GeocodingService {
    constructor() {
        this.cache = new Map();
    }

    // Main method: Get coords and What3Words from address
    async geocodeAddress(address, postcode) {
        if (!address && !postcode) return null;

        const fullAddress = postcode ? `${address}, ${postcode}, UK` : `${address}, UK`;

        // Check cache
        const cacheKey = fullAddress.toLowerCase();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            let coords = null;

            // Try Bing Maps first (best for UK domestic)
            if (isBingConfigured()) {
                coords = await this.geocodeWithBing(fullAddress);
            }

            // Fallback to Nominatim (free, no API key)
            if (!coords) {
                coords = await this.geocodeWithNominatim(fullAddress);
            }

            if (!coords) {
                console.warn('Could not geocode address:', fullAddress);
                return null;
            }

            // Get What3Words if API is configured
            let what3words = null;
            if (isWhat3WordsConfigured()) {
                what3words = await this.getWhat3Words(coords.lat, coords.lng);
            }

            const result = {
                lat: coords.lat,
                lng: coords.lng,
                what3words: what3words,
                source: coords.source
            };

            // Cache the result
            this.cache.set(cacheKey, result);

            return result;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    // Bing Maps geocoding (recommended for UK)
    async geocodeWithBing(address) {
        const apiKey = GEOCODING_CONFIG.BING_API_KEY;
        const url = `https://dev.virtualearth.net/REST/v1/Locations?q=${encodeURIComponent(address)}&key=${apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.resourceSets?.[0]?.resources?.[0]?.point?.coordinates) {
                const [lat, lng] = data.resourceSets[0].resources[0].point.coordinates;
                return { lat, lng, source: 'bing' };
            }
        } catch (error) {
            console.warn('Bing geocoding failed:', error);
        }

        return null;
    }

    // Nominatim geocoding (free fallback)
    async geocodeWithNominatim(address) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'SolarSurveyApp/1.0'
                }
            });
            const data = await response.json();

            if (data?.[0]) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    source: 'nominatim'
                };
            }
        } catch (error) {
            console.warn('Nominatim geocoding failed:', error);
        }

        return null;
    }

    // Convert coordinates to What3Words
    async getWhat3Words(lat, lng) {
        const apiKey = GEOCODING_CONFIG.WHAT3WORDS_API_KEY;
        const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data?.words) {
                return `///${data.words}`;
            }
        } catch (error) {
            console.warn('What3Words conversion failed:', error);
        }

        return null;
    }

    // Format coordinates for display
    formatCoords(lat, lng) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

export const geocodingService = new GeocodingService();
