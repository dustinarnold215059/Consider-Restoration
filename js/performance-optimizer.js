// Performance Optimizer Module
// Handles bundle optimization, caching, and performance monitoring
console.log('⚡ Performance Optimizer loading...');

class PerformanceOptimizer {
    constructor() {
        this.metrics = {
            loadTimes: {},
            bundleSizes: {},
            cacheHits: 0,
            cacheMisses: 0,
            renderTimes: {},
            networkRequests: 0
        };
        
        this.config = {
            enableCaching: true,
            enableLazyLoading: true,
            enableImageOptimization: true,
            enableScriptOptimization: true,
            cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
            lazyLoadThreshold: 100 // pixels
        };
        
        this.cache = new Map();
        this.observers = new Map();
        
        this.initialize();
        console.log('⚡ Performance Optimizer initialized');
    }

    initialize() {
        this.setupPerformanceMonitoring();
        this.setupCaching();
        this.setupLazyLoading();
        this.setupImageOptimization();
        this.setupScriptOptimization();
        this.setupNetworkOptimization();
    }

    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            this.measurePageLoadTime();
        });

        // Monitor navigation performance
        if ('navigation' in performance) {
            this.monitorNavigation();
        }

        // Monitor resource loading
        if ('getEntriesByType' in performance) {
            this.monitorResourceLoading();
        }

        // Monitor largest contentful paint
        if ('PerformanceObserver' in window) {
            this.monitorLCP();
        }

        // Monitor cumulative layout shift
        this.monitorCLS();

        console.log('⚡ Performance monitoring setup complete');
    }

    setupCaching() {
        if (!this.config.enableCaching) return;

        // Setup intelligent caching
        this.setupIntelligentCaching();
        
        // Setup service worker caching if available
        if ('serviceWorker' in navigator) {
            this.setupServiceWorkerCaching();
        }

        // Setup localStorage caching for API responses
        this.setupAPIResponseCaching();

        console.log('⚡ Caching systems initialized');
    }

    setupLazyLoading() {
        if (!this.config.enableLazyLoading) return;

        // Setup Intersection Observer for lazy loading
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            // Fallback for older browsers
            this.setupScrollBasedLazyLoading();
        }

        // Lazy load images
        this.lazyLoadImages();
        
        // Lazy load non-critical scripts
        this.lazyLoadScripts();

        console.log('⚡ Lazy loading initialized');
    }

    setupImageOptimization() {
        if (!this.config.enableImageOptimization) return;

        // Convert images to WebP when supported
        this.setupWebPConversion();
        
        // Implement responsive images
        this.setupResponsiveImages();
        
        // Preload critical images
        this.preloadCriticalImages();

        console.log('⚡ Image optimization initialized');
    }

    setupResponsiveImages() {
        // Skip responsive image setup for now
        console.log('⚡ Responsive images setup skipped');
    }

    setupScriptOptimization() {
        if (!this.config.enableScriptOptimization) return;

        // Defer non-critical scripts
        this.deferNonCriticalScripts();
        
        // Bundle small scripts
        this.bundleSmallScripts();
        
        // Setup script error boundaries
        this.setupScriptErrorBoundaries();

        console.log('⚡ Script optimization initialized');
    }

    setupNetworkOptimization() {
        // Implement request batching
        this.setupRequestBatching();
        
        // Setup connection preloading
        this.setupConnectionPreloading();
        
        // Implement HTTP/2 optimization
        this.setupHTTP2Optimization();

        console.log('⚡ Network optimization initialized');
    }

    // Performance Monitoring Methods
    measurePageLoadTime() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        
        this.metrics.loadTimes.total = loadTime;
        this.metrics.loadTimes.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        this.metrics.loadTimes.firstPaint = this.getFirstPaint();
        
        console.log('⚡ Page load metrics:', this.metrics.loadTimes);
        
        // Report if load time is concerning
        if (loadTime > 3000) {
            console.warn('⚡ Slow page load detected:', loadTime + 'ms');
            this.optimizeForSlowLoad();
        }
    }

    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    }

    monitorNavigation() {
        const navigation = performance.getEntriesByType('navigation')[0];
        
        this.metrics.navigation = {
            redirectTime: navigation.redirectEnd - navigation.redirectStart,
            dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
            connectTime: navigation.connectEnd - navigation.connectStart,
            requestTime: navigation.responseStart - navigation.requestStart,
            responseTime: navigation.responseEnd - navigation.responseStart,
            domProcessingTime: navigation.domContentLoadedEventStart - navigation.responseEnd
        };
        
        console.log('⚡ Navigation metrics:', this.metrics.navigation);
    }

    monitorResourceLoading() {
        const resources = performance.getEntriesByType('resource');
        
        resources.forEach(resource => {
            const resourceType = this.getResourceType(resource);
            if (!this.metrics.loadTimes[resourceType]) {
                this.metrics.loadTimes[resourceType] = [];
            }
            
            this.metrics.loadTimes[resourceType].push({
                name: resource.name,
                duration: resource.duration,
                size: resource.transferSize || 0
            });
        });
        
        // Identify slow resources
        this.identifySlowResources(resources);
    }

    monitorLCP() {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.largestContentfulPaint = lastEntry.startTime;
                console.log('⚡ Largest Contentful Paint:', lastEntry.startTime);
            });
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.set('lcp', observer);
        } catch (error) {
            console.warn('⚡ LCP monitoring not supported');
        }
    }

    monitorCLS() {
        try {
            let clsValue = 0;
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this.metrics.cumulativeLayoutShift = clsValue;
            });
            
            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('cls', observer);
        } catch (error) {
            console.warn('⚡ CLS monitoring not supported');
        }
    }

    // Caching Methods
    setupIntelligentCaching() {
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            const cacheKey = this.generateCacheKey(url, options);
            
            // Check cache first
            if (this.shouldUseCache(url, options)) {
                const cached = this.getFromCache(cacheKey);
                if (cached && !this.isCacheExpired(cached)) {
                    this.metrics.cacheHits++;
                    console.log('⚡ Cache hit:', url);
                    return Promise.resolve(cached.response.clone());
                }
            }
            
            // Fetch from network
            try {
                this.metrics.networkRequests++;
                const response = await originalFetch(url, options);
                
                // Cache successful responses
                if (response.ok && this.shouldCache(url, response)) {
                    this.storeInCache(cacheKey, response.clone());
                }
                
                this.metrics.cacheMisses++;
                return response;
            } catch (error) {
                // Try to serve stale cache on network error
                const cached = this.getFromCache(cacheKey);
                if (cached) {
                    console.log('⚡ Serving stale cache due to network error:', url);
                    return cached.response.clone();
                }
                throw error;
            }
        };
    }

    setupAPIResponseCaching() {
        // Cache API responses in localStorage
        const originalAPICall = window.apiClient?.request;
        if (originalAPICall) {
            window.apiClient.request = async (endpoint, options = {}) => {
                const cacheKey = `api_${endpoint}_${JSON.stringify(options)}`;
                
                // Check if we should use cache
                if (options.method === 'GET' || !options.method) {
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) {
                        const parsedCache = JSON.parse(cached);
                        if (!this.isCacheExpired(parsedCache)) {
                            console.log('⚡ API cache hit:', endpoint);
                            return parsedCache.data;
                        }
                    }
                }
                
                // Make API call
                const response = await originalAPICall.call(window.apiClient, endpoint, options);
                
                // Cache GET responses
                if (options.method === 'GET' || !options.method) {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        data: response,
                        timestamp: Date.now(),
                        expiry: Date.now() + this.config.cacheExpiry
                    }));
                }
                
                return response;
            };
        }
    }

    // Lazy Loading Methods
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: `${this.config.lazyLoadThreshold}px`
        });
        
        this.observers.set('lazyLoad', observer);
    }

    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const observer = this.observers.get('lazyLoad');
        
        images.forEach(img => {
            if (observer) {
                observer.observe(img);
            } else {
                // Fallback: load immediately
                this.loadElement(img);
            }
        });
        
        console.log(`⚡ Set up lazy loading for ${images.length} images`);
    }

    lazyLoadScripts() {
        const scripts = document.querySelectorAll('script[data-src]');
        const observer = this.observers.get('lazyLoad');
        
        scripts.forEach(script => {
            if (observer) {
                observer.observe(script);
            }
        });
        
        console.log(`⚡ Set up lazy loading for ${scripts.length} scripts`);
    }

    loadElement(element) {
        if (element.tagName === 'IMG' && element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
            console.log('⚡ Lazy loaded image:', element.src);
        } else if (element.tagName === 'SCRIPT' && element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
            console.log('⚡ Lazy loaded script:', element.src);
        }
    }

    // Image Optimization Methods
    setupWebPConversion() {
        if (!this.supportsWebP()) return;
        
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.src && !img.src.includes('.webp')) {
                this.convertToWebP(img);
            }
        });
    }

    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }

    convertToWebP(img) {
        // This would typically be handled server-side
        // Client-side conversion is limited, so we just add WebP support detection
        const webpSrc = img.src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        
        // Test if WebP version exists
        const testImg = new Image();
        testImg.onload = () => {
            img.src = webpSrc;
            console.log('⚡ Converted to WebP:', webpSrc);
        };
        testImg.onerror = () => {
            // WebP version doesn't exist, keep original
        };
        testImg.src = webpSrc;
    }

    preloadCriticalImages() {
        const criticalImages = [
            '/images/hero-bg.jpg',
            '/images/logo.png'
        ];
        
        // Test if images exist before preloading
        criticalImages.forEach(src => {
            const testImg = new Image();
            testImg.onload = () => {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = src;
                document.head.appendChild(link);
                console.log('⚡ Preloaded critical image:', src);
            };
            testImg.onerror = () => {
                console.log('⚡ Skipping missing image:', src);
            };
            testImg.src = src;
        });
    }

    // Script Optimization Methods
    deferNonCriticalScripts() {
        const nonCriticalScripts = document.querySelectorAll('script:not([data-critical])');
        
        nonCriticalScripts.forEach(script => {
            if (!script.async && !script.defer) {
                script.defer = true;
            }
        });
        
        console.log('⚡ Deferred', nonCriticalScripts.length, 'non-critical scripts');
    }

    bundleSmallScripts() {
        // Identify small scripts that could be bundled
        const smallScripts = Array.from(document.querySelectorAll('script[src]'))
            .filter(script => !script.dataset.bundled)
            .map(script => script.src)
            .filter(src => src && !src.includes('cdn') && !src.includes('stripe'));
        
        if (smallScripts.length > 3) {
            console.log('⚡ Consider bundling', smallScripts.length, 'small scripts:', smallScripts);
        }
    }

    // Network Optimization Methods
    setupRequestBatching() {
        // Batch API requests that happen close together
        this.requestQueue = [];
        this.batchTimeout = null;
        
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            if (this.shouldBatch(url, options)) {
                return this.addToBatch(url, options);
            }
            return originalFetch(url, options);
        };
    }

    shouldBatch(url, options) {
        return url.includes('/api/') && (options.method === 'GET' || !options.method);
    }

    addToBatch(url, options) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, options, resolve, reject });
            
            if (this.batchTimeout) {
                clearTimeout(this.batchTimeout);
            }
            
            this.batchTimeout = setTimeout(() => {
                this.processBatch();
            }, 50); // 50ms batch window
        });
    }

    async processBatch() {
        if (this.requestQueue.length === 0) return;
        
        const batch = this.requestQueue.splice(0);
        console.log('⚡ Processing batch of', batch.length, 'requests');
        
        // Process all requests concurrently
        const promises = batch.map(async ({ url, options, resolve, reject }) => {
            try {
                const response = await fetch(url, options);
                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
        
        await Promise.allSettled(promises);
    }

    setupConnectionPreloading() {
        // Setup DNS prefetch and preconnect for external domains
        const externalDomains = [
            'https://fonts.googleapis.com',
            'https://js.stripe.com',
            'https://cdn.jsdelivr.net'
        ];
        
        externalDomains.forEach(domain => {
            // DNS prefetch
            const dnsLink = document.createElement('link');
            dnsLink.rel = 'dns-prefetch';
            dnsLink.href = domain;
            document.head.appendChild(dnsLink);
            
            // Preconnect for critical domains
            if (domain.includes('stripe') || domain.includes('fonts')) {
                const preconnectLink = document.createElement('link');
                preconnectLink.rel = 'preconnect';
                preconnectLink.href = domain;
                preconnectLink.crossOrigin = 'anonymous';
                document.head.appendChild(preconnectLink);
            }
        });
        
        console.log('⚡ Connection preloading setup for', externalDomains.length, 'domains');
    }

    setupHTTP2Optimization() {
        // Enable HTTP/2 server push hints
        if ('serviceWorker' in navigator) {
            // Add resource hints for HTTP/2 push (only for existing resources)
            const criticalResources = [
                { href: '/css/styles.css', as: 'style' }
                // Note: removed main.js and logo.png as they don't exist
            ];
            
            criticalResources.forEach(resource => {
                // Test if resource exists before preloading
                if (resource.as === 'image') {
                    const testImg = new Image();
                    testImg.onload = () => {
                        const link = document.createElement('link');
                        link.rel = 'preload';
                        link.href = resource.href;
                        link.as = resource.as;
                        document.head.appendChild(link);
                    };
                    testImg.src = resource.href;
                } else {
                    // For non-image resources, add directly
                    const link = document.createElement('link');
                    link.rel = 'preload';
                    link.href = resource.href;
                    link.as = resource.as;
                    if (resource.as === 'style') {
                        link.onload = function() {
                            this.onload = null;
                            this.rel = 'stylesheet';
                        };
                    }
                    document.head.appendChild(link);
                }
            });
        }
        
        console.log('⚡ HTTP/2 optimization hints configured');
    }

    setupServiceWorkerCaching() {
        // Skip if running locally to avoid errors
        if (window.location.protocol === 'file:') {
            console.log('⚡ Skipping service worker caching for local development');
            return;
        }
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                console.log('⚡ Service worker caching enabled');
            }).catch(error => {
                console.log('⚡ Service worker not available for caching');
            });
        }
    }

    setupScriptErrorBoundaries() {
        // Add global error handling for scripts
        window.addEventListener('error', (event) => {
            if (event.filename && event.filename.includes('.js')) {
                console.warn('⚡ Script error caught:', event.error?.message || event.message);
                // Optionally report to monitoring service
                if (this.config.enableMonitoring) {
                    this.reportScriptError(event);
                }
            }
        });

        // Handle promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.warn('⚡ Unhandled promise rejection:', event.reason);
            if (this.config.enableMonitoring) {
                this.reportPromiseRejection(event);
            }
        });

        console.log('⚡ Script error boundaries established');
    }

    reportScriptError(event) {
        // Basic error reporting - can be enhanced with external service
        const errorData = {
            type: 'script_error',
            message: event.error?.message || event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString()
        };
        
        // Store locally for now
        const errors = JSON.parse(localStorage.getItem('script_errors') || '[]');
        errors.push(errorData);
        // Keep only last 10 errors
        localStorage.setItem('script_errors', JSON.stringify(errors.slice(-10)));
    }

    reportPromiseRejection(event) {
        // Basic promise rejection reporting
        const errorData = {
            type: 'promise_rejection',
            reason: event.reason?.toString() || 'Unknown rejection',
            timestamp: new Date().toISOString()
        };
        
        const errors = JSON.parse(localStorage.getItem('promise_errors') || '[]');
        errors.push(errorData);
        localStorage.setItem('promise_errors', JSON.stringify(errors.slice(-10)));
    }

    // Utility Methods
    generateCacheKey(url, options) {
        return `cache_${url}_${JSON.stringify(options)}`;
    }

    shouldUseCache(url, options) {
        return this.config.enableCaching && 
               (options.method === 'GET' || !options.method) &&
               !url.includes('no-cache');
    }

    shouldCache(url, response) {
        return response.ok && 
               response.status < 400 &&
               !url.includes('no-cache') &&
               !response.headers.get('cache-control')?.includes('no-cache');
    }

    getFromCache(key) {
        return this.cache.get(key);
    }

    storeInCache(key, response) {
        this.cache.set(key, {
            response,
            timestamp: Date.now(),
            expiry: Date.now() + this.config.cacheExpiry
        });
        
        // Limit cache size
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    isCacheExpired(cached) {
        return Date.now() > cached.expiry;
    }

    getResourceType(resource) {
        const name = resource.name.toLowerCase();
        if (name.includes('.js')) return 'script';
        if (name.includes('.css')) return 'stylesheet';
        if (name.includes('.jpg') || name.includes('.png') || name.includes('.webp')) return 'image';
        if (name.includes('.woff') || name.includes('.ttf')) return 'font';
        return 'other';
    }

    identifySlowResources(resources) {
        const slowResources = resources.filter(resource => resource.duration > 1000);
        if (slowResources.length > 0) {
            console.warn('⚡ Slow resources detected:', slowResources);
        }
    }

    optimizeForSlowLoad() {
        // Implement optimizations for slow connections
        console.log('⚡ Applying slow connection optimizations');
        
        // Defer non-critical resources
        this.deferNonCriticalResources();
        
        // Reduce image quality
        this.reduceImageQuality();
        
        // Disable animations
        this.disableAnimations();
    }

    deferNonCriticalResources() {
        // Defer non-critical CSS
        const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
        nonCriticalCSS.forEach(link => {
            link.media = 'print';
            link.addEventListener('load', () => {
                link.media = 'all';
            });
        });
    }

    reduceImageQuality() {
        // Add loading=lazy to all images
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach(img => {
            img.loading = 'lazy';
        });
    }

    disableAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Public API
    getMetrics() {
        return { ...this.metrics };
    }

    getConfig() {
        return { ...this.config };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚡ Performance config updated:', this.config);
    }

    clearCache() {
        this.cache.clear();
        console.log('⚡ Performance cache cleared');
    }

    disconnect() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        console.log('⚡ Performance observers disconnected');
    }
}

// Create global instance
window.performanceOptimizer = new PerformanceOptimizer();

// Performance monitoring utilities
window.measurePerformance = function(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`⚡ ${name} took ${end - start} milliseconds`);
    return result;
};

window.measureAsyncPerformance = async function(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`⚡ ${name} took ${end - start} milliseconds`);
    return result;
};

console.log('⚡ Performance Optimizer loaded and active');