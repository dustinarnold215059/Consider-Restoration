// Shared data storage for appointments and users across all pages
// This simulates a backend database that would normally store this data

// Initialize shared appointments array (cleared - ready for real appointments)
window.sharedAppointments = [];

// Clear all appointment data from localStorage on page load
function clearAppointmentData() {
    try {
        localStorage.removeItem('massageAppointments');
        console.log('✅ All test appointments cleared from localStorage');
    } catch (e) {
        console.warn('Could not clear appointment data from localStorage:', e);
    }
}

// Clear appointment data immediately - DISABLED to allow appointments to persist
// clearAppointmentData(); // This was clearing appointments on every page load!

// Force cleanup of insecure user data on page load
function forceSecurityCleanup() {
    try {
        const savedUsers = localStorage.getItem('massageUsers');
        if (savedUsers) {
            const parsedUsers = JSON.parse(savedUsers);
            
            // Check if any users have insecure hashes
            const hasInsecureUsers = parsedUsers.some(user => 
                !user.passwordHash || 
                (user.passwordHash && !user.passwordHash.startsWith('$2a$'))
            );
            
            if (hasInsecureUsers) {
                console.log('🔒 Found insecure user data in localStorage, cleaning up...');
                localStorage.removeItem('massageUsers');
                console.log('🔒 Insecure user data cleared, will use secure defaults');
            }
        }
    } catch (e) {
        console.warn('Could not check user data security:', e);
    }
}

// Run security cleanup immediately
forceSecurityCleanup();

// Initialize shared users array - passwords now properly hashed with bcrypt
window.sharedUsers = [
    {
        id: 1,
        username: 'admin@considerrestoration.com',
        passwordHash: '$2a$12$6eXN8j6ylNu6iF3usMK2vuMlTNsIarmuFPyNaMjwdYssGxizTYprG',
        name: 'Christopher Admin',
        email: 'admin@considerrestoration.com',
        phone: '(555) 123-4567',
        role: 'admin',
        totalAppointments: 0,
        lastVisit: null
    },
    {
        id: 2,
        username: 'test@example.com',
        passwordHash: 'simple_password123', // Simple password for easy testing
        name: 'Test User',
        email: 'test@example.com',
        phone: '(555) 123-4567',
        role: 'user',
        totalAppointments: 5,
        lastVisit: '2024-01-15'
    },
    {
        id: 3,
        username: 'john.doe@email.com',
        passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '(555) 234-5678',
        role: 'user',
        totalAppointments: 12,
        lastVisit: '2024-01-10',
        preferences: 'Prefers applied neurology techniques, focus on pain management'
    },
    {
        id: 3,
        username: 'jane.smith@email.com',
        passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
        name: 'Jane Smith',
        email: 'jane.smith@email.com',
        phone: '(555) 345-6789',
        role: 'user',
        totalAppointments: 8,
        lastVisit: '2024-01-08',
        preferences: 'Prefers prenatal massage, needs gentle approach'
    },
    {
        id: 4,
        username: 'dustin@email.com',
        passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
        name: 'Dustin',
        email: 'dustin@email.com',
        phone: '(555) 456-7890',
        role: 'user',
        totalAppointments: 5,
        lastVisit: '2024-01-12',
        preferences: 'Prefers deep tissue massage, athletic recovery focus'
    },
    // Simple test user with plaintext password for debugging
    {
        id: 999,
        username: 'test@test.com',
        password: 'test123', // Plaintext for fallback
        passwordHash: 'test123', // Will be handled by fallback logic
        name: 'Test User',
        email: 'test@test.com',
        phone: '(555) 999-0000',
        role: 'user'
    }
];

// Initialize shared memberships array - start empty, real memberships will be created via membership page
window.sharedMemberships = [];

// Try to load existing memberships from localStorage
try {
    const storedMemberships = localStorage.getItem('massageMemberships');
    if (storedMemberships) {
        window.sharedMemberships = JSON.parse(storedMemberships);
        console.log('✅ Loaded existing memberships from localStorage:', window.sharedMemberships.length);
    }
} catch (e) {
    console.warn('Could not load memberships from localStorage:', e);
}

// Membership helper functions
window.getMemberships = function() {
    return window.sharedMemberships;
};

window.addMembership = function(membership) {
    if (!membership || typeof membership !== 'object') {
        console.error('Invalid membership data provided');
        return null;
    }
    
    const newId = Math.max(0, ...window.sharedMemberships.map(m => m.id)) + 1;
    membership.id = newId;
    membership.paymentHistory = membership.paymentHistory || [];
    
    window.sharedMemberships.push(membership);
    
    // Save to localStorage
    try {
        localStorage.setItem('massageMemberships', JSON.stringify(window.sharedMemberships));
        console.log('✅ Membership saved to localStorage');
    } catch (e) {
        console.warn('Could not save membership to localStorage:', e);
    }
    
    window.dispatchEvent(new CustomEvent('membershipAdded', { detail: membership }));
    return membership;
};

window.updateMembership = function(membershipId, updates) {
    const membershipIndex = window.sharedMemberships.findIndex(m => m.id === parseInt(membershipId));
    if (membershipIndex !== -1) {
        Object.assign(window.sharedMemberships[membershipIndex], updates);
        
        // Save to localStorage
        try {
            localStorage.setItem('massageMemberships', JSON.stringify(window.sharedMemberships));
            console.log('✅ Membership updated in localStorage');
        } catch (e) {
            console.warn('Could not update membership in localStorage:', e);
        }
        
        window.dispatchEvent(new CustomEvent('membershipUpdated', { 
            detail: window.sharedMemberships[membershipIndex] 
        }));
        return window.sharedMemberships[membershipIndex];
    }
    return null;
};

