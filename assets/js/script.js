document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const links = document.querySelectorAll('a[href^="#"]');

    for (const link of links) {
        link.addEventListener('click', function(event) {
            event.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop,
                    behavior: 'smooth'
                });
            } else if (targetId === '#') {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    }

    // Scroll to the top of the page on refresh
    window.scrollTo(0, 0);

    // Handle form submission using AJAX
    const form = document.getElementById('contact-form');

    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission

        const formData = new FormData(form);

        fetch('send_email.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(data => {
            alert(data); // Display the response from the server
            form.reset(); // Reset the form fields
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const nav = document.querySelector('nav');

    window.addEventListener('scroll', function() {
        if (window.scrollY === 0) {
            nav.style.top = '0'; // Show nav when at the top of the page
        } else {
            nav.style.top = '-170px'; // Hide nav on scroll
        }
    });

    document.addEventListener('mousemove', function(event) {
        if (event.clientY < 50) {
            nav.style.top = '0'; // Show nav when mouse is at the top
        }
    });
});

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    // Function to perform search
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            alert('Please enter a search term');
            return;
        }
        
        // Get all text content from the page
        const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
        let found = false;
        
        // Remove previous highlights
        removeHighlights();
        
        // Search through content
        contentElements.forEach(element => {
            const text = element.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                highlightElement(element);
                if (!found) {
                    // Scroll to first match
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    found = true;
                }
            }
        });
        
        if (!found) {
            alert(`No results found for "${searchTerm}"`);
        }
    }
    
    // Function to highlight matched elements
    function highlightElement(element) {
        element.style.backgroundColor = '#ffff99';
        element.style.padding = '5px';
        element.style.borderRadius = '3px';
        element.style.transition = 'background-color 0.3s ease';
        element.classList.add('search-highlight');
    }
    
    // Function to remove highlights
    function removeHighlights() {
        const highlighted = document.querySelectorAll('.search-highlight');
        highlighted.forEach(element => {
            element.style.backgroundColor = '';
            element.style.padding = '';
            element.style.borderRadius = '';
            element.classList.remove('search-highlight');
        });
    }
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Clear highlights when input is cleared
    searchInput.addEventListener('input', function() {
        if (this.value === '') {
            removeHighlights();
        }
    });
});

// Filter functionality for shopping app
document.addEventListener('DOMContentLoaded', function() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    const productCards = document.querySelectorAll('.product-card');
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active tab
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Filter products
            productCards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-category') === filter) {
                    card.style.display = 'block';
                    card.style.animation = 'fadeIn 0.5s ease-in';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
    
    // Enhanced search functionality for shopping app
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    function performProductSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let visibleCards = 0;
        
        productCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('.product-description').textContent.toLowerCase();
            const features = card.querySelectorAll('.feature-tag');
            let featuresText = '';
            features.forEach(feature => featuresText += feature.textContent.toLowerCase() + ' ');
            
            if (searchTerm === '' || 
                title.includes(searchTerm) || 
                description.includes(searchTerm) || 
                featuresText.includes(searchTerm)) {
                card.style.display = 'block';
                visibleCards++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show message if no results
        const existingMessage = document.querySelector('.no-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        if (visibleCards === 0 && searchTerm !== '') {
            const noResultsMessage = document.createElement('div');
            noResultsMessage.className = 'no-results-message';
            noResultsMessage.style.cssText = `
                text-align: center;
                padding: 40px;
                color: #6c757d;
                font-size: 1.2rem;
                grid-column: 1 / -1;
            `;
            noResultsMessage.innerHTML = `
                <h3>No results found for "${searchTerm}"</h3>
                <p>Try adjusting your search or browse our categories above.</p>
            `;
            document.querySelector('.products-container').appendChild(noResultsMessage);
        }
    }
    
    // Search event listeners
    if (searchButton) {
        searchButton.addEventListener('click', performProductSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performProductSearch();
            }
        });
        
        searchInput.addEventListener('input', function() {
            if (this.value === '') {
                productCards.forEach(card => {
                    card.style.display = 'block';
                });
                const existingMessage = document.querySelector('.no-results-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
            }
        });
    }
    
    // Add to cart functionality (demo)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('product-button')) {
            const card = e.target.closest('.product-card');
            const title = card.querySelector('h3').textContent;
            
            // Visual feedback
            e.target.textContent = 'Added!';
            e.target.style.background = '#28a745';
            
            setTimeout(() => {
                e.target.textContent = e.target.textContent.includes('Cart') ? 'Add to Cart' : 
                                     e.target.textContent.includes('Order') ? 'Order Now' :
                                     e.target.textContent.includes('Quote') ? 'Get Quote' :
                                     e.target.textContent.includes('Program') ? 'Start Program' :
                                     e.target.textContent.includes('Join') ? 'Join Program' :
                                     'Learn More';
                e.target.style.background = '#6a4c93';
            }, 2000);
            
            // You could add actual cart functionality here
            console.log(`Added "${title}" to cart`);
        }
    });
});

