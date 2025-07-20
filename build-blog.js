// build-blog.js - Minimal production build script
const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Configure marked for consistent output (marked@9.1.6 API)
marked.setOptions({
    gfm: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
});

class BlogBuilder {
    constructor() {
        this.sourceDir = './blog-content/posts';
        this.templatesDir = './blog-content/templates';
        this.postsOutputDir = './posts';
        this.apiDir = './api';
        this.posts = [];
        
        this.ensureDirectories();
    }

    ensureDirectories() {
        const dirs = [this.postsOutputDir, this.apiDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async buildPosts() {
        console.log('📖 Reading blog posts...');
        
        if (!fs.existsSync(this.sourceDir)) {
            console.log('📁 No posts directory found.');
            return;
        }

        const files = fs.readdirSync(this.sourceDir)
            .filter(file => file.endsWith('.md'))
            .sort();

        if (files.length === 0) {
            console.log('📝 No posts found.');
            return;
        }

        for (const file of files) {
            try {
                const content = fs.readFileSync(
                    path.join(this.sourceDir, file), 
                    'utf-8'
                );
                
                const post = this.parsePost(content, file);
                if (post) {
                    this.posts.push(post);
                    console.log(`✅ Parsed: ${post.title}`);
                }
            } catch (error) {
                console.error(`❌ Error reading ${file}:`, error.message);
            }
        }

        // Sort by date, newest first
        this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log(`✅ Processed ${this.posts.length} posts`);
    }

    parsePost(content, filename) {
        try {
            const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
            const match = content.match(frontmatterRegex);
            
            if (!match) {
                console.error(`❌ ${filename}: Invalid frontmatter format`);
                return null;
            }

            const [, frontmatter, markdown] = match;
            const metadata = this.parseFrontmatter(frontmatter);
            
            // Use marked.parse() for marked@9.1.6
            const htmlContent = marked.parse(markdown);
            
            return {
                ...metadata,
                slug: filename.replace('.md', ''),
                content: htmlContent,
                excerpt: this.generateExcerpt(markdown),
                rawContent: markdown
            };
        } catch (error) {
            console.error(`❌ Error parsing ${filename}:`, error.message);
            return null;
        }
    }

    parseFrontmatter(frontmatter) {
        const lines = frontmatter.split(/\r?\n/).filter(line => line.trim());
        const metadata = {};
        
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
                metadata[key] = value;
            }
        });
        
        return metadata;
    }

    generateExcerpt(markdown, length = 150) {
        const text = markdown
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/\r?\n\s*\r?\n/g, ' ')
            .replace(/\r?\n/g, ' ')
            .trim();
        
        return text.length > length 
            ? text.substring(0, length).trim() + '...'
            : text;
    }

    generateBlogListPage() {
        console.log('🏠 Generating blog list page...');
        
        const templatePath = path.join(this.templatesDir, 'blog-list.html');
        if (!fs.existsSync(templatePath)) {
            console.error('❌ Template not found: blog-content/templates/blog-list.html');
            return;
        }

        const template = fs.readFileSync(templatePath, 'utf-8');
        
        const postsHtml = this.posts.length > 0 
            ? this.posts.map(post => `
                <article class="blog-post-card published">
                    <div class="blog-post-image">
                        <span>${post.icon || '📝'}</span>
                    </div>
                    <div class="blog-post-content">
                        <div class="blog-post-meta">${this.formatDate(post.date)} • ${post.category}</div>
                        <h3 class="blog-post-title">
                            <a href="posts/${post.slug}.html">${post.title}</a>
                        </h3>
                        <p class="blog-post-excerpt">${post.excerpt}</p>
                        <a href="posts/${post.slug}.html" class="read-more">Read More →</a>
                    </div>
                </article>
            `).join('')
            : '<div class="no-posts"><p>No blog posts yet. Check back soon!</p></div>';

        const html = template
            .replace('{{POSTS}}', postsHtml)
            .replace('{{POST_COUNT}}', this.posts.length)
            .replace('{{YEAR}}', new Date().getFullYear());

        fs.writeFileSync('./blog.html', html);
        console.log('✅ Generated blog.html');
    }

    generatePostPages() {
        if (this.posts.length === 0) return;
        
        console.log('📄 Generating individual post pages...');
        
        const templatePath = path.join(this.templatesDir, 'blog-post.html');
        if (!fs.existsSync(templatePath)) {
            console.error('❌ Template not found: blog-content/templates/blog-post.html');
            return;
        }

        const template = fs.readFileSync(templatePath, 'utf-8');
        
        this.posts.forEach(post => {
            const html = template
                .replace(/{{TITLE}}/g, post.title)
                .replace('{{DATE}}', this.formatDate(post.date))
                .replace('{{CATEGORY}}', post.category)
                .replace('{{CONTENT}}', post.content)
                .replace('{{YEAR}}', new Date().getFullYear());

            fs.writeFileSync(`${this.postsOutputDir}/${post.slug}.html`, html);
        });
        
        console.log(`✅ Generated ${this.posts.length} post pages`);
    }

    generateApiData() {
        console.log('🔌 Generating API data...');
        
        const apiData = {
            posts: this.posts.map(post => ({
                slug: post.slug,
                title: post.title,
                date: post.date,
                category: post.category,
                excerpt: post.excerpt,
                icon: post.icon || '📝'
            })),
            lastUpdated: new Date().toISOString(),
            totalPosts: this.posts.length
        };

        fs.writeFileSync(`${this.apiDir}/blog.json`, JSON.stringify(apiData, null, 2));
        console.log('✅ Generated API data');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    async build() {
        console.log('🔨 Building Michael\'s Blog...');
        console.log('================================');
        
        try {
            await this.buildPosts();
            this.generateBlogListPage();
            this.generatePostPages();
            this.generateApiData();
            
            console.log('================================');
            console.log(`✅ Blog built successfully!`);
            console.log(`📊 Posts: ${this.posts.length}`);
            console.log(`📄 Pages generated: blog.html + ${this.posts.length} post pages`);
            console.log(`🔗 API data: api/blog.json`);
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
    }
}

// CLI usage
if (require.main === module) {
    new BlogBuilder().build();
}

module.exports = BlogBuilder;