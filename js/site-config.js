/**
 * Site Configuration
 * Centralized configuration for business hours, settings, and other configurable data
 */

const SiteConfig = {
    // Business Information
    business: {
        name: "Consider Restoration",
        owner: "Christopher Rembisz, LMT",
        phone: "(734) 419-4116",
        email: "info@considerrestoration.com",
        address: {
            street: "123 Main Street", // TODO: Add actual street address
            city: "Livonia",
            state: "MI",
            zipCode: "48150", // TODO: Add actual zip code
            country: "US"
        },
        coordinates: {
            latitude: "42.3684",
            longitude: "-83.3532"
        }
    },

    // Business Hours - Configurable without code changes
    businessHours: {
        // Day of week: 0=Sunday, 1=Monday, etc.
        1: { // Monday
            open: true,
            hours: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM'],
            displayHours: '10:00 AM - 4:00 PM'
        },
        2: { // Tuesday
            open: true,
            hours: ['11:00 AM', '2:00 PM'],
            displayHours: 'By appointment only'
        },
        3: { // Wednesday
            open: true,
            hours: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'],
            displayHours: '9:45 AM - 5:30 PM'
        },
        4: { // Thursday
            open: true,
            hours: ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'],
            displayHours: '12:00 PM - 7:00 PM'
        },
        5: { // Friday
            open: true,
            hours: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'],
            displayHours: '10:00 AM - 6:00 PM'
        },
        6: { // Saturday
            open: false,
            hours: [],
            displayHours: 'Closed'
        },
        0: { // Sunday
            open: false,
            hours: [],
            displayHours: 'Closed'
        }
    },

    // Services Configuration
    services: {
        'mindful-start': {
            name: 'Mindful Start Massage',
            price: 70.00,
            duration: 60,
            description: 'Personalized bodywork session combining massage techniques tailored to your specific needs.'
        },
        'integrated': {
            name: 'Integrated Massage',
            price: 100.00,
            duration: 90,
            description: 'Comprehensive bodywork addressing multiple concerns with various modalities.'
        },
        'thai-stretch': {
            name: 'Thai-Stretch Fusion',
            price: 120.00,
            duration: 90,
            description: 'Dynamic stretching combined with massage for improved mobility and flexibility.'
        },
        'neurology': {
            name: 'Applied Neurology Consultation',
            price: 150.00,
            duration: 120,
            description: 'Specialized assessment and treatment using neurology-based techniques.'
        },
        'prenatal': {
            name: 'Prenatal Massage',
            price: 90.00,
            duration: 60,
            description: 'Safe, gentle massage therapy specifically designed for expecting mothers.'
        }
    },

    // UI Configuration
    ui: {
        toastDuration: {
            success: 4000,
            error: 8000,
            warning: 6000,
            info: 5000
        },
        animationDuration: 300,
        loadingTimeout: 30000
    },

    // API Configuration
    api: {
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    },

    // Development Settings
    development: {
        enableConsoleLogging: false, // Set to true for development
        enablePerformanceMonitoring: false,
        enableDetailedErrors: false
    },

    // PWA Settings
    pwa: {
        installPromptDelay: 3000,
        installPromptDuration: 10000
    },

    // Schema.org structured data
    schema: {
        businessType: "LocalBusiness",
        ratingValue: "4.9",
        reviewCount: "47",
        priceRange: "$70-$330",
        currenciesAccepted: "USD",
        paymentAccepted: "Cash, Credit Card, Debit Card, Online Payment",
        areaServed: [
            { city: "Livonia", state: "Michigan" },
            { city: "Plymouth", state: "Michigan" },
            { city: "Canton", state: "Michigan" },
            { city: "Westland", state: "Michigan" },
            { city: "Farmington Hills", state: "Michigan" }
        ]
    },

    // Utility methods
    getBusinessHours(dayOfWeek) {
        return this.businessHours[dayOfWeek] || { open: false, hours: [], displayHours: 'Closed' };
    },

    getAvailableTimeSlots(dayOfWeek) {
        const dayConfig = this.getBusinessHours(dayOfWeek);
        return dayConfig.open ? dayConfig.hours : [];
    },

    getService(serviceKey) {
        return this.services[serviceKey] || null;
    },

    getAllServices() {
        return Object.keys(this.services).map(key => ({
            key,
            ...this.services[key]
        }));
    },

    getFullAddress() {
        const addr = this.business.address;
        return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
    },

    isDevelopment() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               hostname.includes('localhost') ||
               window.location.protocol === 'file:';
    }
};

// Make config available globally
window.SiteConfig = SiteConfig;

// For backward compatibility, also create the old timeSlots object
window.timeSlots = {};
Object.keys(SiteConfig.businessHours).forEach(day => {
    window.timeSlots[day] = SiteConfig.businessHours[day].hours;
});