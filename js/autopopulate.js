// Simple, clean auto-populate functionality
// This file contains ONLY the auto-populate feature

console.log('🔧 Auto-populate script loaded');

// Wait for page to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit more to ensure everything is ready
    setTimeout(function() {
        autoPopulateFromURL();
    }, 500);
});

function autoPopulateFromURL() {
    console.log('🚀 Starting auto-populate...');
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    
    console.log('URL params:', urlParams.toString());
    console.log('Service param:', serviceParam);
    
    if (!serviceParam) {
        console.log('No service parameter found');
        return;
    }
    
    // Find the service dropdown
    const serviceSelect = document.getElementById('service');
    if (!serviceSelect) {
        console.error('Service dropdown not found');
        return;
    }
    
    console.log('Service dropdown found:', serviceSelect);
    
    // Find the matching option
    const targetOption = serviceSelect.querySelector(`option[value="${serviceParam}"]`);
    if (!targetOption) {
        console.error('Service option not found for:', serviceParam);
        return;
    }
    
    console.log('Target option found:', targetOption.textContent);
    
    // Set the selection
    serviceSelect.value = serviceParam;
    
    // Visual feedback
    serviceSelect.style.backgroundColor = '#e8f5e8';
    serviceSelect.style.border = '2px solid #27ae60';
    
    // Update price
    const priceElement = document.getElementById('totalPrice');
    if (priceElement && targetOption.dataset.price) {
        priceElement.textContent = targetOption.dataset.price;
        console.log('Price updated to:', targetOption.dataset.price);
    }
    
    // Trigger change event to ensure other scripts know about the selection
    serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('✅ Auto-populate complete!');
    
    // Show success message
    setTimeout(() => {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 9999;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        notification.textContent = `✅ ${targetOption.textContent} selected!`;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }, 1000);
}