// ============================================================
// index.js — landing page
// Scroll-spy nav highlighting · obfuscated contact links
// (Smooth scrolling + reveals handled by CSS / main.js)
// ============================================================

class IndexPage {
    constructor() {
        this.setupScrollSpy();
    }

    setupScrollSpy() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-links a');
        if (!sections.length || !navLinks.length) return;

        const setActive = (id) => {
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
            });
        };

        const handler = utils.debounce(() => {
            let current = '';
            sections.forEach(section => {
                if (window.pageYOffset >= section.offsetTop - 140) {
                    current = section.getAttribute('id');
                }
            });
            setActive(current);
        }, 80);

        window.addEventListener('scroll', handler);
        handler();
    }
}

document.addEventListener('DOMContentLoaded', () => new IndexPage());

// Obfuscated contact handlers (referenced inline in index.html)
function contactEmail(e) {
    e.preventDefault();
    window.location.href = 'mailto:' + 'mikegiannako' + '@' + 'gmail.com';
}

function contactPhone(e) {
    e.preventDefault();
    window.location.href = 'tel:' + '+30' + '6997509026';
}
