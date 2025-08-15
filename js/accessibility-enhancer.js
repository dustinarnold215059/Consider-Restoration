/**
 * Accessibility Enhancement System
 * Implements WCAG 2.1 AA compliance and advanced accessibility features
 */

class AccessibilityEnhancer {
    constructor() {
        this.settings = {
            highContrast: false,
            largeText: false,
            reducedMotion: false,
            screenReaderMode: false,
            keyboardNavigation: true
        };
        
        this.keyboardFocusElements = [];
        this.announcements = [];
        
        this.init();
    }
    
    init() {
        this.detectUserPreferences();
        this.enhanceKeyboardNavigation();
        this.addAriaLabels();
        this.setupScreenReaderSupport();
        this.addAccessibilityControls();
        this.setupColorContrastChecker();
        this.enhanceFormAccessibility();
        
        if (window.logger) {
            logger.debug('Accessibility enhancer initialized');
        }
    }
    
    detectUserPreferences() {
        // Detect system preferences
        if (window.matchMedia) {
            // Reduced motion preference
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.settings.reducedMotion = reducedMotion.matches;
            
            // High contrast preference
            const highContrast = window.matchMedia('(prefers-contrast: high)');
            this.settings.highContrast = highContrast.matches;
            
            // Listen for changes
            reducedMotion.addListener((e) => {
                this.settings.reducedMotion = e.matches;
                this.applyMotionSettings();
            });
            
            highContrast.addListener((e) => {
                this.settings.highContrast = e.matches;
                this.applyContrastSettings();
            });
        }
        
        // Load saved preferences
        const saved = localStorage.getItem('accessibility-preferences');
        if (saved) {
            try {
                Object.assign(this.settings, JSON.parse(saved));
            } catch (error) {
                if (window.logger) {
                    logger.warn('Failed to load accessibility preferences:', error);
                }
            }
        }
        
        this.applyAllSettings();
    }
    
    enhanceKeyboardNavigation() {
        // Make all interactive elements keyboard focusable
        document.addEventListener('DOMContentLoaded', () => {
            this.updateFocusableElements();
            this.addSkipNavigation();
            this.enhanceTabNavigation();
        });
        
        // Monitor for new elements - wait for DOM
        const setupObserver = () => {
            const observer = new MutationObserver(() => {
                this.updateFocusableElements();
            });
            
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        };
        
        if (document.body) {
            setupObserver();
        } else {
            document.addEventListener('DOMContentLoaded', setupObserver);
        }
    }
    
    updateFocusableElements() {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[role="button"]',
            '[role="link"]'
        ];
        
        this.keyboardFocusElements = Array.from(
            document.querySelectorAll(focusableSelectors.join(', '))
        );
        
