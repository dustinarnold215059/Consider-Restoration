// Lazy Loading Implementation for Consider Restoration Website
// Improves performance by loading images only when they're about to enter viewport

class LazyImageLoader {
    constructor() {
        this.imageObserver = null;
        this.init();
    }

    init() {
        // Check if Intersection Observer is supported
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            // Fallback for older browsers
            this.loadAllImages();
        }

        // Setup for dynamically added images
        this.setupMutationObserver();
    }

    setupIntersectionObserver() {
        const options = {
            root: null, // Use viewport as root
            rootMargin: '50px', // Start loading 50px before image enters viewport
            threshold: 0.01 // Trigger when 1% of image is visible
        };

        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.imageObserver.unobserve(entry.target);
                }
            });
        }, options);

        // Observe all lazy images
        this.observeImages();
    }

    observeImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            this.imageObserver.observe(img);
        });
    }

    loadImage(img) {
        // Show loading placeholder
        this.showLoadingState(img);

        const imageLoader = new Image();
        
        imageLoader.onload = () => {
            // Image loaded successfully
            img.src = img.dataset.src;
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
            
            // Remove data-src to prevent reprocessing
            delete img.dataset.src;
            
            // Add fade-in animation
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease-in-out';
            
            // Trigger reflow and fade in
            img.offsetHeight;
            img.style.opacity = '1';
        };

        imageLoader.onerror = () => {
            // Handle image loading error
            this.handleImageError(img);
        };

        // Start loading
        imageLoader.src = img.dataset.src;
    }

    showLoadingState(img) {
        img.classList.add('lazy-loading');
        
        // Add loading styles if not already present
        if (!document.getElementById('lazy-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'lazy-loading-styles';
            style.textContent = `
                .lazy-loading {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: loading-shimmer 2s infinite;
                }
                
                .lazy-loaded {
                    animation: none;
                    background: none;
                }
                
                @keyframes loading-shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                .image-error {
                    background: #f8f9fa;
                    border: 2px dashed #dee2e6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #6c757d;
                    font-size: 0.9rem;
                }
            `;
            document.head.appendChild(style);
        }
    }

    handleImageError(img) {
        img.classList.remove('lazy-loading');
        img.classList.add('image-error');
        
        // Create error placeholder
        const errorDiv = document.createElement('div');
        errorDiv.className = 'image-error';
        errorDiv.style.width = img.offsetWidth + 'px' || '200px';
        errorDiv.style.height = img.offsetHeight + 'px' || '150px';
        errorDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🖼️</div>
                <div>Image not available</div>
            </div>
        `;
        
        // Replace image with error placeholder
        img.parentNode.replaceChild(errorDiv, img);
    }

    setupMutationObserver() {
        if ('MutationObserver' in window) {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            const lazyImages = node.querySelectorAll ? node.querySelectorAll('img[data-src]') : [];
                            lazyImages.forEach(img => {
                                if (this.imageObserver) {
                                    this.imageObserver.observe(img);
                                } else {
                                    this.loadImage(img);
                                }
                            });
                        }
                    });
                });
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    loadAllImages() {
        // Fallback for browsers without Intersection Observer
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            this.loadImage(img);
        });
    }

    // Method to manually trigger loading of all remaining images
    loadRemainingImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            if (this.imageObserver) {
                this.imageObserver.unobserve(img);
            }
            this.loadImage(img);
        });
    }

    // Method to add lazy loading to existing images
    static convertImageToLazy(img, placeholderSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E') {
        if (img.src && !img.dataset.src) {
            img.dataset.src = img.src;
            img.src = placeholderSrc;
        }
    }

    // Method to preload critical images
    static preloadCriticalImages(imageSrcs) {
        imageSrcs.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }
}

// Initialize lazy loading when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.lazyImageLoader = new LazyImageLoader();
    
    // Preload critical images (hero images, logos, etc.)
    LazyImageLoader.preloadCriticalImages([
        'images/logo.png',
        'images/hero-massage-therapy.jpg'
    ]);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyImageLoader;
}