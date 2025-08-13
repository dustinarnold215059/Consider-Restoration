// Automated Testing Suite for Christopher's Massage Therapy Website
// Comprehensive testing framework with visual reporting

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            errors: []
        };
        this.startTime = 0;
        this.endTime = 0;
        this.currentSuite = null;
        this.beforeHooks = [];
        this.afterHooks = [];
        this.beforeEachHooks = [];
        this.afterEachHooks = [];
    }

    // Test suite definition
    describe(suiteName, callback) {
        console.log(`\n🧪 Running test suite: ${suiteName}`);
        this.currentSuite = suiteName;
        callback();
        this.currentSuite = null;
    }

    // Individual test definition
    it(testName, callback) {
        const test = {
            suite: this.currentSuite,
            name: testName,
            callback,
            status: 'pending'
        };
        this.tests.push(test);
    }

    // Lifecycle hooks
    beforeAll(callback) {
        this.beforeHooks.push(callback);
    }

    afterAll(callback) {
        this.afterHooks.push(callback);
    }

    beforeEach(callback) {
        this.beforeEachHooks.push(callback);
    }

    afterEach(callback) {
        this.afterEachHooks.push(callback);
    }

    // Assertion methods
    expect(actual) {
        return new TestExpectation(actual);
    }

    // Run all tests
    async run() {
        console.log('🚀 Starting test suite execution...\n');
        this.startTime = Date.now();

        // Run before hooks
        for (const hook of this.beforeHooks) {
            try {
                await hook();
            } catch (error) {
                console.error('❌ Before hook failed:', error);
            }
        }

        // Execute tests
        for (const test of this.tests) {
            await this.executeTest(test);
        }

        // Run after hooks
        for (const hook of this.afterHooks) {
            try {
                await hook();
            } catch (error) {
                console.error('❌ After hook failed:', error);
            }
        }

        this.endTime = Date.now();
        this.generateReport();
    }

    async executeTest(test) {
        this.results.total++;
        
        try {
            // Run beforeEach hooks
            for (const hook of this.beforeEachHooks) {
                await hook();
            }

            // Execute the test
            console.log(`  ⏳ ${test.name}`);
            await test.callback();
            
            test.status = 'passed';
            this.results.passed++;
            console.log(`  ✅ ${test.name}`);

            // Run afterEach hooks
            for (const hook of this.afterEachHooks) {
                await hook();
            }

        } catch (error) {
            test.status = 'failed';
            test.error = error;
            this.results.failed++;
            this.results.errors.push({
                test: test.name,
                suite: test.suite,
                error: error.message,
                stack: error.stack
            });
            console.log(`  ❌ ${test.name}: ${error.message}`);
        }
    }

    generateReport() {
        const duration = this.endTime - this.startTime;
        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);

        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed} ✅`);
        console.log(`Failed: ${this.results.failed} ❌`);
        console.log(`Pass Rate: ${passRate}%`);
        console.log(`Duration: ${duration}ms`);
        console.log('='.repeat(60));

        if (this.results.errors.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.errors.forEach((error, index) => {
                console.log(`\n${index + 1}. ${error.suite} > ${error.test}`);
                console.log(`   Error: ${error.error}`);
                if (error.stack) {
                    console.log(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
                }
            });
        }

        // Generate HTML report
        this.generateHTMLReport();

        return this.results;
    }

    generateHTMLReport() {
        const duration = this.endTime - this.startTime;
        const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        const timestamp = new Date().toLocaleString();

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - Christopher's Massage Therapy</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: linear-gradient(135deg, #3A7D99, #5A9BB8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-card.failed {
            background: linear-gradient(135deg, #d32f2f, #f44336);
        }

        .stat-card.passed {
            background: linear-gradient(135deg, #388e3c, #4caf50);
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
        }

        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }

        .progress-bar {
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }

        .progress-fill {
            height: 100%;
            background: ${passRate >= 90 ? '#4caf50' : passRate >= 70 ? '#ff9800' : '#f44336'};
            width: ${passRate}%;
            transition: width 0.3s ease;
        }

        .test-results {
            margin-top: 30px;
        }

        .test-suite {
            margin-bottom: 30px;
        }

        .suite-title {
            background: #f0f0f0;
            padding: 15px;
            border-left: 4px solid #3A7D99;
            font-weight: bold;
            color: #333;
        }

        .test-case {
            padding: 10px 15px;
            border-left: 4px solid transparent;
            margin: 5px 0;
        }

        .test-case.passed {
            background: #f1f8e9;
            border-left-color: #4caf50;
        }

        .test-case.failed {
            background: #ffebee;
            border-left-color: #f44336;
        }

        .test-case .test-name {
            font-weight: 500;
        }

        .test-case .test-error {
            color: #d32f2f;
            font-size: 0.9rem;
            margin-top: 5px;
            font-family: monospace;
        }

        .metadata {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 0.9rem;
        }

        @media (max-width: 768px) {
            .container {
                padding: 15px;
                margin: 10px;
            }
            
            .summary {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Test Report - Christopher's Massage Therapy</h1>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${this.results.total}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${this.results.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${this.results.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${passRate}%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
        </div>

        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>

        <div class="test-results">
            ${this.generateTestResultsHTML()}
        </div>

        <div class="metadata">
            <p><strong>Generated:</strong> ${timestamp}</p>
            <p><strong>Duration:</strong> ${duration}ms</p>
            <p><strong>Environment:</strong> ${navigator.userAgent}</p>
        </div>
    </div>
</body>
</html>`;

        // Create report element
        const reportElement = document.createElement('div');
        reportElement.innerHTML = html;
        
        // Open in new window or display inline
        if (window.location.pathname.includes('test')) {
            document.body.innerHTML = html;
        } else {
            const newWindow = window.open('', '_blank');
            newWindow.document.write(html);
            newWindow.document.close();
        }
    }

    generateTestResultsHTML() {
        const suites = {};
        
        // Group tests by suite
        this.tests.forEach(test => {
            const suite = test.suite || 'General Tests';
            if (!suites[suite]) {
                suites[suite] = [];
            }
            suites[suite].push(test);
        });

        let html = '';
        Object.entries(suites).forEach(([suiteName, tests]) => {
            html += `
                <div class="test-suite">
                    <div class="suite-title">${suiteName}</div>
                    ${tests.map(test => `
                        <div class="test-case ${test.status}">
                            <div class="test-name">
                                ${test.status === 'passed' ? '✅' : '❌'} ${test.name}
                            </div>
                            ${test.error ? `<div class="test-error">${test.error.message}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        });

        return html;
    }
}

// Test Expectation class for assertions
class TestExpectation {
    constructor(actual) {
        this.actual = actual;
    }

    toBe(expected) {
        if (this.actual !== expected) {
            throw new Error(`Expected ${this.actual} to be ${expected}`);
        }
    }

    toEqual(expected) {
        if (JSON.stringify(this.actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(this.actual)} to equal ${JSON.stringify(expected)}`);
        }
    }

    toBeTruthy() {
        if (!this.actual) {
            throw new Error(`Expected ${this.actual} to be truthy`);
        }
    }

    toBeFalsy() {
        if (this.actual) {
            throw new Error(`Expected ${this.actual} to be falsy`);
        }
    }

    toContain(expected) {
        if (!this.actual.includes(expected)) {
            throw new Error(`Expected ${this.actual} to contain ${expected}`);
        }
    }

    toHaveLength(expected) {
        if (this.actual.length !== expected) {
            throw new Error(`Expected length ${this.actual.length} to be ${expected}`);
        }
    }

    toBeInstanceOf(expected) {
        if (!(this.actual instanceof expected)) {
            throw new Error(`Expected ${this.actual} to be instance of ${expected.name}`);
        }
    }

    toThrow() {
        let threw = false;
        try {
            this.actual();
        } catch (error) {
            threw = true;
        }
        if (!threw) {
            throw new Error('Expected function to throw');
        }
    }

    toBeNull() {
        if (this.actual !== null) {
            throw new Error(`Expected ${this.actual} to be null`);
        }
    }

    toBeUndefined() {
        if (this.actual !== undefined) {
            throw new Error(`Expected ${this.actual} to be undefined`);
        }
    }

    toBeGreaterThan(expected) {
        if (this.actual <= expected) {
            throw new Error(`Expected ${this.actual} to be greater than ${expected}`);
        }
    }

    toBeLessThan(expected) {
        if (this.actual >= expected) {
            throw new Error(`Expected ${this.actual} to be less than ${expected}`);
        }
    }
}