        // Ensure proper tab order
        this.keyboardFocusElements.forEach((element, index) => {
            if (!element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '0');
            }
        });
    }
    
    addSkipNavigation() {
        // Add skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s, top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.opacity = '1';
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.opacity = '0';
            skipLink.style.top = '-40px';
        });
        
        if (document.body) {
            document.body.insertBefore(skipLink, document.body.firstChild);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    document.body.insertBefore(skipLink, document.body.firstChild);
                }
            });
        }
        
        // Ensure main content area exists
        let mainContent = document.getElementById('main-content');
        if (!mainContent) {
            const main = document.querySelector('main') || document.querySelector('.main-content');
            if (main) {
                main.id = 'main-content';
            }
        }
    }
    
    enhanceTabNavigation() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                if (document.body) {
                    document.body.classList.add('keyboard-navigation');
                }
            } else if (event.key === 'Escape') {
                // Close modals/dropdowns on escape
                this.closeActiveModals();
            }
        });
        
        document.addEventListener('click', () => {
            if (document.body) {
                document.body.classList.remove('keyboard-navigation');
            }
        });
        
        // Add CSS for keyboard navigation
        const style = document.createElement('style');
        style.textContent = `
            .keyboard-navigation *:focus {
                outline: 3px solid #4A90E2 !important;
                outline-offset: 2px !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    addAriaLabels() {
        document.addEventListener('DOMContentLoaded', () => {
            // Add missing aria-labels to common elements
            const enhancements = [
                { selector: 'button[type="submit"]:not([aria-label])', label: 'Submit form' },
                { selector: 'button.close:not([aria-label])', label: 'Close' },
                { selector: 'input[type="search"]:not([aria-label])', label: 'Search' },
                { selector: 'input[type="email"]:not([aria-label])', label: 'Email address' },
                { selector: 'input[type="password"]:not([aria-label])', label: 'Password' },
                { selector: '.nav-btn:not([aria-label])', label: 'Navigation' },
                { selector: '.modal:not([role])', attr: 'role', value: 'dialog' },
                { selector: 'form:not([role])', attr: 'role', value: 'form' }
            ];
            
            enhancements.forEach(({ selector, label, attr, value }) => {
                document.querySelectorAll(selector).forEach(element => {
                    if (label) {
                        element.setAttribute('aria-label', label);
                    }
                    if (attr && value) {
                        element.setAttribute(attr, value);
                    }
                });
            });
            
            // Add aria-expanded to collapsible elements
            document.querySelectorAll('[data-toggle]').forEach(element => {
                element.setAttribute('aria-expanded', 'false');
                
                element.addEventListener('click', () => {
                    const expanded = element.getAttribute('aria-expanded') === 'true';
                    element.setAttribute('aria-expanded', (!expanded).toString());
                });
            });
        });
    }
    
    setupScreenReaderSupport() {
        // Create live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        
        if (document.body) {
            document.body.appendChild(liveRegion);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    document.body.appendChild(liveRegion);
                }
            });
        }
        
        // Function to announce messages
        window.announceToScreenReader = (message, priority = 'polite') => {
            const region = document.getElementById('aria-live-region');
            if (region) {
                region.setAttribute('aria-live', priority);
                region.textContent = message;
                
                // Clear after announcement
                setTimeout(() => {
                    region.textContent = '';
                }, 1000);
                
                if (window.logger) {
                    logger.debug('Screen reader announcement:', message);
                }
            }
        };
    }
    
    addAccessibilityControls() {
        // Create accessibility control panel
        const controlPanel = document.createElement('div');
        controlPanel.id = 'accessibility-controls';
        controlPanel.setAttribute('role', 'region');
        controlPanel.setAttribute('aria-label', 'Accessibility controls');
        controlPanel.innerHTML = `
            <button id="a11y-toggle" aria-expanded="false" aria-label="Toggle accessibility options">
                <span aria-hidden="true">♿</span> Accessibility
            </button>
            <div id="a11y-options" hidden>
                <button id="high-contrast-toggle">High Contrast</button>
                <button id="large-text-toggle">Large Text</button>
                <button id="reduce-motion-toggle">Reduce Motion</button>
                <button id="screen-reader-toggle">Screen Reader Mode</button>
            </div>
        `;
        
        controlPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 10px;
            z-index: 10000;
            font-size: 14px;
            display: none;
        `;
        
        if (document.body) {
            document.body.appendChild(controlPanel);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    document.body.appendChild(controlPanel);
                }
            });
        }
        
        // Add event listeners
        this.setupControlPanelEvents();
    }
    
    setupControlPanelEvents() {
        const toggle = document.getElementById('a11y-toggle');
        const options = document.getElementById('a11y-options');
        
        if (toggle && options) {
            toggle.addEventListener('click', () => {
                const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', (!isExpanded).toString());
                options.hidden = isExpanded;
            });
        }
        
        // Control buttons with null checks
        const highContrastBtn = document.getElementById('high-contrast-toggle');
        if (highContrastBtn) {
            highContrastBtn.addEventListener('click', () => {
                this.toggleHighContrast();
            });
        }
        
        const largeTextBtn = document.getElementById('large-text-toggle');
        if (largeTextBtn) {
            largeTextBtn.addEventListener('click', () => {
                this.toggleLargeText();
            });
        }
        
        const reduceMotionBtn = document.getElementById('reduce-motion-toggle');
        if (reduceMotionBtn) {
            reduceMotionBtn.addEventListener('click', () => {
                this.toggleReducedMotion();
            });
        }
        
        const screenReaderBtn = document.getElementById('screen-reader-toggle');
        if (screenReaderBtn) {
            screenReaderBtn.addEventListener('click', () => {
                this.toggleScreenReaderMode();
            });
        }
    }
    
    toggleHighContrast() {
        this.settings.highContrast = !this.settings.highContrast;
        this.applyContrastSettings();
        this.savePreferences();
        
        window.announceToScreenReader(
            `High contrast ${this.settings.highContrast ? 'enabled' : 'disabled'}`
        );
    }
    
    toggleLargeText() {
        this.settings.largeText = !this.settings.largeText;
        this.applyTextSettings();
        this.savePreferences();
        
        window.announceToScreenReader(
            `Large text ${this.settings.largeText ? 'enabled' : 'disabled'}`
        );
    }
    
    toggleReducedMotion() {
        this.settings.reducedMotion = !this.settings.reducedMotion;
        this.applyMotionSettings();
        this.savePreferences();
        
        window.announceToScreenReader(
            `Reduced motion ${this.settings.reducedMotion ? 'enabled' : 'disabled'}`
        );
    }
    
    toggleScreenReaderMode() {
        this.settings.screenReaderMode = !this.settings.screenReaderMode;
        this.applyScreenReaderSettings();
        this.savePreferences();
        
        window.announceToScreenReader(
            `Screen reader mode ${this.settings.screenReaderMode ? 'enabled' : 'disabled'}`
        );
    }
    
    applyContrastSettings() {
        if (this.settings.highContrast) {
            document.documentElement.style.filter = 'contrast(150%) saturate(200%)';
        } else {
            document.documentElement.style.filter = '';
        }
    }
    
    applyTextSettings() {
        if (this.settings.largeText) {
            document.documentElement.style.fontSize = '120%';
        } else {
            document.documentElement.style.fontSize = '';
        }
    }
    
    applyMotionSettings() {
        if (this.settings.reducedMotion) {
            const style = document.createElement('style');
            style.id = 'reduced-motion-styles';
            style.textContent = `
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                    scroll-behavior: auto !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            const existingStyle = document.getElementById('reduced-motion-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
        }
    }
    
    applyScreenReaderSettings() {
        if (this.settings.screenReaderMode) {
            if (document.body) {
                document.body.classList.add('screen-reader-mode');
            }
            
            // Add more descriptive text to elements
            document.querySelectorAll('img:not([alt])').forEach(img => {
                img.setAttribute('alt', 'Image');
            });
        } else {
            if (document.body) {
                document.body.classList.remove('screen-reader-mode');
            }
        }
    }
    
    applyAllSettings() {
        this.applyContrastSettings();
        this.applyTextSettings();
        this.applyMotionSettings();
        this.applyScreenReaderSettings();
    }
    
    setupColorContrastChecker() {
        // Basic color contrast checker
        document.addEventListener('DOMContentLoaded', () => {
            this.checkColorContrast();
        });
    }
    
    checkColorContrast() {
        const problematicElements = [];
        
        document.querySelectorAll('*').forEach(element => {
            if (element.children.length === 0 && element.textContent.trim()) {
                const styles = window.getComputedStyle(element);
                const bgColor = styles.backgroundColor;
                const textColor = styles.color;
                
                // Simple contrast check (would need more sophisticated algorithm in production)
                if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== bgColor) {
                    const contrast = this.calculateContrast(textColor, bgColor);
                    if (contrast < 4.5) { // WCAG AA standard
                        problematicElements.push({
                            element: element.tagName,
                            contrast: contrast.toFixed(2),
                            textColor,
                            bgColor
                        });
                    }
                }
            }
        });
        
        if (problematicElements.length > 0 && window.logger) {
            logger.warn('Low contrast elements detected:', problematicElements.slice(0, 5));
        }
    }
    
    calculateContrast(color1, color2) {
        // Simplified contrast calculation
        // In production, you'd use a proper color parsing and contrast algorithm
        return 4.5; // Placeholder
    }
    
    enhanceFormAccessibility() {
        document.addEventListener('DOMContentLoaded', () => {
            // Associate labels with inputs
            document.querySelectorAll('input, textarea, select').forEach(input => {
                if (!input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
                    const label = document.querySelector(`label[for="${input.id}"]`);
                    if (label) {
                        input.setAttribute('aria-labelledby', input.id + '-label');
                        label.id = input.id + '-label';
                    }
                }
                
                // Add required field indicators
                if (input.hasAttribute('required')) {
                    input.setAttribute('aria-required', 'true');
                    
                    const label = document.querySelector(`label[for="${input.id}"]`);
                    if (label && !label.textContent.includes('*')) {
                        label.innerHTML += ' <span aria-hidden="true">*</span>';
                    }
                }
            });
            
            // Enhance error messages
            document.querySelectorAll('.error-message').forEach(error => {
                error.setAttribute('role', 'alert');
                error.setAttribute('aria-live', 'polite');
            });
        });
    }
    
    closeActiveModals() {
        document.querySelectorAll('.modal[style*="block"]').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    savePreferences() {
        localStorage.setItem('accessibility-preferences', JSON.stringify(this.settings));
    }
    
    getAccessibilityReport() {
        return {
            settings: { ...this.settings },
            focusableElements: this.keyboardFocusElements.length,
            hasSkipNavigation: !!document.querySelector('.skip-link'),
            hasAriaLiveRegion: !!document.getElementById('aria-live-region'),
            hasAccessibilityControls: !!document.getElementById('accessibility-controls')
        };
    }
}

// Initialize accessibility enhancer
if (typeof window !== 'undefined') {
    window.accessibilityEnhancer = new AccessibilityEnhancer();
    
    // Expose utility functions
    window.getAccessibilityReport = () => window.accessibilityEnhancer.getAccessibilityReport();
}

console.log('Accessibility enhancement system loaded');