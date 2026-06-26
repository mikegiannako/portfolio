// ============================================================
// main.js — shared across all pages
// Navigation · contact form · scroll-reveal
// ============================================================

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

            document.addEventListener('click', (e) => {
                if (!this.navDropdown.contains(e.target) && !this.mobileMenuBtn.contains(e.target)) {
                    this.closeMenu();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) this.closeMenu();
            });
        }

        this.highlightCurrentPage();
        this.setupNavLinkHandlers();
    }

    toggleMenu() {
        this.isOpen ? this.closeMenu() : this.openMenu();
    }

    openMenu() {
        this.isOpen = true;
        this.mobileMenuBtn.classList.add('active');
        this.navDropdown.classList.add('active');

        const links = this.navLinks.querySelectorAll('a');
        links.forEach((link, index) => {
            link.style.opacity = '0';
            link.style.transform = 'translateX(-12px)';
            setTimeout(() => {
                link.style.transition = 'all 0.3s cubic-bezier(0.22,1,0.36,1)';
                link.style.opacity = '1';
                link.style.transform = 'translateX(0)';
            }, index * 45);
        });
    }

    closeMenu() {
        this.isOpen = false;
        this.mobileMenuBtn.classList.remove('active');
        this.navDropdown.classList.remove('active');

        this.navLinks.querySelectorAll('a').forEach(link => {
            link.style.transition = '';
            link.style.opacity = '';
            link.style.transform = '';
        });
    }

    highlightCurrentPage() {
        if (this.blogLink) {
            this.blogLink.classList.toggle('active', window.location.pathname.includes('blog.html'));
        }
    }

    setupNavLinkHandlers() {
        if (this.navLinks) {
            this.navLinks.addEventListener('click', (e) => {
                if (e.target.closest('a')) this.closeMenu();
            });
        }
    }
}

// Theme toggle (initial theme is applied pre-paint by an inline head script)
class ThemeToggle {
    constructor() {
        this.btn = document.querySelector('.theme-toggle');
        if (!this.btn) return;
        this.btn.addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('theme', next); } catch (e) {}
        });
    }
}

// Reveal-on-scroll for [data-reveal] elements, with light per-group stagger
class RevealObserver {
    constructor() {
        const els = document.querySelectorAll('[data-reveal]');
        if (!els.length) return;

        if (!('IntersectionObserver' in window)) {
            els.forEach(el => el.classList.add('in-view'));
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const siblings = Array.from(el.parentElement.querySelectorAll(':scope > [data-reveal]'));
                const index = Math.max(0, siblings.indexOf(el));
                const delay = Math.min(index * 80, 400);
                el.style.transitionDelay = `${delay}ms`;
                el.classList.add('in-view');
                obs.unobserve(el);
                // Once the reveal finishes, clear the reveal-only inline delay so it
                // doesn't also delay later hover transitions (this was making cards
                // lag behind their image zoom). Each component's own CSS transition
                // (e.g. .project-card) then governs hover timing.
                el.addEventListener('transitionend', () => {
                    el.style.transitionDelay = '';
                    el.style.willChange = 'auto';
                }, { once: true });
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        els.forEach(el => observer.observe(el));
    }
}

// Contact form (front-end validation + notification)
class ContactForm {
    constructor() {
        this.form = document.getElementById('contact-form');
        if (this.form) this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    handleSubmit(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };
        if (!this.validate(data)) return;
        console.log('Form submission:', data);
        this.notify('Thanks for reaching out — I\'ll get back to you soon.', 'success');
        this.form.reset();
    }

    validate(d) {
        if (!d.name.trim()) return this.fail('Please enter your name');
        if (!d.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return this.fail('Please enter a valid email address');
        if (!d.subject.trim()) return this.fail('Please enter a subject');
        if (!d.message.trim()) return this.fail('Please enter a message');
        return true;
    }

    fail(msg) { this.notify(msg, 'error'); return false; }

    notify(message, type) {
        const n = document.createElement('div');
        n.className = `notification notification-${type}`;
        n.textContent = message;
        Object.assign(n.style, {
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            maxWidth: '320px',
            padding: '0.9rem 1.2rem',
            borderRadius: '10px',
            color: '#0a0b0e',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(120%)',
            transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
            backgroundColor: type === 'success' ? '#7fd1a8' : '#ef9a9e'
        });
        document.body.appendChild(n);
        requestAnimationFrame(() => { n.style.transform = 'translateX(0)'; });
        setTimeout(() => {
            n.style.transform = 'translateX(120%)';
            setTimeout(() => n.remove(), 400);
        }, 4500);
    }
}

// Shared utilities
const utils = {
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
    new ThemeToggle();
    new RevealObserver();
    new ContactForm();
});
