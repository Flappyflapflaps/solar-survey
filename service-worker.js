// Service Worker for Solar Site Survey - Offline Support

const CACHE_NAME = 'solar-survey-v14';
const urlsToCache = [
    './',
    './index.html',
    './login.html',
    './styles.css',
    './js/app.js',
    './js/services/auth.js',
    './js/state/formState.js',
    './js/models/formData.js',
    './js/components/ButtonGroup.js',
    './js/components/ConditionalField.js',
    './js/components/RoofAspect.js',
    './js/components/FileUpload.js',
    './js/components/JobSelector.js',
    './js/components/FormSwitcher.js',
    './js/services/storage.js',
    './js/services/navigation.js',
    './js/services/dropbox.js',
    './js/services/contractParser.js',
    './js/services/export/excelExporter.js',
    './js/services/export/csvExporter.js',
    './js/services/export/pdfExporter.js',
    './js/config/dropbox.js',
    './js/config/jobConfig.js',
    './js/utils/debounce.js',
    './js/utils/dom.js',
    './js/utils/formHelpers.js',
    './js/services/formTemplateStorage.js',
    './js/components/formBuilder/FormBuilder.js',
    './js/components/formBuilder/FormRenderer.js',
    './js/components/formBuilder/FieldFactory.js',
    './js/components/formBuilder/FieldEditor.js',
    './js/components/formBuilder/TemplatePicker.js',
    './js/components/formBuilder/fields/BaseField.js',
    './js/components/formBuilder/fields/TextField.js',
    './js/components/formBuilder/fields/NumberField.js',
    './js/components/formBuilder/fields/SelectField.js',
    './js/components/formBuilder/fields/TextareaField.js',
    './js/components/formBuilder/fields/PhotoField.js',
    './js/components/formBuilder/fields/SignatureField.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache');
                return Promise.all(
                    urlsToCache.map(function(url) {
                        return fetch(url).then(function(response) {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                        }).catch(function(err) {
                            console.log('Cache add error for', url, err);
                        });
                    })
                );
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
    // Don't cache API routes - always fetch from network
    if (event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For navigation requests (HTML pages), use network-first to avoid redirect issues in Safari
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(function() {
                    return caches.match(event.request)
                        .then(function(response) {
                            return response || caches.match('./index.html');
                        });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(function(response) {
                    // Check if valid response - don't cache redirects or opaque responses
                    if (!response || response.status !== 200 || response.type !== 'basic' || response.redirected) {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(function() {
                    // If fetch fails, return offline page if available
                    if (event.request.destination === 'document') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});

// Background sync for form data (if browser supports it)
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-form-data') {
        event.waitUntil(syncFormData());
    }
});

function syncFormData() {
    // This would sync form data to server when online
    // For now, data is stored in localStorage
    return Promise.resolve();
}

