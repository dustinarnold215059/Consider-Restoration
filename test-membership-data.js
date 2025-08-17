// Test membership data for admin panel testing
// Run this in browser console to add test memberships

// Create test memberships with different field names to test our fixes
const testMemberships = [
    {
        id: 1,
        userId: 1,
        membershipType: 'wellness', // Using membershipType field
        price: 75,
        status: 'active',
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        autoRenew: true,
        nextBillingDate: '2024-02-15',
        paymentHistory: [
            {
                id: 1,
                amount: 75,
                date: '2024-01-15T10:00:00',
                type: 'initial',
                status: 'completed',
                description: 'Initial membership payment'
            },
            {
                id: 2,
                amount: 75,
                date: '2024-08-01T10:00:00',
                type: 'auto-renewal',
                status: 'completed',
                description: 'Monthly membership auto-renewal'
            }
        ]
    },
    {
        id: 2,
        userId: 2,
        plan: 'restoration-plus', // Using plan field
        price: 140,
        status: 'active',
        startDate: '2024-02-01',
        endDate: '2024-03-01',
        autoRenew: false,
        nextBillingDate: '2024-03-01',
        paymentHistory: [
            {
                id: 3,
                amount: 140,
                date: '2024-02-01T10:00:00',
                type: 'initial',
                status: 'completed',
                description: 'Initial membership payment'
            }
        ]
    },
    {
        id: 3,
        userId: 3,
        typeName: 'therapeutic-elite', // Using typeName field
        price: 200,
        status: 'active',
        startDate: '2024-03-01',
        endDate: '2024-04-01',
        autoRenew: true,
        nextBillingDate: '2024-04-01',
        paymentHistory: [
            {
                id: 4,
                amount: 200,
                date: '2024-03-01T10:00:00',
                type: 'initial',
                status: 'completed',
                description: 'Initial membership payment'
            },
            {
                id: 5,
                amount: 200,
                date: '2024-08-10T10:00:00',
                type: 'auto-renewal',
                status: 'completed',
                description: 'Monthly membership auto-renewal'
            }
        ]
    }
];

// Function to add test memberships to localStorage
function addTestMemberships() {
    window.sharedMemberships = testMemberships;
    localStorage.setItem('massageMemberships', JSON.stringify(testMemberships));
    console.log('✅ Test memberships added successfully!');
    console.log('📊 Added', testMemberships.length, 'test memberships');
    
    // Calculate total test revenue
    let totalRevenue = 0;
    testMemberships.forEach(membership => {
        membership.paymentHistory.forEach(payment => {
            if (payment.status === 'completed') {
                totalRevenue += payment.amount;
            }
        });
    });
    console.log('💰 Total test revenue:', '$' + totalRevenue);
    
    // Refresh admin display if available
    if (typeof displayMemberships === 'function') {
        displayMemberships();
    }
    
    return testMemberships;
}

// Instructions
console.log('To add test memberships, run: addTestMemberships()');