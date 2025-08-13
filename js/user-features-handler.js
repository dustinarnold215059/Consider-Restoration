// User Features Handler - Auto-populate forms and personalize content for logged-in users
console.log('👤 User features handler loaded');

class UserFeaturesHandler {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
    }

    initialize() {
        if (this.initialized) return;
        
        console.log('👤 Initializing user features handler');
        
        // Wait for CookieSessionManager to be ready
        if (typeof window.CookieSessionManager === 'undefined') {
            console.log('⏳ Waiting for CookieSessionManager...');
            setTimeout(() => this.initialize(), 100);
            return;
        }
        
        this.currentUser = window.CookieSessionManager.getCurrentUser();
        this.initialized = true;
        
        // Apply user features based on current page
        this.applyUserFeatures();
        
        // Listen for authentication changes
        window.addEventListener('userAuthChanged', (event) => {
            console.log('👤 User auth changed, updating features');
            this.currentUser = event.detail.user;
            setTimeout(() => this.applyUserFeatures(), 100);
        });
        
        window.addEventListener('userLoggedOut', () => {
            console.log('👤 User logged out, clearing features');
            this.currentUser = null;
            setTimeout(() => this.applyUserFeatures(), 100);
        });
        
        console.log('✅ User features handler initialized');
    }

    applyUserFeatures() {
        const currentPage = window.location.pathname;
        console.log('👤 Applying user features for page:', currentPage);
        console.log('👤 Current user:', this.currentUser ? this.currentUser.name : 'Not logged in');

        // Booking page auto-population
        if (currentPage.includes('booking.html')) {
            this.handleBookingPage();
        }
        
        // Membership page personalization
        if (currentPage.includes('membership.html')) {
            this.handleMembershipPage();
        }
        
        // Reviews page user pre-population
        if (currentPage.includes('reviews.html')) {
            this.handleReviewsPage();
        }
    }

    handleBookingPage() {
        console.log('📅 Handling booking page features');
        
        if (!this.currentUser) {
            console.log('📅 No user logged in, skipping booking auto-population');
            return;
        }
        
        const nameField = document.getElementById('clientName');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');
        
        if (nameField && !nameField.value) {
            nameField.value = this.currentUser.name || '';
            nameField.style.backgroundColor = '#f0f8ff'; // Light blue to show it's pre-filled
            console.log('📅 Pre-filled name:', this.currentUser.name);
        }
        
        if (emailField && !emailField.value) {
            emailField.value = this.currentUser.email || '';
            emailField.style.backgroundColor = '#f0f8ff';
            console.log('📅 Pre-filled email:', this.currentUser.email);
        }
        
        if (phoneField && !phoneField.value) {
            phoneField.value = this.currentUser.phone || '';
            phoneField.style.backgroundColor = '#f0f8ff';
            console.log('📅 Pre-filled phone:', this.currentUser.phone);
        }
        
        // Add a helpful message
        const bookingForm = document.querySelector('.booking-form');
        if (bookingForm && !document.getElementById('userWelcomeMessage')) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.id = 'userWelcomeMessage';
            welcomeMsg.style.cssText = `
                background: #e8f5e8;
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                border-left: 4px solid #27ae60;
                font-size: 14px;
            `;
            welcomeMsg.innerHTML = `
                <strong>✅ Welcome back, ${this.currentUser.name}!</strong><br>
                Your information has been pre-filled for faster booking.
            `;
            bookingForm.insertBefore(welcomeMsg, bookingForm.firstChild);
        }
    }

    handleMembershipPage() {
        console.log('💳 Handling membership page features');
        
        // Find membership CTA buttons and personalize them
        const membershipButtons = document.querySelectorAll('button[onclick*="openMembershipModal"], .cta-button, .btn-primary');
        
        membershipButtons.forEach(button => {
            if (button.textContent.includes('Join Now') || button.textContent.includes('Get Started')) {
                if (this.currentUser) {
                    const originalText = button.textContent;
                    if (!originalText.includes(this.currentUser.name)) {
                        button.textContent = `Join Now - ${this.currentUser.name}`;
                        button.style.backgroundColor = '#27ae60'; // Green to show it's personalized
                        console.log('💳 Personalized button:', button.textContent);
                    }
                } else {
                    // Reset to generic text when logged out
                    if (button.textContent.includes(' - ')) {
                        button.textContent = 'Join Now';
                        button.style.backgroundColor = '';
                    }
                }
            }
        });
        
        // Add personalized welcome message
        const membershipHero = document.querySelector('.membership-hero, .hero-section, .membership-intro');
        if (membershipHero && this.currentUser && !document.getElementById('membershipWelcome')) {
            const welcomeDiv = document.createElement('div');
            welcomeDiv.id = 'membershipWelcome';
            welcomeDiv.style.cssText = `
                background: rgba(39, 174, 96, 0.1);
                padding: 15px;
                margin: 15px 0;
                border-radius: 5px;
                text-align: center;
                font-weight: 500;
            `;
            welcomeDiv.innerHTML = `👋 Welcome ${this.currentUser.name}! Ready to take your wellness journey to the next level?`;
            
            // Insert after the hero title
            const heroTitle = membershipHero.querySelector('h1, h2, .hero-title');
            if (heroTitle) {
                heroTitle.parentNode.insertBefore(welcomeDiv, heroTitle.nextSibling);
            } else {
                membershipHero.appendChild(welcomeDiv);
            }
        } else if (!this.currentUser) {
            // Remove welcome message when logged out
            const existingWelcome = document.getElementById('membershipWelcome');
            if (existingWelcome) {
                existingWelcome.remove();
            }
        }
    }

    handleReviewsPage() {
        console.log('⭐ Handling reviews page features');
        
        if (!this.currentUser) {
            console.log('⭐ No user logged in, skipping review pre-population');
            return;
        }
        
        // Pre-populate review form if it exists
        const nameField = document.getElementById('reviewerName');
        if (nameField && !nameField.value) {
            nameField.value = this.currentUser.name || '';
            nameField.style.backgroundColor = '#f0f8ff';
            console.log('⭐ Pre-filled reviewer name:', this.currentUser.name);
        }
        
        // Add personalized message to review form
        const reviewForm = document.querySelector('.review-form, #reviewForm');
        if (reviewForm && !document.getElementById('reviewWelcomeMessage')) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.id = 'reviewWelcomeMessage';
            welcomeMsg.style.cssText = `
                background: #fff3cd;
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                border-left: 4px solid #ffc107;
                font-size: 14px;
            `;
            welcomeMsg.innerHTML = `
                <strong>⭐ Hi ${this.currentUser.name}!</strong><br>
                We'd love to hear about your experience with our services.
            `;
            reviewForm.insertBefore(welcomeMsg, reviewForm.firstChild);
        }
        
        // Personalize any "Leave a Review" buttons
        const reviewButtons = document.querySelectorAll('button[onclick*="review"], .review-button, button:contains("Review")');
        reviewButtons.forEach(button => {
            if (this.currentUser && button.textContent.includes('Leave a Review')) {
                const originalText = button.textContent;
                if (!originalText.includes(this.currentUser.name)) {
                    button.textContent = `Leave a Review - ${this.currentUser.name}`;
                    console.log('⭐ Personalized review button');
                }
            }
        });
    }

    // Helper method to refresh user features manually
    refresh() {
        this.currentUser = window.CookieSessionManager ? window.CookieSessionManager.getCurrentUser() : null;
        this.applyUserFeatures();
    }
}

// Create global instance
window.UserFeaturesHandler = new UserFeaturesHandler();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.UserFeaturesHandler.initialize();
    });
} else {
    // DOM already ready
    setTimeout(() => {
        window.UserFeaturesHandler.initialize();
    }, 200);
}

// Global convenience function
window.refreshUserFeatures = () => {
    if (window.UserFeaturesHandler) {
        window.UserFeaturesHandler.refresh();
    }
};

console.log('👤 User features handler script loaded');