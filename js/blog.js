// Enhanced blog.js - Handles both generated and coming soon content
class BlogPage {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupBlogAnimations();
        this.setupBlogInteractions();
        this.setupPostNavigation();
        this.loadBlogData();
    }
    
    setupBlogAnimations() {
        // Animate blog header on load
        const blogHeader = document.querySelector('.blog-header');
        if (blogHeader) {
            blogHeader.style.opacity = '0';
            blogHeader.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                blogHeader.style.transition = 'all 0.8s ease-out';
                blogHeader.style.opacity = '1';
                blogHeader.style.transform = 'translateY(0)';
            }, 200);
        }
        
        // Animate coming soon section if present
        const comingSoon = document.querySelector('.coming-soon');
        if (comingSoon) {
            comingSoon.style.opacity = '0';
            comingSoon.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                comingSoon.style.transition = 'all 0.6s ease-out';
                comingSoon.style.opacity = '1';
                comingSoon.style.transform = 'scale(1)';
            }, 400);
        }
        
        // Stagger animate blog post cards
        this.animateBlogCards();
        
        // Animate post content if on individual post page
        this.animatePostContent();
    }
    
    animateBlogCards() {
        const blogCards = document.querySelectorAll('.blog-post-card');
        blogCards.forEach((card, index) => {
            // Set initial state
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px) scale(0.95)';
            
            // Animate in with stagger
            setTimeout(() => {
                card.style.transition = 'all 0.6s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(-5px) scale(1)';
            }, 600 + (index * 100));
        });
    }
    
    animatePostContent() {
        const postContent = document.querySelector('.post-content');
        if (postContent) {
            postContent.style.opacity = '0';
            postContent.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                postContent.style.transition = 'all 0.8s ease-out';
                postContent.style.opacity = '1';
                postContent.style.transform = 'translateY(0)';
            }, 400);
        }
    }
    
    setupBlogInteractions() {
        // Enhanced hover effects for blog cards
        const blogCards = document.querySelectorAll('.blog-post-card');
        
        blogCards.forEach(card => {
            // Check if it's a published post or coming soon
            const isPublished = card.classList.contains('published');
            const readMoreLink = card.querySelector('.read-more');
            
            if (isPublished) {
                // Regular hover for published posts
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-8px) scale(1.02)';
                    card.style.boxShadow = '0 15px 35px rgba(0,0,0,0.5)';
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(-5px) scale(1)';
                    card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                });
            } else {
                // Coming soon posts
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-3px) scale(1.01)';
                    card.style.opacity = '0.9';
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(-5px) scale(1)';
                    card.style.opacity = '0.8';
                });
            }
        });
        
        // Handle coming soon clicks
        this.setupComingSoonHandlers();
        
        // Setup smooth scrolling for back to blog links
        this.setupBackToBlogLinks();
    }
    
    setupComingSoonHandlers() {
        document.querySelectorAll('.read-more').forEach(link => {
            if (link.textContent.includes('Coming Soon')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showComingSoonMessage();
                });
            }
        });
        
        // Also handle clicks on coming soon card titles
        document.querySelectorAll('.blog-post-card:not(.published)').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.showComingSoonMessage();
            });
        });
    }
    
    setupBackToBlogLinks() {
        document.querySelectorAll('.back-to-blog').forEach(link => {
            link.addEventListener('click', (e) => {
                // Add smooth transition if staying on same domain
                if (link.href.includes(window.location.origin)) {
                    e.preventDefault();
                    window.location.href = link.href;
                }
            });
        });
    }
    
    setupPostNavigation() {
        // Add keyboard navigation for posts
        if (document.querySelector('.post-container')) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const backLink = document.querySelector('.back-to-blog');
                    if (backLink) {
                        window.location.href = backLink.href;
                    }
                }
            });
        }
        
        // Add reading progress indicator for long posts
        this.setupReadingProgress();
    }
    
    setupReadingProgress() {
        const postContent = document.querySelector('.post-content');
        if (!postContent || postContent.scrollHeight <= window.innerHeight) return;
        
        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'reading-progress';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: var(--accent-color);
            z-index: 1001;
            transition: width 0.1s ease;
        `;
        document.body.appendChild(progressBar);
        
        // Update progress on scroll
        const updateProgress = () => {
            const winScroll = document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = Math.min(scrolled, 100) + '%';
        };
        
        window.addEventListener('scroll', updateProgress);
        updateProgress(); // Initial call
    }
    
    async loadBlogData() {
        // Try to load blog data for potential dynamic features
        try {
            const response = await fetch('./api/blog.json');
            if (response.ok) {
                this.blogData = await response.json();
                this.enhanceWithBlogData();
            }
        } catch (error) {
            // Silent fail - static content will work fine without API data
            console.log('Blog API data not available - using static content');
        }
    }
    
    enhanceWithBlogData() {
        if (!this.blogData) return;
        
        // Add post count to header if element exists
        const postCount = document.querySelector('.post-count');
        if (postCount) {
            postCount.textContent = `${this.blogData.posts.length} posts`;
        }
        
        // Add last updated info
        const lastUpdated = document.querySelector('.last-updated');
        if (lastUpdated && this.blogData.lastUpdated) {
            const date = new Date(this.blogData.lastUpdated);
            lastUpdated.textContent = `Last updated: ${date.toLocaleDateString()}`;
        }
        
        // Enable search if search box exists
        this.setupSearch();
    }
    
    setupSearch() {
        const searchInput = document.querySelector('.blog-search');
        if (!searchInput || !this.blogData) return;
        
        const allCards = document.querySelectorAll('.blog-post-card.published');
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            allCards.forEach(card => {
                const title = card.querySelector('.blog-post-title').textContent.toLowerCase();
                const excerpt = card.querySelector('.blog-post-excerpt').textContent.toLowerCase();
                const category = card.querySelector('.blog-post-meta').textContent.toLowerCase();
                
                const matches = !query || 
                    title.includes(query) || 
                    excerpt.includes(query) || 
                    category.includes(query);
                
                card.style.display = matches ? 'flex' : 'none';
                
                if (matches) {
                    card.style.animation = 'fadeInUp 0.3s ease-out';
                }
            });
            
            // Show no results message if needed
            this.toggleNoResults(query, allCards);
        });
    }
    
    toggleNoResults(query, cards) {
        if (!query) {
            this.hideNoResults();
            return;
        }
        
        const visibleCards = Array.from(cards).filter(card => 
            card.style.display !== 'none'
        );
        
        if (visibleCards.length === 0) {
            this.showNoResults(query);
        } else {
            this.hideNoResults();
        }
    }
    
    showNoResults(query) {
        let noResults = document.querySelector('.no-results');
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.style.cssText = `
                text-align: center;
                padding: 3rem 2rem;
                color: var(--text-color);
                grid-column: 1 / -1;
            `;
            document.querySelector('.blog-posts').appendChild(noResults);
        }
        
        noResults.innerHTML = `
            <h3>No posts found</h3>
            <p>No posts match "${query}". Try a different search term.</p>
        `;
        noResults.style.display = 'block';
    }
    
    hideNoResults() {
        const noResults = document.querySelector('.no-results');
        if (noResults) {
            noResults.style.display = 'none';
        }
    }
    
    showComingSoonMessage() {
        // Create enhanced notification modal
        const notification = document.createElement('div');
        notification.className = 'blog-notification';
        
        notification.innerHTML = `
            <div class="blog-notification-content">
                <h3>🚧 Coming Soon!</h3>
                <p>This blog post is currently being written. I'm working on creating high-quality content about my experiences in Computer Science, cybersecurity, and software development.</p>
                <p><strong>Stay tuned!</strong> You can check back soon or <a href="index.html#contact">reach out</a> if you have specific questions about any topics.</p>
                <button class="btn" onclick="this.closest('.blog-notification').remove()">Got it!</button>
            </div>
        `;
        
        // Style the notification
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Close handlers
        notification.addEventListener('click', (e) => {
            if (e.target === notification) {
                this.closeNotification(notification);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeNotification(notification);
            }
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                this.closeNotification(notification);
            }
        }, 10000);
    }
    
    closeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 300);
    }
}

// Utility function for smooth scrolling (if not in main.js)
function smoothScrollTo(element, offset = 80) {
    if (element) {
        const targetPosition = element.offsetTop - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Initialize blog functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const blogPage = new BlogPage();
    
    // Add any global blog event listeners here
    console.log('📝 Blog system initialized');
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlogPage;
}