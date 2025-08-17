// Script to add test membership data to see the admin panel fixes working
// Run this in the browser console on the admin page

function addTestMembershipUsers() {
    console.log('Adding test users with memberships...');
    
    // Get existing users
    const existingUsers = window.getUsers ? window.getUsers() : [];
    
    // Create test users with different membership types
    const testUsers = [
        {
            id: 101,
            username: 'wellness.user@test.com',
            passwordHash: '$2a$12$sample.hash.for.testing',
            name: 'Sarah Johnson',
            email: 'wellness.user@test.com',
            phone: '(555) 123-4567',
            role: 'user',
            membershipType: 'wellness',
            membershipStatus: 'active',
            membershipStartDate: '2024-01-15T00:00:00Z',
            totalAppointments: 3,
            lastVisit: '2024-08-10T00:00:00Z',
            createdAt: '2024-01-15T00:00:00Z'
        },
        {
            id: 102,
            username: 'restoration.user@test.com',
            passwordHash: '$2a$12$sample.hash.for.testing',
            name: 'Mike Rodriguez',
            email: 'restoration.user@test.com',
            phone: '(555) 234-5678',
            role: 'user',
            membershipType: 'restoration-plus',
            membershipStatus: 'active',
            membershipStartDate: '2024-02-01T00:00:00Z',
            totalAppointments: 5,
            lastVisit: '2024-08-12T00:00:00Z',
            createdAt: '2024-02-01T00:00:00Z'
        },
        {
            id: 103,
            username: 'elite.user@test.com',
            passwordHash: '$2a$12$sample.hash.for.testing',
            name: 'Jennifer Chen',
            email: 'elite.user@test.com',
            phone: '(555) 345-6789',
            role: 'user',
            membershipType: 'therapeutic-elite',
            membershipStatus: 'active',
            membershipStartDate: '2024-03-01T00:00:00Z',
            totalAppointments: 8,
            lastVisit: '2024-08-14T00:00:00Z',
            createdAt: '2024-03-01T00:00:00Z'
        }
    ];
    
    // Add test users to existing users
    const allUsers = [...existingUsers, ...testUsers];
    
    // Update the shared users
    if (window.sharedUsers) {
        window.sharedUsers = allUsers;
    }
    
    // Save to localStorage
    try {
        localStorage.setItem('massageUsers', JSON.stringify(allUsers));
        console.log('✅ Test membership users added successfully!');
        console.log('📊 Added 3 users with memberships:');
        console.log('- Wellness Member: Sarah Johnson ($75/month)');
        console.log('- Restoration Plus: Mike Rodriguez ($140/month)');
        console.log('- Therapeutic Elite: Jennifer Chen ($200/month)');
        console.log('💰 Expected total revenue: $415');
        
        // Refresh displays if available
        if (typeof displayMemberships === 'function') {
            displayMemberships();
        }
        if (typeof displayUsers === 'function') {
            displayUsers();
        }
        
        return testUsers;
    } catch (e) {
        console.error('❌ Failed to save test users:', e);
        return null;
    }
}

// Auto-run when loaded
console.log('Test membership users script loaded. Run addTestMembershipUsers() to add test data.');