window.getUserMemberships = function(userId) {
    return window.sharedMemberships.filter(m => m.userId === parseInt(userId));
};

window.getActiveMemberships = function() {
    return window.sharedMemberships.filter(m => m.status === 'active');
};

window.getMembershipRevenue = function(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let totalRevenue = 0;
    let paymentCount = 0;
    
    window.sharedMemberships.forEach(membership => {
        membership.paymentHistory.forEach(payment => {
            const paymentDate = new Date(payment.date);
            if (paymentDate >= start && paymentDate <= end && payment.status === 'paid') {
                totalRevenue += payment.amount;
                paymentCount++;
            }
        });
    });
    
    return { totalRevenue, paymentCount };
};

window.cancelMembership = function(membershipId, reason = '', comments = '') {
    const membershipIndex = window.sharedMemberships.findIndex(m => m.id === parseInt(membershipId));
    if (membershipIndex !== -1) {
        const membership = window.sharedMemberships[membershipIndex];
        
        // Update membership status
        membership.status = 'cancelled';
        membership.cancelDate = new Date().toISOString().slice(0, 10);
        membership.cancelReason = reason;
        membership.cancelComments = comments;
        membership.autoRenew = false;
        
        // Calculate remaining sessions until end date
        if (!membership.remainingSessions) {
            membership.remainingSessions = membership.sessionsIncluded - (membership.sessionsUsed || 0);
        }
        
        // Update the user's membership status as well
        const userId = membership.userId;
        if (window.updateUser) {
            window.updateUser(userId, {
                membershipStatus: 'cancelled',
                membershipPlan: null
            });
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('massageMemberships', JSON.stringify(window.sharedMemberships));
            console.log('✅ Membership cancellation saved to localStorage');
        } catch (e) {
            console.warn('Could not save membership cancellation to localStorage:', e);
        }
        
        window.dispatchEvent(new CustomEvent('membershipCancelled', { 
            detail: membership 
        }));
        
        console.log('✅ Membership cancelled:', membership);
        return membership;
    }
    return null;
};

window.reactivateMembership = function(membershipId) {
    const membershipIndex = window.sharedMemberships.findIndex(m => m.id === parseInt(membershipId));
    if (membershipIndex !== -1) {
        const membership = window.sharedMemberships[membershipIndex];
        
        // Reactivate membership
        membership.status = 'active';
        membership.autoRenew = true;
        delete membership.cancelDate;
        delete membership.cancelReason;
        delete membership.cancelComments;
        
        // Extend end date by one month from today
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        membership.endDate = newEndDate.toISOString().slice(0, 10);
        
        // Update the user's membership status
        const userId = membership.userId;
        if (window.updateUser) {
            window.updateUser(userId, {
                membershipStatus: 'active',
                membershipPlan: membership.type
            });
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('massageMemberships', JSON.stringify(window.sharedMemberships));
            console.log('✅ Membership reactivation saved to localStorage');
        } catch (e) {
            console.warn('Could not save membership reactivation to localStorage:', e);
        }
        
        window.dispatchEvent(new CustomEvent('membershipReactivated', { 
            detail: membership 
        }));
        
        console.log('✅ Membership reactivated:', membership);
        return membership;
    }
    return null;
};

// Function to calculate federal holidays for a given year
function getFederalHolidays(year) {
    const holidays = [];
    
    // New Year's Day - January 1
    holidays.push({
        date: `${year}-01-01`,
        reason: "New Year's Day",
        type: 'federal_holiday'
    });
    
    // Martin Luther King Jr. Day - 3rd Monday in January
    const mlkDay = getNthWeekday(year, 0, 1, 3); // 3rd Monday in January
    holidays.push({
        date: formatDate(mlkDay),
        reason: "Martin Luther King Jr. Day",
        type: 'federal_holiday'
    });
    
    // Presidents' Day - 3rd Monday in February
    const presidentsDay = getNthWeekday(year, 1, 1, 3); // 3rd Monday in February
    holidays.push({
        date: formatDate(presidentsDay),
        reason: "Presidents' Day",
        type: 'federal_holiday'
    });
    
    // Memorial Day - Last Monday in May
    const memorialDay = getLastWeekday(year, 4, 1); // Last Monday in May
    holidays.push({
        date: formatDate(memorialDay),
        reason: "Memorial Day",
        type: 'federal_holiday'
    });
    
    // Independence Day - July 4
    holidays.push({
        date: `${year}-07-04`,
        reason: "Independence Day",
        type: 'federal_holiday'
    });
    
    // Labor Day - 1st Monday in September
    const laborDay = getNthWeekday(year, 8, 1, 1); // 1st Monday in September
    holidays.push({
        date: formatDate(laborDay),
        reason: "Labor Day",
        type: 'federal_holiday'
    });
    
    // Columbus Day - 2nd Monday in October
    const columbusDay = getNthWeekday(year, 9, 1, 2); // 2nd Monday in October
    holidays.push({
        date: formatDate(columbusDay),
        reason: "Columbus Day",
        type: 'federal_holiday'
    });
    
    // Veterans Day - November 11
    holidays.push({
        date: `${year}-11-11`,
        reason: "Veterans Day",
        type: 'federal_holiday'
    });
    
    // Thanksgiving Day - 4th Thursday in November
    const thanksgiving = getNthWeekday(year, 10, 4, 4); // 4th Thursday in November
    holidays.push({
        date: formatDate(thanksgiving),
        reason: "Thanksgiving Day",
        type: 'federal_holiday'
    });
    
    // Christmas Day - December 25
    holidays.push({
        date: `${year}-12-25`,
        reason: "Christmas Day",
        type: 'federal_holiday'
    });
    
    return holidays;
}

