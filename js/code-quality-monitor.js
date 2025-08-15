/**
 * Code Quality Monitor
 * Real-time monitoring for code quality, memory usage, and error tracking
 */

class CodeQualityMonitor {
    constructor() {
        this.metrics = {
            memoryUsage: [],
            errorCount: 0,
            performanceIssues: [],
            codeSmells: [],
            securityWarnings: []
        };
        
        this.thresholds = {
            memoryLeak: 50 * 1024 * 1024, // 50MB
            slowFunction: 500, // 500ms (reduced reporting)
            errorRate: 5, // 5 errors per minute
            domSize: 1000 // DOM nodes
        };
        
        this.init();
    }
    
    init() {
        this.setupMemoryMonitoring();
        this.setupPerformanceMonitoring();
        this.setupErrorTracking();
        this.setupCodeSmellDetection();
        this.setupSecurityMonitoring();
        
        // Start periodic checks
        setInterval(() => this.runQualityChecks(), 30000); // Every 30 seconds
        
        if (window.logger && window.logger.debug) {
            window.logger.debug('Code quality monitor initialized');
        }
    }
    
    setupMemoryMonitoring() {
        if (window.performance && performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                this.metrics.memoryUsage.push({
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                });
                
                // Keep only last 20 measurements
                if (this.metrics.memoryUsage.length > 20) {
                    this.metrics.memoryUsage.shift();
                }
                
                // Check for memory leaks
                this.detectMemoryLeaks();
                
            }, 10000); // Every 10 seconds
        }
    }
    
    detectMemoryLeaks() {
        if (this.metrics.memoryUsage.length < 5) return;
        
        const recent = this.metrics.memoryUsage.slice(-5);
        const trend = recent.reduce((acc, curr, idx) => {
            if (idx === 0) return acc;
            return acc + (curr.used - recent[idx - 1].used);
        }, 0);
        
        if (trend > this.thresholds.memoryLeak) {
            this.reportIssue('memory-leak', {
                trend: `${(trend / 1024 / 1024).toFixed(2)}MB increase`,
                currentUsage: `${(recent[recent.length - 1].used / 1024 / 1024).toFixed(2)}MB`
            });
        }
    }
    
    setupPerformanceMonitoring() {
        // Monitor long-running functions
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        const self = this; // Store reference to avoid context issues
        
        window.setTimeout = function(callback, delay, ...args) {
            const start = performance.now();
            const wrappedCallback = function() {
                const duration = performance.now() - start;
                if (self && self.thresholds && duration > self.thresholds.slowFunction) {
                    self.reportIssue('slow-function', {
                        duration: `${duration.toFixed(2)}ms`,
                        type: 'setTimeout'
                    });
                }
                return callback.apply(this, arguments);
            };
            return originalSetTimeout.call(this, wrappedCallback, delay, ...args);
        };
        
        // Monitor DOM size
        this.monitorDOMSize();
    }
    
    monitorDOMSize() {
        const setupDOMObserver = () => {
            const observer = new MutationObserver(() => {
                const nodeCount = document.querySelectorAll('*').length;
                if (nodeCount > this.thresholds.domSize) {
                    this.reportIssue('large-dom', {
                        nodeCount,
                        threshold: this.thresholds.domSize
                    });
                }
            });
            
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        };
        
        if (document.body) {
            setupDOMObserver();
        } else {
            document.addEventListener('DOMContentLoaded', setupDOMObserver);
        }
    }
    
    setupErrorTracking() {
        let errorCount = 0;
        let errorWindow = Date.now();
        
        window.addEventListener('error', (event) => {
            this.metrics.errorCount++;
            errorCount++;
            
            // Reset window every minute
            if (Date.now() - errorWindow > 60000) {
                errorWindow = Date.now();
                errorCount = 1;
            }
            
            // Check error rate
            if (errorCount > this.thresholds.errorRate) {
                this.reportIssue('high-error-rate', {
                    count: errorCount,
                    window: '1 minute',
                    lastError: event.message
                });
            }
            
            // Analyze error patterns
            this.analyzeError(event);
        });
    }
    
    analyzeError(event) {
        const errorPatterns = {
            'Script error': 'CORS or third-party script issue',
            'undefined': 'Variable not defined',
            'null': 'Null reference error',
            'permission denied': 'Security restriction',
            'out of memory': 'Memory exhaustion'
        };
        
        for (const [pattern, description] of Object.entries(errorPatterns)) {
            if (event.message.toLowerCase().includes(pattern)) {
                this.reportIssue('error-pattern', {
                    pattern,
                    description,
                    file: event.filename,
                    line: event.lineno
                });
                break;
            }
        }
    }
    
    setupCodeSmellDetection() {
        // Detect potential code smells
        document.addEventListener('DOMContentLoaded', () => {
            this.checkForCodeSmells();
        });
    }
    
    checkForCodeSmells() {
        const smells = [];
        
        // Check for inline styles (maintainability issue)
        const inlineStyles = document.querySelectorAll('[style]').length;
        if (inlineStyles > 10) {
            smells.push({
                type: 'inline-styles',
                count: inlineStyles,
                impact: 'maintainability'
            });
        }
        
        // Check for inline event handlers
        const inlineEvents = document.querySelectorAll('[onclick], [onload], [onerror]').length;
        if (inlineEvents > 5) {
            smells.push({
                type: 'inline-events',
                count: inlineEvents,
                impact: 'security, maintainability'
            });
        }
        
        // Check for excessive global variables
        const globalVars = Object.keys(window).filter(key => 
            typeof window[key] !== 'function' && 
            !key.startsWith('webkit') && 
            !key.startsWith('chrome')
        ).length;
        
        if (globalVars > 20) {
            smells.push({
                type: 'global-pollution',
                count: globalVars,
                impact: 'maintainability, conflicts'
            });
        }
        
        this.metrics.codeSmells = smells;
        
        if (smells.length > 0 && window.logger && window.logger.warn) {
            window.logger.warn('Code smells detected:', smells);
        }
    }
    
    setupSecurityMonitoring() {
        // Monitor for potential security issues
        this.checkCSPViolations();
        this.monitorXSS();
        this.checkMixedContent();
    }
    
    checkCSPViolations() {
        document.addEventListener('securitypolicyviolation', (event) => {
            this.reportIssue('csp-violation', {
                violatedDirective: event.violatedDirective,
                blockedURI: event.blockedURI,
                originalPolicy: event.originalPolicy
            });
        });
    }
    
    monitorXSS() {
        // More selective XSS detection patterns (avoid false positives)
        const xssPatterns = [
            /javascript:\s*[^'"]/gi,  // Only flag inline javascript: that's not in quotes
            /on\w+\s*=\s*[^"'][^>]*>/gi,  // Only unquoted event handlers
            /expression\s*\(/gi  // CSS expressions
        ];
        
        const checkElement = (element) => {
            // Skip legitimate script tags and their contents
            if (element.tagName === 'SCRIPT') return;
            
            // Only check innerHTML, not textContent (to avoid false positives)
            const content = element.innerHTML || '';
            
            // Skip if this looks like a legitimate code element
            if (element.tagName === 'CODE' || element.tagName === 'PRE') return;
            
            for (const pattern of xssPatterns) {
                if (pattern.test(content)) {
                    this.reportIssue('potential-xss', {
                        element: element.tagName,
                        pattern: pattern.toString(),
                        severity: 'medium'  // Reduce severity for selective patterns
                    });
                    break;
                }
            }
        };
        
        // Only check potentially dangerous elements, not all elements
        const dangerousSelectors = ['div', 'span', 'p', 'a', 'img', 'iframe', 'embed', 'object'];
        dangerousSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(checkElement);
        });
        
        // Monitor new content
        const setupXSSObserver = () => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            checkElement(node);
                        }
                    });
                });
            });
            
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        };
        
        if (document.body) {
            setupXSSObserver();
        } else {
            document.addEventListener('DOMContentLoaded', setupXSSObserver);
        }
    }
    
    checkMixedContent() {
        if (location.protocol === 'https:') {
            const insecureResources = document.querySelectorAll(
                'img[src^="http:"], script[src^="http:"], link[href^="http:"]'
            ).length;
            
            if (insecureResources > 0) {
                this.reportIssue('mixed-content', {
                    count: insecureResources,
                    risk: 'Security warnings, blocked content'
                });
            }
        }
    }
    
    reportIssue(type, details) {
        const issue = {
            type,
            details,
            timestamp: new Date().toISOString(),
            severity: this.getSeverity(type)
        };
        
        switch (type) {
            case 'memory-leak':
            case 'high-error-rate':
            case 'potential-xss':
                this.metrics.performanceIssues.push(issue);
                break;
            case 'csp-violation':
            case 'mixed-content':
                this.metrics.securityWarnings.push(issue);
                break;
            default:
                this.metrics.codeSmells.push(issue);
        }
        
        if (window.logger) {
            const logFunc = issue.severity === 'high' ? window.logger.warn : window.logger.info;
            if (logFunc && typeof logFunc === 'function') {
                logFunc('Quality issue detected:', issue);
            }
        }
    }
    
    getSeverity(type) {
        const highSeverity = ['memory-leak', 'high-error-rate', 'potential-xss', 'csp-violation'];
        return highSeverity.includes(type) ? 'high' : 'medium';
    }
    
    runQualityChecks() {
        // Periodic quality assessment
        const report = this.generateReport();
        
        if (window.logger && window.logger.info && report.issues > 0) {
            window.logger.info('Quality check completed:', {
                totalIssues: report.issues,
                highSeverity: report.highSeverity,
                memoryUsage: report.currentMemory
            });
        }
    }
    
    generateReport() {
        const allIssues = [
            ...this.metrics.performanceIssues,
            ...this.metrics.codeSmells,
            ...this.metrics.securityWarnings
        ];
        
        const highSeverityIssues = allIssues.filter(issue => issue.severity === 'high');
        
        const currentMemory = this.metrics.memoryUsage.length > 0 
            ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]
            : null;
        
        return {
            timestamp: new Date().toISOString(),
            issues: allIssues.length,
            highSeverity: highSeverityIssues.length,
            errorCount: this.metrics.errorCount,
            currentMemory: currentMemory ? `${(currentMemory.used / 1024 / 1024).toFixed(2)}MB` : 'N/A',
            details: {
                performance: this.metrics.performanceIssues,
                codeSmells: this.metrics.codeSmells,
                security: this.metrics.securityWarnings
            }
        };
    }
    
    getHealthScore() {
        const report = this.generateReport();
        let score = 100;
        
        // Deduct points for issues
        score -= report.highSeverity * 15; // High severity: -15 points each
        score -= (report.issues - report.highSeverity) * 5; // Medium severity: -5 points each
        score -= Math.min(report.errorCount * 2, 20); // Errors: -2 points each, max -20
        
        return Math.max(0, score);
    }
}

// Initialize code quality monitor
if (typeof window !== 'undefined') {
    window.codeQualityMonitor = new CodeQualityMonitor();
    
    // Expose health check function
    window.getCodeHealthScore = () => window.codeQualityMonitor.getHealthScore();
    window.getQualityReport = () => window.codeQualityMonitor.generateReport();
}

console.log('Code quality monitor loaded');