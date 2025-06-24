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
            nav.style.top = '-100px'; // Hide nav on scroll
        }
    });

    document.addEventListener('mousemove', function(event) {
        if (event.clientY < 50) {
            nav.style.top = '0'; // Show nav when mouse is at the top
        }
    });
});