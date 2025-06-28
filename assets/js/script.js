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