// Helper function to get the Nth occurrence of a weekday in a month
function getNthWeekday(year, month, weekday, n) {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysUntilTarget = (weekday - firstWeekday + 7) % 7;
    const targetDate = 1 + daysUntilTarget + (n - 1) * 7;
    return new Date(year, month, targetDate);
}

// Helper function to get the last occurrence of a weekday in a month
function getLastWeekday(year, month, weekday) {
    const lastDay = new Date(year, month + 1, 0);
    const lastWeekday = lastDay.getDay();
    const daysBack = (lastWeekday - weekday + 7) % 7;
    return new Date(year, month, lastDay.getDate() - daysBack);
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

// Function to generate all Saturdays and Sundays for a given year
function getWeekendsForYear(year) {
    try {
        const weekends = [];
        const startDate = new Date(year, 0, 1); // January 1st
        const endDate = new Date(year, 11, 31); // December 31st
        
        // Safety check for valid year
        if (year < 2020 || year > 2030) {
            console.warn(`getWeekendsForYear: Skipping invalid year ${year}`);
            return [];
        }
        
        let currentDate = new Date(startDate);
        let iterations = 0;
        const maxIterations = 366; // Max days in a year plus safety buffer
        
        // Iterate through all days of the year with safety limit
        while (currentDate <= endDate && iterations < maxIterations) {
            const dayOfWeek = currentDate.getDay();
            
            // Saturday = 6, Sunday = 0
            if (dayOfWeek === 0) { // Sunday
                weekends.push({
                    date: formatDate(currentDate),
                    reason: 'Sunday - Closed',
                    type: 'weekend'
                });
            } else if (dayOfWeek === 6) { // Saturday
                weekends.push({
                    date: formatDate(currentDate),
                    reason: 'Saturday - Closed',
                    type: 'weekend'
                });
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
            iterations++;
        }
        
        if (iterations >= maxIterations) {
            console.error(`getWeekendsForYear: Exceeded max iterations for year ${year}`);
        }
        
        return weekends;
    } catch (error) {
        console.error(`getWeekendsForYear: Error generating weekends for year ${year}:`, error);
        return [];
    }
}

// Function to generate all auto-blocked dates (federal holidays + weekends) for multiple years
function generateAutoBlockedDates(startYear = new Date().getFullYear(), yearsAhead = 5) {
    try {
        console.log(`generateAutoBlockedDates: Generating for ${startYear} to ${startYear + yearsAhead} (${yearsAhead + 1} years)`);
        const allAutoBlocked = [];
        let idCounter = 10000;
        
        // Safety limit to prevent excessive processing
        const maxYears = Math.min(yearsAhead, 3); // Cap at 3 years for performance
        
        // Generate blocked dates for current year plus specified years ahead
        for (let year = startYear; year <= startYear + maxYears; year++) {
            try {
                const federalHolidays = getFederalHolidays(year);
                const weekends = getWeekendsForYear(year);
                
                // Combine holidays and weekends for this year
                const yearBlocked = [...federalHolidays, ...weekends];
                console.log(`generateAutoBlockedDates: Year ${year} - ${federalHolidays.length} holidays, ${weekends.length} weekends`);
                
                // Add to main array with unique IDs and auto_generated flag
                yearBlocked.forEach(item => {
                    allAutoBlocked.push({
                        ...item,
                        id: idCounter++,
                        auto_generated: true,
                        year: year // Track which year this belongs to
                    });
                });
            } catch (yearError) {
                console.error(`generateAutoBlockedDates: Error processing year ${year}:`, yearError);
            }
        }
        
        console.log(`generateAutoBlockedDates: Generated ${allAutoBlocked.length} total blocked dates`);
        
        // Sort all dates chronologically
        return allAutoBlocked.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('generateAutoBlockedDates: Critical error:', error);
        return []; // Return empty array as fallback
    }
}

// Initialize blocked dates with manual entries plus auto-generated federal holidays and weekends
const manualBlockedDates = [
    {
        id: 1,
        date: '2025-08-15',
        reason: 'Personal Day',
        type: 'personal'
    },
    {
        id: 2,
        date: '2025-08-20',
        reason: 'Medical Appointment',
        type: 'medical'
    },
    {
        id: 3,
        date: '2025-08-25',
        reason: 'Weekend Training',
        type: 'training'
    },
    {
        id: 4,
        date: '2025-08-30',
        reason: 'End of Month Vacation',
        type: 'vacation'
    }
];

// Generate auto-blocked dates for current year + 2 years ahead (2025-2027)
// This provides adequate buffer while maintaining performance
const autoBlockedDates = generateAutoBlockedDates(new Date().getFullYear(), 2);

// Combine manual and auto-generated blocked dates
window.sharedBlockedDates = [...manualBlockedDates, ...autoBlockedDates];

// Initialize shared reviews array - All reviews are now dynamic (imported from client's other site + new user submissions)
window.sharedReviews = [
    // First 4 reviews were originally dynamic test reviews
    {
        id: 1,
        name: 'Sarah M.',
        rating: 5,
        review: 'Christopher\'s expertise in applied neurology changed my life. After months of chronic pain, I finally found relief through his specialized techniques.',
        service: 'Applied Neurology',
        createdAt: '2024-08-05T10:30:00.000Z',
        verified: true
    },
    {
        id: 2,
        name: 'Jennifer K.',
        rating: 5,
        review: 'The prenatal massage sessions helped me through my entire pregnancy. Christopher is incredibly knowledgeable and made me feel completely comfortable.',
        service: 'Prenatal Massage',
        createdAt: '2024-08-04T14:15:00.000Z',
        verified: true
    },
    {
        id: 3,
        name: 'Mike R.',
        rating: 5,
        review: 'The online booking system is so convenient, and the results speak for themselves. Best therapeutic massage I\'ve ever had.',
        service: 'Integrated Massage',
        createdAt: '2024-08-03T16:20:00.000Z',
        verified: true
    },
    {
        id: 4,
        name: 'Emily J.',
        rating: 4,
        review: 'Great experience! The Thai-Stretch Fusion really helped with my flexibility issues after my workout routine.',
        service: 'Thai-Stretch Fusion',
        createdAt: '2024-08-02T11:45:00.000Z',
        verified: true
    },
    // Imported client reviews from other site - now dynamic and manageable
    {
        id: 5,
        name: 'Anonymous',
        rating: 5,
        review: 'He is great!',
        service: 'Thai-Stretch Fusion',
        createdAt: '2025-07-15T12:00:00Z',
        verified: true
    },
    {
        id: 6,
        name: 'Michael A.',
        rating: 5,
        review: 'Extremely skilled LMT! Focuses on your areas of need and delivers the right amount of pressure. Highly recommend Chris.',
        service: 'Integrative Massage',
        createdAt: '2025-07-10T12:00:00Z',
        verified: true
    },
    {
        id: 7,
        name: 'Anonymous',
        rating: 5,
        review: 'One of the best massage therapists I have ever experienced. I felt comfortable the whole time which is important as a woman. Furthermore, I felt the environment very relaxing and therapeutic.',
        service: 'Integrative Massage',
        createdAt: '2025-07-05T12:00:00Z',
        verified: true
    },
    {
        id: 8,
        name: 'Deborah M.',
        rating: 5,
        review: 'Christopher has great skill and knowledge.',
        service: 'Integrative Massage',
        createdAt: '2025-06-25T12:00:00Z',
        verified: true
    },
    {
        id: 9,
        name: 'Hannah G.',
        rating: 5,
        review: 'Chris is very skilled and professional. He helped me with debilitating neck pain I\'ve had for a few weeks. He went the extra mile by offering new exercises to do at home in between my sessions, which I find a lot of practitioners don\'t offer.',
        service: 'Structural Integration',
        createdAt: '2025-06-20T12:00:00Z',
        verified: true
    },
    {
        id: 10,
        name: 'Reid N.',
        rating: 5,
        review: 'Great experience, thankful for his expertise and kindness.',
        service: 'Structural Integration',
        createdAt: '2025-05-15T12:00:00Z',
        verified: true
    },
    {
        id: 11,
        name: 'Anonymous',
        rating: 5,
        review: 'Informative and relaxing.',
        service: 'Structural Integration',
        createdAt: '2025-04-20T12:00:00Z',
        verified: true
    },
    {
        id: 12,
        name: 'Laura F.',
        rating: 5,
        review: 'Terrific!!!!',
        service: 'Structural Integration',
        createdAt: '2025-04-15T12:00:00Z',
        verified: true
    },
    {
        id: 13,
        name: 'Renee B.',
        rating: 5,
        review: 'Christopher is amazing! Always leave feeling relaxed and refreshed.',
        service: 'Gift Certificate 30 Minute Massage',
        createdAt: '2025-03-10T12:00:00Z',
        verified: true
    },
    {
        id: 14,
        name: 'Cindy K.',
        rating: 5,
        review: 'I always get off the table feeling so relaxed, I\'m going to bring my PJ\'s next time!',
        service: 'Structural Integration',
        createdAt: '2025-01-25T12:00:00Z',
        verified: true
    },
    {
        id: 15,
        name: 'Linda H.',
        rating: 5,
        review: 'Christopher was fantastic',
        service: 'Structural Integration',
        createdAt: '2025-01-20T12:00:00Z',
        verified: true
    },
    {
        id: 16,
        name: 'Jennifer J.',
        rating: 5,
        review: 'The space is warm and inviting. Christopher is very knowledgeable in his practice and always offers stretches and things I can do at home to combat my problem areas. I highly recommend him.',
        service: 'Structural Integration',
        createdAt: '2024-12-15T12:00:00Z',
        verified: true
    },
    {
        id: 17,
        name: 'Anonymous',
        rating: 5,
        review: 'Christopher is a rockstar! I felt amazing when I woke up this morning!',
        service: 'Structural Integration',
        createdAt: '2024-12-10T12:00:00Z',
        verified: true
    },
    {
        id: 18,
        name: 'Anonymous',
        rating: 5,
        review: 'Christopher is truly gifted in massage. He creates a safe, comfy space so you can fully submerge into the experience. Christopher is very compassionate, understanding and professional.',
        service: 'Structural Integration',
        createdAt: '2024-11-25T12:00:00Z',
        verified: true
    },
    {
        id: 19,
        name: 'Anonymous',
        rating: 5,
        review: 'Excellent massage!!',
        service: 'Structural Integration',
        createdAt: '2024-11-20T12:00:00Z',
        verified: true
    },
    {
        id: 20,
        name: 'Rosemary D.',
        rating: 5,
        review: 'Totally professional and relaxing experience. Would highly recommend a visit.',
        service: 'Structural Integration',
        createdAt: '2024-11-15T12:00:00Z',
        verified: true
    },
    {
        id: 21,
        name: 'Liz G.',
        rating: 5,
        review: 'You should definitely make an appointment with Christopher. I felt very comfortable and he worked on my areas of need.',
        service: 'Gift Certificate 30 Minute Massage',
        createdAt: '2024-11-10T12:00:00Z',
        verified: true
    },
    {
        id: 22,
        name: 'Lisa S.',
        rating: 5,
        review: 'Christopher is very knowledgeable and sensitive to areas of concern. He has helped my healing accelerate greatly with regular maintenance!',
        service: 'Structural Integration',
        createdAt: '2024-10-25T12:00:00Z',
        verified: true
    },
    {
        id: 23,
        name: 'Anonymous',
        rating: 5,
        review: 'Relaxing and professional. Best massage I have had for a long time. I am booking every 2 weeks - the relaxation is wonderful.',
        service: 'Structural Integration',
        createdAt: '2024-10-20T12:00:00Z',
        verified: true
    },
    {
        id: 24,
        name: 'Anonymous',
        rating: 5,
        review: 'First massage in a long time. Second time overall. Apprehensive going in but the calming and caring professionalism that Christopher provided dispelled my anxiety. Will definitely be a returning customer. Thank you Christopher.',
        service: 'Structural Integration',
        createdAt: '2024-10-15T12:00:00Z',
        verified: true
    },
    {
        id: 25,
        name: 'Anonymous',
        rating: 5,
        review: 'Christopher really knows how to improve your health. I\'m so grateful for finding his business.',
        service: 'Structural Integration',
        createdAt: '2024-10-10T12:00:00Z',
        verified: true
    },
    {
        id: 26,
        name: 'Christine S.',
        rating: 5,
        review: 'Christopher is the absolute best!',
        service: 'Structural Integration',
        createdAt: '2024-10-05T12:00:00Z',
        verified: true
    },
    {
        id: 27,
        name: 'Meredith S.',
        rating: 5,
        review: 'Christopher is always so patient and thorough! He listens to ALL of my issues and makes connections that I never could have imagined! He is truly a miracle worker!!',
        service: 'Structural Integration',
        createdAt: '2024-10-01T12:00:00Z',
        verified: true
    },
    {
        id: 28,
        name: 'Anonymous',
        rating: 5,
        review: 'go often',
        service: 'Structural Integration',
        createdAt: '2024-09-25T12:00:00Z',
        verified: true
    },
    {
        id: 29,
        name: 'Ronald C H.',
        rating: 5,
        review: 'Christopher is the best',
        service: 'Structural Integration',
        createdAt: '2024-09-20T12:00:00Z',
        verified: true
    },
    {
        id: 30,
        name: 'Eric A.',
        rating: 5,
        review: 'Patient and pays attention',
        service: 'Structural Integration',
        createdAt: '2024-09-15T12:00:00Z',
        verified: true
    }
];

// Helper functions for managing shared data
window.addAppointment = function(appointmentData) {
    console.log('shared-data.js: addAppointment called with:', appointmentData);
    
    // Validate required fields
    if (!appointmentData.date || !appointmentData.time || !appointmentData.clientName) {
        console.error('shared-data.js: Missing required appointment fields:', appointmentData);
        return null;
    }
    
    const newId = Math.max(...window.sharedAppointments.map(apt => apt.id), 0) + 1;
    const newAppointment = {
        id: newId,
        ...appointmentData,
        createdAt: new Date().toISOString()
    };
    
    window.sharedAppointments.push(newAppointment);
    console.log('shared-data.js: Appointment added successfully. Total appointments:', window.sharedAppointments.length);
    console.log('shared-data.js: New appointment:', newAppointment);
    
    // Trigger custom event to notify other parts of the app
    window.dispatchEvent(new CustomEvent('appointmentAdded', { detail: newAppointment }));
    console.log('shared-data.js: appointmentAdded event dispatched');
    
    return newAppointment;
};

window.updateAppointment = function(appointmentId, updates) {
    const appointmentIndex = window.sharedAppointments.findIndex(apt => apt.id === appointmentId);
    if (appointmentIndex !== -1) {
        window.sharedAppointments[appointmentIndex] = { 
            ...window.sharedAppointments[appointmentIndex], 
            ...updates 
        };
        
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('appointmentUpdated', { 
            detail: window.sharedAppointments[appointmentIndex] 
        }));
        
        return window.sharedAppointments[appointmentIndex];
    }
    return null;
};

window.getAppointments = function() {
    console.log('shared-data.js: getAppointments called. Returning', window.sharedAppointments.length, 'appointments');
    return [...window.sharedAppointments];
};

window.getUsers = function() {
    return [...window.sharedUsers];
};

window.addUser = function(userData) {
    // Use provided ID if it exists, otherwise generate new one
    const newId = userData.id || Math.max(...window.sharedUsers.map(user => user.id), 0) + 1;
    const newUser = { 
        ...userData,
        id: newId,
        totalAppointments: userData.totalAppointments || 0,
        lastVisit: userData.lastVisit || null
    };
    window.sharedUsers.push(newUser);
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('userAdded', { detail: newUser }));
    
    return newUser;
};