// Utility functions for testing
window.TestUtils = {
    // Wait for element to appear
    waitForElement: (selector, timeout = 5000) => {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    },

    // Simulate user interactions
    click: (element) => {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) {
            element.click();
        }
    },

    type: (element, text) => {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) {
            element.value = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    },

    // Wait for async operations
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // Mock functions
    mockFunction: () => {
        const calls = [];
        const fn = (...args) => {
            calls.push(args);
            return fn.mockReturnValue;
        };
        fn.calls = calls;
        fn.mockReturnValue = undefined;
        fn.mockImplementation = (impl) => {
            fn.mockImplementation = impl;
        };
        return fn;
    }
};

// Create global test runner instance
window.TestRunner = new TestRunner();
window.describe = window.TestRunner.describe.bind(window.TestRunner);
window.it = window.TestRunner.it.bind(window.TestRunner);
window.expect = window.TestRunner.expect.bind(window.TestRunner);
window.beforeAll = window.TestRunner.beforeAll.bind(window.TestRunner);
window.afterAll = window.TestRunner.afterAll.bind(window.TestRunner);
window.beforeEach = window.TestRunner.beforeEach.bind(window.TestRunner);
window.afterEach = window.TestRunner.afterEach.bind(window.TestRunner);

export { TestRunner, TestExpectation };