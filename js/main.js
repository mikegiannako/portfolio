// Main navigation functionality
class Navigation {
    constructor() {
        this.mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        this.navDropdown = document.querySelector('.nav-dropdown');
        this.navLinks = document.querySelector('.nav-links');
        this.blogLink = document.querySelector('.blog-link');
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        if (this.mobileMenuBtn && this.navDropdown) {
            this.mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.navDropdown.contains(e.target) && !this.mobileMenuBtn.contains(e.target)) {
                    this.closeMenu();
                }
            });
            
            // Close menu when pressing escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeMenu();
                }
            });
            
            // Handle window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768 && this.isOpen) {
                    this.closeMenu();
                }
            });
        }
        
        this.highlightCurrentPage();
        this.setupNavLinkHandlers();
    }
    
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        this.isOpen = true;
        this.mobileMenuBtn.classList.add('active');
        this.navDropdown.classList.add('active');
        
        // Add stagger animation to nav links
        const links = this.navLinks.querySelectorAll('a');
        links.forEach((link, index) => {
            link.style.opacity = '0';
            link.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                link.style.transition = 'all 0.3s ease';
                link.style.opacity = '1';
                link.style.transform = 'translateX(0)';
            }, index * 50);
        });
    }
    
    closeMenu() {
        this.isOpen = false;
        this.mobileMenuBtn.classList.remove('active');
        this.navDropdown.classList.remove('active');
        
        // Reset link animations
        const links = this.navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.style.transition = '';
            link.style.opacity = '';
            link.style.transform = '';
        });
    }
    
    highlightCurrentPage() {
        const currentPage = window.location.pathname;
        
        if (this.blogLink) {
            if (currentPage.includes('blog.html')) {
                this.blogLink.classList.add('active');
            } else {
                this.blogLink.classList.remove('active');
            }
        }
    }
    
    setupNavLinkHandlers() {
        // Handle navigation links
        if (this.navLinks) {
            this.navLinks.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    this.closeMenu();
                }
            });
        }
    }
}

// Contact form handler
class ContactForm {
    constructor() {
        this.form = document.getElementById('contact-form');
        this.init();
    }
    
    init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }
    
    handleSubmit(e) {
        e.preventDefault();
        
        // Collect form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };
        
        // Validate form
        if (!this.validateForm(formData)) {
            return;
        }
        
        // Here you would typically send the data to a server
        // For now, we'll just log it and show a success message
        console.log('Form submission:', formData);
        
        this.showSuccessMessage();
        this.form.reset();
    }
    
    validateForm(data) {
        if (!data.name.trim()) {
            this.showError('Please enter your name');
            return false;
        }
        
        if (!data.email.trim() || !this.isValidEmail(data.email)) {
            this.showError('Please enter a valid email address');
            return false;
        }
        
        if (!data.subject.trim()) {
            this.showError('Please enter a subject');
            return false;
        }
        
        if (!data.message.trim()) {
            this.showError('Please enter a message');
            return false;
        }
        
        return true;
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    showSuccessMessage() {
        // Create a nice success notification instead of alert
        this.showNotification('Thank you for your message! I will get back to you soon.', 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '5px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            backgroundColor: type === 'success' ? '#27ae60' : '#e74c3c'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

// Utility functions
const utils = {
    // Smooth scroll to element
    smoothScrollTo(element, offset = 70) {
        if (element) {
            window.scrollTo({
                top: element.offsetTop - offset,
                behavior: 'smooth'
            });
        }
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
    new ContactForm();
});