window.updateUser = function(userId, updates) {
    const userIndex = window.sharedUsers.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
        window.sharedUsers[userIndex] = { 
            ...window.sharedUsers[userIndex], 
            ...updates 
        };
        
        // Trigger custom event
        window.dispatchEvent(new CustomEvent('userUpdated', { 
            detail: window.sharedUsers[userIndex] 
        }));
        
        return window.sharedUsers[userIndex];
    }
    return null;
};

window.deleteUser = function(userId) {
    try {
        console.log('shared-data.js: deleteUser called with ID:', userId, 'Type:', typeof userId);
        
        // Convert to number for consistent comparison
        const numericId = parseInt(userId);
        console.log('shared-data.js: Converted to numeric ID:', numericId);
        
        // Check if sharedUsers exists
        if (!window.sharedUsers) {
            console.error('shared-data.js: window.sharedUsers is not available');
            return null;
        }
        
        console.log('shared-data.js: Total users available:', window.sharedUsers.length);
        
        const userIndex = window.sharedUsers.findIndex(u => {
            console.log('shared-data.js: Comparing user ID', u.id, 'with target', numericId);
            return u.id === numericId;
        });
        
        console.log('shared-data.js: Found user at index:', userIndex);
        
        if (userIndex !== -1) {
            const deletedUser = window.sharedUsers.splice(userIndex, 1)[0];
            console.log('shared-data.js: Successfully deleted user:', deletedUser);
            window.dispatchEvent(new CustomEvent('userDeleted', { detail: deletedUser }));
            return deletedUser;
        }
        
        console.log('shared-data.js: User not found with ID:', numericId);
        return null;
    } catch (error) {
        console.error('shared-data.js: Error in deleteUser:', error);
        return null;
    }
};