// Add fade in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

// Mobile App Enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Detect if user is on mobile device
    const isMobile = window.innerWidth <= 768;
    
    // Add mobile-specific class to body
    if (isMobile) {
        document.body.classList.add('mobile-device');
    }
    
    // Improve touch interactions on mobile
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        
        // Add touch feedback for buttons
        const buttons = document.querySelectorAll('button, .btn, .product-button, .deal-button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.95)';
            });
            
            button.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });
    }
    
    // Mobile navigation improvements
    if (isMobile) {
        const nav = document.querySelector('nav');
        if (nav) {
            // Remove hover behavior on mobile
            nav.style.position = 'relative';
            nav.style.top = '0';
        }
    }
    
    // Prevent zoom on form focus (iOS)
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.type !== 'checkbox' && input.type !== 'radio') {
            // Ensure font size is at least 16px to prevent zoom
            const computedStyle = window.getComputedStyle(input);
            const fontSize = parseFloat(computedStyle.fontSize);
            if (fontSize < 16) {
                input.style.fontSize = '16px';
            }
        }
    });
    
    // Mobile-friendly image loading
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
        
        img.addEventListener('error', function() {
            this.style.opacity = '0.5';
            console.log('Image failed to load:', this.src);
        });
    });
    
    // Smooth scroll improvements for mobile
    if (isMobile) {
        const scrollElements = document.querySelectorAll('a[href^="#"]');
        scrollElements.forEach(element => {
            element.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    // Mobile search enhancements
    const searchInput = document.getElementById('searchInput');
    if (searchInput && isMobile) {
        // Add search suggestions/autocomplete behavior
        searchInput.addEventListener('focus', function() {
            this.style.transform = 'scale(1.02)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        searchInput.addEventListener('blur', function() {
            this.style.transform = '';
        });
        
        // Auto-capitalize first letter
        searchInput.addEventListener('input', function() {
            if (this.value.length === 1) {
                this.value = this.value.toUpperCase();
            }
        });
    }
    
    // Mobile filter tab scrolling
    const filterTabs = document.querySelector('.filter-tabs');
    if (filterTabs && isMobile) {
        filterTabs.style.overflowX = 'auto';
        filterTabs.style.scrollBehavior = 'smooth';
        
        // Add momentum scrolling for iOS
        filterTabs.style.webkitOverflowScrolling = 'touch';
    }
    
    // Progressive Web App features
    if ('serviceWorker' in navigator) {
        // Register service worker for offline functionality
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                    console.log('SW registered: ', registration);
                })
                .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
    
    // Add to home screen prompt for mobile
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button if on mobile
        if (isMobile) {
            const installButton = document.createElement('button');
            installButton.textContent = '📱 Install App';
            installButton.className = 'install-app-btn';
            installButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 16px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 9999;
                cursor: pointer;
                transition: transform 0.2s ease;
            `;
            
            installButton.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                        installButton.remove();
                    }
                    deferredPrompt = null;
                });
            });
            
            document.body.appendChild(installButton);
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (installButton && installButton.parentNode) {
                    installButton.style.opacity = '0';
                    setTimeout(() => installButton.remove(), 300);
                }
            }, 10000);
        }
    });
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            // Recalculate viewport height for mobile browsers
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        }, 100);
    });
    
    // Set initial viewport height
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
});

// Mobile performance optimizations
if (window.innerWidth <= 768) {
    // Lazy load images for better mobile performance
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}