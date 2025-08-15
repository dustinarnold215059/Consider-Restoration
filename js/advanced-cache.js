/**
 * Advanced Caching System
 * Implements intelligent caching for API responses, images, and user data
 */

class AdvancedCacheManager {
    constructor() {
        this.cache = new Map();
        this.cacheConfig = {
            maxSize: 50, // Maximum cache entries
            defaultTTL: 5 * 60 * 1000, // 5 minutes default
            cleanupInterval: 10 * 60 * 1000 // 10 minutes cleanup
        };
        
        // Different TTL for different data types
        this.ttlConfig = {
            'api': 5 * 60 * 1000,      // 5 minutes
            'user': 15 * 60 * 1000,    // 15 minutes
            'static': 60 * 60 * 1000,  // 1 hour
            'images': 24 * 60 * 60 * 1000 // 24 hours
        };
        
        this.init();
    }
    
    init() {
        // Setup automatic cleanup
        setInterval(() => this.cleanup(), this.cacheConfig.cleanupInterval);
        
        // Setup service worker for network caching
        this.registerServiceWorker();
        
        if (window.logger) {
            logger.debug('Advanced cache manager initialized');
        }
    }
    
    // Cache with automatic expiration
    set(key, value, type = 'api') {
        const ttl = this.ttlConfig[type] || this.cacheConfig.defaultTTL;
        const expiry = Date.now() + ttl;
        
        this.cache.set(key, {
            value,
            expiry,
            type,
            created: Date.now(),
            hits: 0
        });
        
        // Enforce size limit
        if (this.cache.size > this.cacheConfig.maxSize) {
            this.evictLeastUsed();
        }
        
        if (window.logger) {
            logger.debug('Cache set:', { key, type, ttl: `${ttl}ms` });
        }
    }
    
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }
        
        // Check expiration
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            if (window.logger) {
                logger.debug('Cache expired:', key);
            }
            return null;
        }
        
        // Update hit count
        item.hits++;
        this.cache.set(key, item);
        
        if (window.logger) {
            logger.debug('Cache hit:', { key, hits: item.hits });
        }
        
        return item.value;
    }
    
    // Cached fetch wrapper
    async cachedFetch(url, options = {}, cacheType = 'api') {
        const cacheKey = this.generateCacheKey(url, options);
        
        // Try cache first
        const cached = this.get(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.clone().json().catch(() => response.text());
            
            // Cache successful responses
            this.set(cacheKey, data, cacheType);
            
            return data;
        } catch (error) {
            if (window.logger) {
                logger.error('Fetch error:', { url, error: error.message });
            }
            throw error;
        }
    }
    
    // Smart cache invalidation
    invalidate(pattern) {
        const keysToDelete = [];
        
        for (const [key] of this.cache) {
            if (key.includes(pattern) || key.match(pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        
        if (window.logger && keysToDelete.length > 0) {
            logger.debug('Cache invalidated:', { pattern, count: keysToDelete.length });
        }
    }
    
    // Preload critical resources
    async preloadCritical() {
        // Skip preloading when running locally to avoid CORS errors
        if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
            if (window.logger) {
                logger.debug('Skipping API preload for local development');
            }
            return;
        }
        
        const criticalEndpoints = [
            '/api/services',
            '/api/availability',
            '/api/config'
        ];
        
        const preloadPromises = criticalEndpoints.map(endpoint => 
            this.cachedFetch(endpoint, {}, 'static').catch(error => {
                if (window.logger) {
                    logger.warn('Preload failed:', { endpoint, error: error.message });
                }
            })
        );
        
        await Promise.all(preloadPromises);
        
        if (window.logger) {
            logger.info('Critical resources preloaded');
        }
    }
    
    cleanup() {
        let cleaned = 0;
        const now = Date.now();
        
        for (const [key, item] of this.cache) {
            if (now > item.expiry) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        
        if (window.logger && cleaned > 0) {
            logger.debug('Cache cleanup completed:', { cleaned, remaining: this.cache.size });
        }
    }
    
    evictLeastUsed() {
        let leastUsedKey = null;
        let minHits = Infinity;
        
        for (const [key, item] of this.cache) {
            if (item.hits < minHits) {
                minHits = item.hits;
                leastUsedKey = key;
            }
        }
        
        if (leastUsedKey) {
            this.cache.delete(leastUsedKey);
            if (window.logger) {
                logger.debug('Cache evicted (LRU):', leastUsedKey);
            }
        }
    }
    
    generateCacheKey(url, options) {
        const optionsStr = JSON.stringify(options);
        return `${url}:${btoa(optionsStr)}`;
    }
    
    registerServiceWorker() {
        // Skip service worker registration for file:// protocol
        if (window.location.protocol === 'file:') {
            if (window.logger) {
                logger.debug('Skipping Service Worker registration for file:// protocol');
            }
            return;
        }
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    if (window.logger) {
                        logger.debug('Service Worker registered:', registration.scope);
                    }
                })
                .catch(error => {
                    if (window.logger) {
                        logger.warn('Service Worker registration failed:', error);
                    }
                });
        }
    }
    
    // Get cache statistics
    getStats() {
        const stats = {
            size: this.cache.size,
            maxSize: this.cacheConfig.maxSize,
            utilization: (this.cache.size / this.cacheConfig.maxSize * 100).toFixed(1) + '%',
            types: {},
            totalHits: 0
        };
        
        for (const [key, item] of this.cache) {
            stats.types[item.type] = (stats.types[item.type] || 0) + 1;
            stats.totalHits += item.hits;
        }
        
        return stats;
    }
    
    // Clear all cache
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        
        if (window.logger) {
            logger.info('Cache cleared:', { itemsRemoved: size });
        }
    }
}

// Initialize cache manager
if (typeof window !== 'undefined') {
    window.cacheManager = new AdvancedCacheManager();
    
    // Preload critical resources after page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            window.cacheManager.preloadCritical();
        }, 1000);
    });
}

console.log('Advanced cache system loaded');