window.getBlockedDates = function() {
    // Check if we need to extend blocked dates for future years
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(...window.sharedBlockedDates
        .filter(date => date.auto_generated)
        .map(date => parseInt(date.date.split('-')[0])));
    
    // If we're close to the end of our pre-generated dates (within 1 year), extend them
    if (maxYear - currentYear < 2) {
        console.log('Extending auto-blocked dates for future years...');
        
        // Keep manual dates and extend auto-generated ones
        const manualDates = window.sharedBlockedDates.filter(date => !date.auto_generated);
        const newAutoBlocked = generateAutoBlockedDates(currentYear, 2); // Extend to 2 years ahead for performance
        
        window.sharedBlockedDates = [...manualDates, ...newAutoBlocked];
        
        // Save to localStorage
        try {
            localStorage.setItem('massageBlockedDates', JSON.stringify(window.sharedBlockedDates));
            console.log('Extended blocked dates saved to localStorage');
        } catch (e) {
            console.warn('Could not save extended blocked dates to localStorage:', e);
        }
    }
    
    return [...window.sharedBlockedDates];
};

// Review management functions
window.addReview = function(reviewData) {
    const newId = Math.max(...window.sharedReviews.map(r => r.id), 0) + 1;
    const newReview = {
        id: newId,
        ...reviewData,
        createdAt: new Date().toISOString(),
        verified: true // All reviews from logged-in users are considered verified
    };
    window.sharedReviews.push(newReview);
    window.dispatchEvent(new CustomEvent('reviewAdded', { detail: newReview }));
    console.log('Review added:', newReview);
    return newReview;
};

