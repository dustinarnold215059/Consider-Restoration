// Booking page initialization - Ultra-lightweight to prevent crashes
// Handles booking page startup without blocking operations

(function() {
    'use strict';
    
    console.log('📅 Booking page initialization started');
    
    // Simple initialization without complex dependencies
    function initializeBooking() {
        try {
            console.log('📅 Booking initialization complete');
            
            // Dispatch ready event for other scripts that need it
            window.dispatchEvent(new CustomEvent('bookingPageReady'));
            
        } catch (error) {
            console.error('📅 Booking initialization error:', error);
        }
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBooking);
    } else {
        initializeBooking();
    }
    
    // Handle auth state changes specifically for booking
    window.addEventListener('userAuthChanged', function(event) {
        console.log('📅 User auth changed in booking page');
        // Update any booking-specific UI elements
    });
    
    // Graceful error handling for missing services
    window.addEventListener('error', function(event) {
        console.error('📅 Booking page error:', event.error);
        
        // Don't let errors crash the page
        event.preventDefault();
        return true;
    });
    
})();