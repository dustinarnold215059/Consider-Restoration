// Authentication and Security Tests
// Tests for user authentication, session management, and security features

describe('Authentication System', () => {
    let originalCurrentUser;

    beforeAll(() => {
        // Backup current user session
        originalCurrentUser = localStorage.getItem('currentUser');
    });

    afterAll(() => {
        // Restore original session
        if (originalCurrentUser) {
            localStorage.setItem('currentUser', originalCurrentUser);
        } else {
            localStorage.removeItem('currentUser');
        }
    });

    beforeEach(() => {
        // Clear authentication state
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        
        // Clear any auth modals
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
    });

    it('should validate password strength requirements', async () => {
        if (window.validatePassword) {
            // Test weak passwords
            expect(window.validatePassword('123')).toBeFalsy();
            expect(window.validatePassword('password')).toBeFalsy();
            expect(window.validatePassword('12345678')).toBeFalsy();
            
            // Test strong passwords
            expect(window.validatePassword('StrongPass123!')).toBeTruthy();
            expect(window.validatePassword('MySecure2024#')).toBeTruthy();
        }
    });

    it('should hash passwords before storage', async () => {
        if (window.hashPassword) {
            const plainPassword = 'testPassword123';
            const hashedPassword = await window.hashPassword(plainPassword);
            
            expect(hashedPassword).toBeTruthy();
            expect(hashedPassword).not.toBe(plainPassword);
            expect(hashedPassword.length).toBeGreaterThan(20);
        }
    });

    it('should verify password against hash', async () => {
        if (window.hashPassword && window.verifyPassword) {
            const plainPassword = 'verifyTest456';
            const hashedPassword = await window.hashPassword(plainPassword);
            
            // Correct password should verify
            const isValid = await window.verifyPassword(plainPassword, hashedPassword);
            expect(isValid).toBeTruthy();
            
            // Wrong password should not verify
            const isInvalid = await window.verifyPassword('wrongPassword', hashedPassword);
            expect(isInvalid).toBeFalsy();
        }
    });

    it('should create new user account', async () => {
        const userData = {
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'SecurePass123!',
            phone: '555-0123'
        };

        if (window.saveUserAccount) {
            const savedUser = await window.saveUserAccount(userData);
            
            expect(savedUser).toBeTruthy();
            expect(savedUser.id).toBeTruthy();
            expect(savedUser.email).toBe(userData.email);
            expect(savedUser.name).toBe(userData.name);
            expect(savedUser.password).not.toBe(userData.password); // Should be hashed
        }
    });

    it('should prevent duplicate email registration', async () => {
        const existingUser = {
            id: 1,
            name: 'Existing User',
            email: 'existing@example.com',
            password: 'hashedPassword123'
        };

        // Add existing user to data
        if (!window.sharedUsers) window.sharedUsers = [];
        window.sharedUsers.push(existingUser);

        const duplicateUser = {
            name: 'Duplicate User',
            email: 'existing@example.com',
            password: 'AnotherPass456!'
        };

        // Try to register with same email
        if (window.isEmailRegistered) {
            const isDuplicate = window.isEmailRegistered(duplicateUser.email);
            expect(isDuplicate).toBeTruthy();
        }
    });

    it('should authenticate user with correct credentials', async () => {
        // Create test user
        const testUser = {
            id: 2,
            name: 'Auth Test User',
            email: 'authtest@example.com',
            password: 'correctPassword'
        };

        if (!window.sharedUsers) window.sharedUsers = [];
        window.sharedUsers.push(testUser);

        if (window.authenticateUser) {
            const authResult = await window.authenticateUser('authtest@example.com', 'correctPassword');
            expect(authResult).toBeTruthy();
            expect(authResult.email).toBe(testUser.email);
        }
    });

    it('should reject invalid login credentials', async () => {
        const testUser = {
            id: 3,
            name: 'Security Test User',
            email: 'security@example.com',
            password: 'validPassword'
        };

        if (!window.sharedUsers) window.sharedUsers = [];
        window.sharedUsers.push(testUser);

        if (window.authenticateUser) {
            // Wrong password
            let authResult = await window.authenticateUser('security@example.com', 'wrongPassword');
            expect(authResult).toBeFalsy();
            
            // Non-existent user
            authResult = await window.authenticateUser('nonexistent@example.com', 'anyPassword');
            expect(authResult).toBeFalsy();
        }
    });

    it('should manage user session properly', async () => {
        const userSession = {
            id: 4,
            name: 'Session User',
            email: 'session@example.com',
            role: 'user'
        };

        // Set user session
        localStorage.setItem('currentUser', JSON.stringify(userSession));
        localStorage.setItem('isLoggedIn', 'true');

        if (window.getCurrentUser) {
            const currentUser = window.getCurrentUser();
            expect(currentUser).toBeTruthy();
            expect(currentUser.email).toBe(userSession.email);
        }

        if (window.isUserLoggedIn) {
            expect(window.isUserLoggedIn()).toBeTruthy();
        }
    });

    it('should validate session expiration', async () => {
        const expiredSession = {
            id: 5,
            name: 'Expired User',
            email: 'expired@example.com',
            role: 'user',
            loginTime: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
        };

        localStorage.setItem('currentUser', JSON.stringify(expiredSession));

        if (window.validateSession) {
            const isValid = window.validateSession();
            expect(isValid).toBeFalsy();
        }
    });

    it('should handle admin role authentication', async () => {
        const adminUser = {
            id: 999,
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
            password: 'adminPassword'
        };

        if (!window.sharedUsers) window.sharedUsers = [];
        window.sharedUsers.push(adminUser);

        if (window.authenticateUser) {
            const authResult = await window.authenticateUser('admin@example.com', 'adminPassword');
            expect(authResult).toBeTruthy();
            expect(authResult.role).toBe('admin');
        }

        // Test admin access validation
        localStorage.setItem('currentUser', JSON.stringify(adminUser));

        if (window.isAdmin) {
            expect(window.isAdmin()).toBeTruthy();
        }
    });

    it('should protect sensitive data', async () => {
        // Test that passwords are not exposed in user objects
        const userData = {
            name: 'Privacy User',
            email: 'privacy@example.com',
            password: 'sensitivePassword123'
        };

        if (window.saveUserAccount) {
            const savedUser = await window.saveUserAccount(userData);
            
            // Password should be hashed or not returned
            expect(savedUser.password).not.toBe(userData.password);
            
            // User object should not contain plain text password
            const userJSON = JSON.stringify(savedUser);
            expect(userJSON).not.toContain(userData.password);
        }
    });

    it('should handle localStorage tampering protection', async () => {
        if (window.protectAppointmentData) {
            // Initialize protection
            window.protectAppointmentData();

            const originalData = JSON.stringify([
                { id: 1, service: 'Test Service', price: 80 }
            ]);

            localStorage.setItem('massageAppointments', originalData);

            // Simulate tampering
            const tamperedData = JSON.stringify([
                { id: 1, service: 'Test Service', price: 1 }
            ]);

            localStorage.setItem('massageAppointments', tamperedData);

            // Protection should detect and restore
            await TestUtils.sleep(100);

            const restoredData = localStorage.getItem('massageAppointments');
            const parsed = JSON.parse(restoredData);
            
            // Price should be restored to original value
            expect(parsed[0].price).not.toBe(1);
        }
    });

    it('should handle authentication failures gracefully', async () => {
        // Test with null/undefined inputs
        if (window.authenticateUser) {
            let result = await window.authenticateUser(null, null);
            expect(result).toBeFalsy();
            
            result = await window.authenticateUser('', '');
            expect(result).toBeFalsy();
            
            result = await window.authenticateUser(undefined, undefined);
            expect(result).toBeFalsy();
        }
    });

    it('should log security events', async () => {
        // Mock console to capture security logs
        const originalConsoleLog = console.log;
        const logs = [];
        console.log = (...args) => logs.push(args.join(' '));

        try {
            // Trigger security events
            if (window.authenticateUser) {
                await window.authenticateUser('hacker@evil.com', 'wrongpass');
            }

            if (window.validateSession) {
                window.validateSession();
            }

            // Check if security events were logged
            const securityLogs = logs.filter(log => 
                log.includes('security') || 
                log.includes('authentication') || 
                log.includes('failed')
            );

            expect(securityLogs.length).toBeGreaterThan(0);

        } finally {
            // Restore original console
            console.log = originalConsoleLog;
        }
    });

    it('should handle concurrent login attempts', async () => {
        const credentials = {
            email: 'concurrent@example.com',
            password: 'testPassword'
        };

        // Create test user
        if (!window.sharedUsers) window.sharedUsers = [];
        window.sharedUsers.push({
            id: 100,
            email: credentials.email,
            password: credentials.password,
            name: 'Concurrent User'
        });

        // Simulate multiple concurrent login attempts
        if (window.authenticateUser) {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(window.authenticateUser(credentials.email, credentials.password));
            }

            const results = await Promise.all(promises);
            
            // All should succeed (no race conditions)
            results.forEach(result => {
                expect(result).toBeTruthy();
            });
        }
    });

    it('should validate JWT token format if used', async () => {
        // If JWT tokens are implemented
        if (window.generateJWT) {
            const payload = { userId: 1, email: 'jwt@example.com' };
            const token = window.generateJWT(payload);

            expect(token).toBeTruthy();
            expect(typeof token).toBe('string');
            
            // JWT should have 3 parts separated by dots
            const parts = token.split('.');
            expect(parts).toHaveLength(3);
        }
    });
});