window.getReviews = function() {
    return [...window.sharedReviews];
};

window.deleteReview = function(reviewId) {
    try {
        console.log('shared-data.js: deleteReview called with ID:', reviewId, 'Type:', typeof reviewId);
        
        // Convert to number for consistent comparison
        const numericId = parseInt(reviewId);
        console.log('shared-data.js: Converted to numeric ID:', numericId);
        
        // Check if sharedReviews exists
        if (!window.sharedReviews) {
            console.error('shared-data.js: window.sharedReviews is not available');
            return null;
        }
        
        console.log('shared-data.js: Total reviews available:', window.sharedReviews.length);
        
        const reviewIndex = window.sharedReviews.findIndex(r => {
            console.log('shared-data.js: Comparing review ID', r.id, 'with target', numericId);
            return r.id === numericId;
        });
        
        console.log('shared-data.js: Found review at index:', reviewIndex);
        
        if (reviewIndex !== -1) {
            const deletedReview = window.sharedReviews.splice(reviewIndex, 1)[0];
            console.log('shared-data.js: Successfully deleted review:', deletedReview);
            window.dispatchEvent(new CustomEvent('reviewDeleted', { detail: deletedReview }));
            return deletedReview;
        }
        
        console.log('shared-data.js: Review not found with ID:', numericId);
        return null;
    } catch (error) {
        console.error('shared-data.js: Error in deleteReview:', error);
        return null;
    }
};

// Auto-save to localStorage for persistence across page reloads (with throttling)
let saveTimeout = null;
function saveToStorage() {
    // Throttle saves to prevent excessive localStorage writes
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(() => {
        try {
            console.log('shared-data.js: Saving to localStorage...');
            localStorage.setItem('massageAppointments', JSON.stringify(window.sharedAppointments));
            localStorage.setItem('massageUsers', JSON.stringify(window.sharedUsers));
            localStorage.setItem('massageBlockedDates', JSON.stringify(window.sharedBlockedDates));
            localStorage.setItem('massageReviews', JSON.stringify(window.sharedReviews));
            console.log('shared-data.js: localStorage save completed');
        } catch (e) {
            console.warn('shared-data.js: Could not save to localStorage:', e);
        }
    }, 100); // Wait 100ms before saving to batch multiple changes
}

