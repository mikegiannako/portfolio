// Index page specific functionality
class IndexPage {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupSmoothScrolling();
        this.setupScrollSpy();
        this.setupHeroAnimation();
        this.highlightGraduation();
    }
    
    setupSmoothScrolling() {
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = anchor.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    utils.smoothScrollTo(targetElement);
                    
                    // Close mobile menu if open
                    const nav = document.querySelector('.nav-dropdown');
                    if (nav && nav.classList.contains('active')) {
                        nav.classList.remove('active');
                        document.querySelector('.mobile-menu-btn').classList.remove('active');
                    }
                }
            });
        });
    }
    
    setupScrollSpy() {
        // Add active class to nav links based on scroll position
        const scrollHandler = utils.debounce(() => {
            const sections = document.querySelectorAll('section');
            const navLinksElements = document.querySelectorAll('.nav-links a');
            
            let currentSection = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                const sectionHeight = section.clientHeight;
                
                if (window.pageYOffset >= sectionTop && 
                    window.pageYOffset < sectionTop + sectionHeight) {
                    currentSection = section.getAttribute('id');
                }
            });
            
            navLinksElements.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSection}`) {
                    link.classList.add('active');
                }
            });
        }, 100);
        
        window.addEventListener('scroll', scrollHandler);
    }
    
    setupHeroAnimation() {
        // Add graduation celebration animation on page load
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.style.opacity = '0';
            heroContent.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                heroContent.style.transition = 'all 1s ease-out';
                heroContent.style.opacity = '1';
                heroContent.style.transform = 'translateY(0)';
            }, 300);
        }
        
        // Add stagger animation to contact icons
        const contactIcons = document.querySelectorAll('.contact-icon-link');
        contactIcons.forEach((icon, index) => {
            icon.style.opacity = '0';
            icon.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                icon.style.transition = 'all 0.6s ease-out';
                icon.style.opacity = '1';
                icon.style.transform = 'translateY(0)';
            }, 800 + (index * 100));
        });
    }
    
    highlightGraduation() {
        // Highlight graduation achievement with a subtle glow effect
        const graduationElement = document.querySelector('.timeline-content strong');
        if (graduationElement && graduationElement.textContent.includes('GPA')) {
            graduationElement.style.textShadow = '0 0 10px rgba(39, 174, 96, 0.5)';
        }
    }
}

// Add CSS animation for fade-in effects
const style = document.createElement('style');
style.textContent = `
    .project-card, .competition-tile, .timeline-item {
        opacity: 0;
        transform: translateY(20px);
        animation: fadeInUp 0.6s ease-out forwards;
    }
    
    .project-card:nth-child(2) {
        animation-delay: 0.2s;
    }
    
    .timeline-item:nth-child(2) {
        animation-delay: 0.3s;
    }
    
    .timeline-item:nth-child(3) {
        animation-delay: 0.6s;
    }
    
    @keyframes fadeInUp {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Initialize index page functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new IndexPage();
});

function contactEmail(e) {
    e.preventDefault();
    const user = 'mikegiannako';
    const domain = 'gmail.com';
    window.location.href = 'mailto:' + user + '@' + domain;
}

function contactPhone(e) {
    e.preventDefault();
    const phone = '+30' + '6997509026'.replace('30', '');
    window.location.href = 'tel:' + phone;
}