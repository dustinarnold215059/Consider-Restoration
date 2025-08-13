/**
 * Browser Compatibility Polyfills and Feature Detection
 * Ensures the website works across different browsers and versions
 */

(function() {
    'use strict';

    // Feature detection object
    const BrowserSupport = {
        // ES6+ features
        promises: typeof Promise !== 'undefined',
        asyncAwait: (function() {
            try {
                return (function() {}).constructor('return (async () => {})();')().constructor === Promise;
            } catch (e) {
                return false;
            }
        })(),
        
        // Web APIs
        fetch: typeof fetch !== 'undefined',
        localStorage: (function() {
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                return true;
            } catch (e) {
                return false;
            }
        })(),
        
        // DOM APIs
        querySelector: typeof document.querySelector !== 'undefined',
        addEventListener: typeof window.addEventListener !== 'undefined',
        
        // CSS features
        cssGrid: CSS && CSS.supports && CSS.supports('display', 'grid'),
        flexbox: CSS && CSS.supports && CSS.supports('display', 'flex'),
        
        // Modern JavaScript features
        arrowFunctions: (function() {
            try {
                eval('() => {}');
                return true;
            } catch (e) {
                return false;
            }
        })(),
        
        // Service Worker
        serviceWorker: 'serviceWorker' in navigator,
        
        // Intersection Observer
        intersectionObserver: 'IntersectionObserver' in window,
        
        // Web Crypto API
        crypto: window.crypto && window.crypto.subtle,
        
        // Touch events
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };

    // Promise polyfill for IE11
    if (!BrowserSupport.promises) {
        window.Promise = function(executor) {
            var self = this;
            self.state = 'pending';
            self.value = undefined;
            self.handlers = [];
            
            function resolve(result) {
                if (self.state === 'pending') {
                    self.state = 'fulfilled';
                    self.value = result;
                    self.handlers.forEach(handle);
                    self.handlers = null;
                }
            }
            
            function reject(error) {
                if (self.state === 'pending') {
                    self.state = 'rejected';
                    self.value = error;
                    self.handlers.forEach(handle);
                    self.handlers = null;
                }
            }
            
            function handle(handler) {
                if (self.state === 'pending') {
                    self.handlers.push(handler);
                } else {
                    if (self.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
                        handler.onFulfilled(self.value);
                    }
                    if (self.state === 'rejected' && typeof handler.onRejected === 'function') {
                        handler.onRejected(self.value);
                    }
                }
            }
            
            this.then = function(onFulfilled, onRejected) {
                return new Promise(function(resolve, reject) {
                    handle({
                        onFulfilled: function(result) {
                            try {
                                resolve(onFulfilled ? onFulfilled(result) : result);
                            } catch (ex) {
                                reject(ex);
                            }
                        },
                        onRejected: function(error) {
                            try {
                                resolve(onRejected ? onRejected(error) : Promise.reject(error));
                            } catch (ex) {
                                reject(ex);
                            }
                        }
                    });
                });
            };
            
            try {
                executor(resolve, reject);
            } catch (ex) {
                reject(ex);
            }
        };
        
        Promise.resolve = function(value) {
            return new Promise(function(resolve) {
                resolve(value);
            });
        };
        
        Promise.reject = function(reason) {
            return new Promise(function(resolve, reject) {
                reject(reason);
            });
        };
    }

    // Fetch polyfill for older browsers
    if (!BrowserSupport.fetch) {
        window.fetch = function(url, options) {
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                options = options || {};
                
                xhr.open(options.method || 'GET', url);
                
                // Set headers
                if (options.headers) {
                    Object.keys(options.headers).forEach(function(key) {
                        xhr.setRequestHeader(key, options.headers[key]);
                    });
                }
                
                xhr.onload = function() {
                    resolve({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        ok: xhr.status >= 200 && xhr.status < 300,
                        json: function() {
                            return Promise.resolve(JSON.parse(xhr.responseText));
                        },
                        text: function() {
                            return Promise.resolve(xhr.responseText);
                        }
                    });
                };
                
                xhr.onerror = function() {
                    reject(new Error('Network error'));
                };
                
                xhr.send(options.body || null);
            });
        };
    }

    // LocalStorage fallback for private browsing
    if (!BrowserSupport.localStorage) {
        var localStorageFallback = {};
        window.localStorage = {
            getItem: function(key) {
                return localStorageFallback[key] || null;
            },
            setItem: function(key, value) {
                localStorageFallback[key] = String(value);
            },
            removeItem: function(key) {
                delete localStorageFallback[key];
            },
            clear: function() {
                localStorageFallback = {};
            }
        };
    }

    // querySelector polyfill for IE7
    if (!BrowserSupport.querySelector) {
        document.querySelector = function(selector) {
            var elements = document.querySelectorAll(selector);
            return elements.length ? elements[0] : null;
        };
        
        document.querySelectorAll = function(selector) {
            var style = document.createStyleSheet();
            var elements = [];
            style.addRule(selector, 'foo: bar');
            
            for (var i = 0, j = 0; i < style.rules.length; i++) {
                elements[j++] = style.rules[i].selectorText.match(/[^,]+/g);
            }
            
            style.owningElement.parentNode.removeChild(style.owningElement);
            return elements;
        };
    }

    // addEventListener polyfill for IE8
    if (!BrowserSupport.addEventListener) {
        window.addEventListener = function(type, listener) {
            window.attachEvent('on' + type, listener);
        };
        
        document.addEventListener = function(type, listener) {
            document.attachEvent('on' + type, listener);
        };
    }

    // Array.from polyfill
    if (!Array.from) {
        Array.from = function(arrayLike) {
            var result = [];
            for (var i = 0; i < arrayLike.length; i++) {
                result.push(arrayLike[i]);
            }
            return result;
        };
    }

    // Object.assign polyfill
    if (!Object.assign) {
        Object.assign = function(target) {
            if (target == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            
            var to = Object(target);
            
            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];
                if (nextSource != null) {
                    for (var nextKey in nextSource) {
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        };
    }

    // Intersection Observer polyfill
    if (!BrowserSupport.intersectionObserver) {
        window.IntersectionObserver = function(callback, options) {
            var self = this;
            this.callback = callback;
            this.options = options || {};
            this.elements = [];
            
            this.observe = function(element) {
                self.elements.push(element);
                // Fallback: immediately trigger callback
                setTimeout(function() {
                    self.callback([{
                        target: element,
                        isIntersecting: true,
                        intersectionRatio: 1
                    }]);
                }, 100);
            };
            
            this.unobserve = function(element) {
                var index = self.elements.indexOf(element);
                if (index > -1) {
                    self.elements.splice(index, 1);
                }
            };
            
            this.disconnect = function() {
                self.elements = [];
            };
        };
    }

    // CSS Grid fallback detection
    if (!BrowserSupport.cssGrid) {
        // Add a class to the document for CSS fallbacks
        document.documentElement.className += ' no-css-grid';
        
        // JavaScript fallback for simple grid layouts
        window.GridFallback = {
            init: function() {
                var grids = document.querySelectorAll('.grid-fallback');
                Array.from(grids).forEach(function(grid) {
                    var items = Array.from(grid.children);
                    var columns = parseInt(grid.getAttribute('data-columns') || '1');
                    
                    items.forEach(function(item, index) {
                        item.style.float = 'left';
                        item.style.width = (100 / columns) + '%';
                        item.style.boxSizing = 'border-box';
                        
                        if ((index + 1) % columns === 0) {
                            item.style.clear = 'both';
                        }
                    });
                });
            }
        };
    }

    // Crypto polyfill for secure operations
    if (!BrowserSupport.crypto) {
        window.crypto = {
            getRandomValues: function(array) {
                for (var i = 0; i < array.length; i++) {
                    array[i] = Math.floor(Math.random() * 256);
                }
                return array;
            }
        };
    }

    // Touch event detection and handling
    if (BrowserSupport.touch) {
        document.documentElement.className += ' touch';
        
        // Add touch-friendly hover effects
        var touchElements = document.querySelectorAll('.hover-effect');
        Array.from(touchElements).forEach(function(element) {
            element.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            });
            
            element.addEventListener('touchend', function() {
                var self = this;
                setTimeout(function() {
                    self.classList.remove('touch-active');
                }, 150);
            });
        });
    } else {
        document.documentElement.className += ' no-touch';
    }

    // Browser detection for specific workarounds
    var browserInfo = {
        isIE: navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > -1,
        isEdge: navigator.userAgent.indexOf('Edge') !== -1,
        isChrome: navigator.userAgent.indexOf('Chrome') !== -1,
        isFirefox: navigator.userAgent.indexOf('Firefox') !== -1,
        isSafari: navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    };

    // IE-specific fixes
    if (browserInfo.isIE) {
        document.documentElement.className += ' ie';
        
        // Fix for IE11 object-fit
        if (!('objectFit' in document.documentElement.style)) {
            var images = document.querySelectorAll('img[data-object-fit]');
            Array.from(images).forEach(function(img) {
                img.style.fontFamily = 'object-fit: ' + img.getAttribute('data-object-fit');
            });
        }
    }

    // Mobile-specific optimizations
    if (browserInfo.isMobile) {
        document.documentElement.className += ' mobile';
        
        // Prevent zoom on input focus
        var inputs = document.querySelectorAll('input, select, textarea');
        Array.from(inputs).forEach(function(input) {
            input.addEventListener('focus', function() {
                var viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
                }
            });
            
            input.addEventListener('blur', function() {
                var viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1');
                }
            });
        });
    }

    // Expose browser support information globally
    window.BrowserSupport = BrowserSupport;
    window.BrowserInfo = browserInfo;

    // Initialize fallbacks when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (window.GridFallback) {
                GridFallback.init();
            }
        });
    } else {
        if (window.GridFallback) {
            GridFallback.init();
        }
    }

    // Log browser compatibility information (development only)
    if (typeof logger !== 'undefined') {
        logger.debug('🌐 Browser Compatibility Report:', {
            promises: BrowserSupport.promises,
            fetch: BrowserSupport.fetch,
            localStorage: BrowserSupport.localStorage,
            cssGrid: BrowserSupport.cssGrid,
            serviceWorker: BrowserSupport.serviceWorker,
            browser: browserInfo
        });
    }

})();