// Load from localStorage on page load
function loadFromStorage() {
    try {
        const savedAppointments = localStorage.getItem('massageAppointments');
        const savedUsers = localStorage.getItem('massageUsers');
        const savedBlockedDates = localStorage.getItem('massageBlockedDates');
        const savedReviews = localStorage.getItem('massageReviews');
        
        if (savedAppointments) {
            window.sharedAppointments = JSON.parse(savedAppointments);
        }
        if (savedUsers) {
            const parsedUsers = JSON.parse(savedUsers);
            
            // SECURITY: Check if users have plaintext passwords and migrate them
            let needsPasswordMigration = false;
            const migratedUsers = parsedUsers.map(user => {
                if (user.password && !user.passwordHash) {
                    console.log('🔒 Migrating plaintext password for user:', user.name);
                    needsPasswordMigration = true;
                    
                    // Convert plaintext password to secure bcrypt hash
                    let passwordHash;
                    if (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) {
                        const salt = dcodeIO.bcrypt.genSaltSync(12);
                        passwordHash = dcodeIO.bcrypt.hashSync(user.password, salt);
                        console.log('🔒 Converted plaintext password to secure bcrypt hash');
                    } else {
                        console.error('🔒 Cannot convert password - bcrypt not available');
                        return user; // Return unchanged if cannot hash securely
                    }
                    
                    // Remove plaintext password and add hash
                    const { password, ...userWithoutPassword } = user;
                    return {
                        ...userWithoutPassword,
                        passwordHash: passwordHash
                    };
                } else if (user.password && user.passwordHash) {
                    // If both exist, remove plaintext and keep hash
                    console.log('🔒 Removing redundant plaintext password for user:', user.name);
                    needsPasswordMigration = true;
                    const { password, ...userWithoutPassword } = user;
                    return userWithoutPassword;
                }
                return user;
            });
            
            // Check if we need to update admin user data
            const adminUser = migratedUsers.find(u => u.role === 'admin');
            if (adminUser && (adminUser.username !== 'admin@considerrestoration.com' || adminUser.email !== 'admin@considerrestoration.com')) {
                console.log('🔒 Updating admin credentials in localStorage...');
                needsPasswordMigration = true;
                // Reset to fresh data with updated admin credentials
                window.sharedUsers = [
                    {
                        id: 1,
                        username: 'admin@considerrestoration.com',
                        passwordHash: '$2a$12$6eXN8j6ylNu6iF3usMK2vuMlTNsIarmuFPyNaMjwdYssGxizTYprG',
                        name: 'Christopher Admin',
                        email: 'admin@considerrestoration.com',
                        phone: '(555) 123-4567',
                        role: 'admin',
                        totalAppointments: 0,
                        lastVisit: null
                    },
                    ...migratedUsers.filter(u => u.role !== 'admin')
                ];
            } else {
                window.sharedUsers = migratedUsers;
            }
            
            // Save migrated data back to localStorage if passwords were migrated
            if (needsPasswordMigration) {
                console.log('🔒 Saving password-migrated user data to localStorage...');
                saveToStorage();
            }
        }
        if (savedBlockedDates) {
            const parsedBlockedDates = JSON.parse(savedBlockedDates);
            
            // Separate manual dates from localStorage (keep user-added dates)
            const manualDates = parsedBlockedDates.filter(date => !date.auto_generated);
            
            // Always regenerate auto-blocked dates for current year + 2 years ahead to ensure accuracy
            const currentAutoBlocked = generateAutoBlockedDates(new Date().getFullYear(), 2);
            
            // Combine manual dates with fresh auto-generated dates
            window.sharedBlockedDates = [...manualDates, ...currentAutoBlocked];
            
            console.log('Loaded manual blocked dates from localStorage:', manualDates.length);
            console.log('Generated auto-blocked dates (holidays + weekends):', currentAutoBlocked.length);
            
            // Save the updated combination back to localStorage
            localStorage.setItem('massageBlockedDates', JSON.stringify(window.sharedBlockedDates));
        } else {
            console.log('No blocked dates in localStorage, using defaults plus auto-generated dates:', window.sharedBlockedDates.length);
            // Save the default blocked dates to localStorage for first time users
            localStorage.setItem('massageBlockedDates', JSON.stringify(window.sharedBlockedDates));
        }
        
        // Load reviews from localStorage
        if (savedReviews) {
            const parsedReviews = JSON.parse(savedReviews);
            
            // Only reset if there are significantly fewer reviews (like less than 10)
            // This prevents the reset when admin deletes reviews legitimately
            if (parsedReviews.length < 10) {
                console.log('Very few reviews found, importing all 30 client reviews from other site...');
                // Keep any new user-submitted reviews and merge with imported client reviews
                const userSubmittedReviews = parsedReviews.filter(r => r.id > 30);
                // Use imported client reviews + any new user submissions
                const importedClientReviews = [...window.sharedReviews]; // Current 30 imported reviews
                window.sharedReviews = [...importedClientReviews, ...userSubmittedReviews];
                saveToStorage(); // Save the updated data
                console.log('Reviews updated. Total reviews (including imported client reviews):', window.sharedReviews.length);
            } else {
                // Use the saved reviews as-is (including deletions by admin)
                window.sharedReviews = parsedReviews;
                console.log('Loaded reviews from localStorage:', parsedReviews.length, 'reviews');
            }
        } else {
            // No saved reviews, use imported client reviews and save them
            console.log('No saved reviews found, using 30 imported client reviews');
            saveToStorage();
        }
    } catch (e) {
        console.warn('Could not load from localStorage:', e);
    }
}

