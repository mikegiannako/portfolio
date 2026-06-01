// ============================================================
// blog.js — blog list + post pages
// Reading progress · keyboard navigation
// (Card reveals handled by main.js RevealObserver)
// ============================================================

class BlogPage {
    constructor() {
        this.setupReadingProgress();
        this.setupPostNavigation();
    }

    setupReadingProgress() {
        const postContent = document.querySelector('.post-content');
        if (!postContent) return;

        const bar = document.createElement('div');
        bar.className = 'reading-progress';
        bar.style.width = '0%';
        document.body.appendChild(bar);

        const update = () => {
            const scrollTop = document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            bar.style.width = Math.min((scrollTop / height) * 100, 100) + '%';
        };

        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    setupPostNavigation() {
        if (!document.querySelector('.post-container')) return;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const back = document.querySelector('.back-to-blog');
                if (back) window.location.href = back.href;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new BlogPage());