// Listen for changes and auto-save
window.addEventListener('appointmentAdded', saveToStorage);
window.addEventListener('appointmentUpdated', saveToStorage);
window.addEventListener('userAdded', saveToStorage);
window.addEventListener('userUpdated', saveToStorage);
window.addEventListener('userDeleted', saveToStorage);
window.addEventListener('reviewAdded', saveToStorage);
window.addEventListener('reviewDeleted', saveToStorage);

// Function to force reset localStorage with fresh data
window.resetUserData = function() {
    console.log('Resetting user data to default values...');
    window.sharedUsers = [
        {
            id: 1,
            username: 'admin@considerrestoration.com',
            passwordHash: '$2a$12$6eXN8j6ylNu6iF3usMK2vuMlTNsIarmuFPyNaMjwdYssGxizTYprG',
            name: 'Christopher Admin',
            email: 'admin@considerrestoration.com',
            phone: '(555) 123-4567',
            role: 'admin',
            totalAppointments: 0,
            lastVisit: null
        },
        {
            id: 2,
            username: 'john.doe@email.com',
            passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
            name: 'John Doe',
            email: 'john.doe@email.com',
            phone: '(555) 234-5678',
            role: 'user',
            totalAppointments: 12,
            lastVisit: '2024-01-10',
            preferences: 'Prefers applied neurology techniques, focus on pain management'
        },
        {
            id: 3,
            username: 'jane.smith@email.com',
            passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
            name: 'Jane Smith',
            email: 'jane.smith@email.com',
            phone: '(555) 345-6789',
            role: 'user',
            totalAppointments: 8,
            lastVisit: '2024-01-08',
            preferences: 'Prefers prenatal massage, needs gentle approach'
        },
        {
            id: 4,
            username: 'dustin@email.com',
            passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
            name: 'Dustin',
            email: 'dustin@email.com',
            phone: '(555) 456-7890',
            role: 'user',
            totalAppointments: 5,
            lastVisit: '2024-01-12',
            preferences: 'Prefers deep tissue massage, athletic recovery focus'
        }
    ];
    saveToStorage();
    console.log('User data reset complete. New users:', window.sharedUsers);
};

// Function to force refresh reviews data
window.resetReviewsData = function() {
    console.log('Resetting reviews data to include all 30 imported client reviews...');
    localStorage.removeItem('massageReviews');
    location.reload(); // Reload the page to get fresh review data
};

// Function to force password migration and cleanup
window.forcePasswordCleanup = function() {
    console.log('🔒 Forcing password cleanup and migration...');
    
    // Remove old user data to force reload with hashed passwords
    localStorage.removeItem('massageUsers');
    
    // Reset user data to ensure hashed passwords
    window.sharedUsers = [
        {
            id: 1,
            username: 'admin@considerrestoration.com',
            passwordHash: '$2a$12$6eXN8j6ylNu6iF3usMK2vuMlTNsIarmuFPyNaMjwdYssGxizTYprG',
            name: 'Christopher Admin',
            email: 'admin@considerrestoration.com',
            phone: '(555) 123-4567',
            role: 'admin',
            totalAppointments: 0,
            lastVisit: null
        },
        {
            id: 2,
            username: 'john.doe@email.com',
            passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
            name: 'John Doe',
            email: 'john.doe@email.com',
            phone: '(555) 234-5678',
            role: 'user',
            totalAppointments: 12,
            lastVisit: '2024-01-10',
            preferences: 'Prefers applied neurology techniques, focus on pain management'
        },
        {
            id: 3,
            username: 'jane.smith@email.com',
            passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
            name: 'Jane Smith',
            email: 'jane.smith@email.com',
            phone: '(555) 345-6789',
            role: 'user',
            totalAppointments: 8,
            lastVisit: '2024-01-08',
            preferences: 'Prefers prenatal massage, needs gentle approach'
        },
        {
            id: 4,
            username: 'dustin@email.com',
            passwordHash: '$2a$12$acf09WFgZBMo8AJYQNE3n.aNnJp.RxCAdcdSr0FeQALXmaR4c5/VO',
            name: 'Dustin',
            email: 'dustin@email.com',
            phone: '(555) 456-7890',
            role: 'user',
            totalAppointments: 5,
            lastVisit: '2024-01-12',
            preferences: 'Prefers deep tissue massage, athletic recovery focus'
        }
    ];
    
    // Force save the clean data
    saveToStorage();
    
    console.log('🔒 Password cleanup complete. All passwords are now hashed.');
    return window.sharedUsers;
};

// Load data when script loads (with error handling to prevent crashes)
try {
    console.log('shared-data.js: Starting loadFromStorage()...');
    loadFromStorage();
    console.log('shared-data.js: loadFromStorage() completed successfully');
} catch (error) {
    console.error('shared-data.js: Error during loadFromStorage():', error);
    // Fallback to default data if loading fails
    console.log('shared-data.js: Using fallback default data');
}