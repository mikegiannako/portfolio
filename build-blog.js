// build-blog.js - Enhanced with projects support
const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Configure marked for consistent output
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
        this.projectsDir = './portfolio-content/projects';
        this.templatesDir = './blog-content/templates';
        this.postsOutputDir = './posts';
        this.apiDir = './api';
        this.posts = [];
        this.projects = [];
        
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

    async build() {
        console.log('🔨 Building Michael\'s Portfolio & Blog...');
        console.log('==========================================');
        
        try {
            await this.buildPosts();
            await this.buildProjects();
            this.generateBlogListPage();
            this.generatePostPages();
            this.generateIndexPageWithProjects();
            this.generateApiData();
            
            console.log('==========================================');
            console.log(`✅ Portfolio built successfully!`);
            console.log(`📊 Posts: ${this.posts.length}`);
            console.log(`📁 Projects: ${this.projects.length}`);
            console.log(`📄 Pages: blog.html, index.html + ${this.posts.length} post pages`);
            console.log(`🔗 API data: api/blog.json, api/projects.json`);
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
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

    async buildProjects() {
        console.log('🚀 Reading projects...');
        
        if (!fs.existsSync(this.projectsDir)) {
            console.log('📁 No projects directory found.');
            return;
        }

        const files = fs.readdirSync(this.projectsDir)
            .filter(file => file.endsWith('.json'))
            .sort();

        if (files.length === 0) {
            console.log('📁 No projects found.');
            return;
        }

        for (const file of files) {
            try {
                const content = fs.readFileSync(
                    path.join(this.projectsDir, file), 
                    'utf-8'
                );
                
                const project = this.parseProject(content, file);
                if (project) {
                    this.projects.push(project);
                    console.log(`✅ Parsed: ${project.title}`);
                }
            } catch (error) {
                console.error(`❌ Error reading ${file}:`, error.message);
            }
        }

        // Sort by priority: platinum > gold > silver > bronze
        const priorityOrder = { 'platinum': 4, 'gold': 3, 'silver': 2, 'bronze': 1 };
        this.projects.sort((a, b) => {
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            return bPriority - aPriority;
        });
        
        console.log(`✅ Processed ${this.projects.length} projects`);
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

    parseProject(content, filename) {
        try {
            const project = JSON.parse(content);
            
            // Validate required fields
            if (!project.title || !project.description || !project.technologies) {
                console.error(`❌ ${filename}: Missing required fields (title, description, technologies)`);
                return null;
            }

            // Set default values
            project.priority = project.priority || 'bronze';
            project.slug = filename.replace('.json', '');
            
            // Validate priority
            if (!['platinum', 'gold', 'silver', 'bronze'].includes(project.priority)) {
                console.warn(`⚠️ ${filename}: Invalid priority '${project.priority}', defaulting to 'bronze'`);
                project.priority = 'bronze';
            }

            // Validate that either icon or image is provided
            if (!project.icon && !project.image) {
                console.warn(`⚠️ ${filename}: No icon or image provided, using default`);
                project.icon = '📁';
            }

            return project;
        } catch (error) {
            console.error(`❌ Error parsing project ${filename}:`, error.message);
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
            ? this.posts.map((post, i) => `
                <article class="blog-post-card published" data-reveal>
                    <a class="blog-post-link" href="posts/${post.slug}.html">
                        <div class="blog-post-top">
                            <span class="blog-post-index">0${i + 1}</span>
                            <span class="blog-post-glyph">${post.icon || '📝'}</span>
                        </div>
                        <div class="blog-post-meta">${this.formatDate(post.date)} <span class="sep">·</span> ${post.category}</div>
                        <h3 class="blog-post-title">${post.title}</h3>
                        <p class="blog-post-excerpt">${post.excerpt}</p>
                        <span class="read-more">Read post <span class="arrow">→</span></span>
                    </a>
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

    generateIndexPageWithProjects() {
        console.log('🏠 Updating index.html with projects...');
        
        if (!fs.existsSync('./index.html')) {
            console.error('❌ index.html not found');
            return;
        }

        let indexContent = fs.readFileSync('./index.html', 'utf-8');
        
        const projectsHtml = this.projects.length > 0 
            ? this.projects.map(project => this.generateProjectCard(project)).join('')
            : '<div class="no-projects"><p>Projects loading...</p></div>';

        // Replace the existing projects grid content
        const projectsGridRegex = /(<div class="projects-grid">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/;
        const replacement = `$1\n${projectsHtml}\n                $3`;
        
        indexContent = indexContent.replace(projectsGridRegex, replacement);
        
        fs.writeFileSync('./index.html', indexContent);
        console.log('✅ Updated index.html with projects');
    }

    generateProjectCard(project) {
        // Determine if using image or icon
        const mediaElement = project.image 
            ? `<img src="${project.image}" alt="${project.title}" class="project-card-img-element">`
            : `<span>${project.icon}</span>`;

        // Generate tech tags
        const techTags = project.technologies.map(tech => 
            `<span class="tech-tag">${tech}</span>`
        ).join('');

        // Generate link buttons (labeled pills with crisp inline SVG icons)
        const githubIcon = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.02-1.49-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';
        const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

        let linksHtml = '';
        if (project.github) {
            linksHtml += `
                <a href="${project.github}" target="_blank" rel="noopener" class="project-link-btn" title="View source on GitHub">${githubIcon}<span>Code</span></a>`;
        }
        if (project.link && project.link !== project.github) {
            linksHtml += `
                <a href="${project.link}" target="_blank" rel="noopener" class="project-link-btn" title="Watch the demo">${playIcon}<span>Demo</span></a>`;
        }

        return `
                <!-- ${project.title} - Priority: ${project.priority} -->
                <div class="project-card" data-priority="${project.priority}" data-reveal>
                    <div class="project-card-img ${project.image ? 'has-image' : 'has-icon'}">
                        ${mediaElement}
                    </div>
                    <div class="project-card-content">
                        <h3>${project.title}</h3>
                        <div class="tech-stack">
                            ${techTags}
                        </div>
                        <p>${project.description}</p>
                        ${linksHtml ? `<div class="project-links">${linksHtml}</div>` : ''}
                    </div>
                </div>`;
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
        
        // Blog API
        const blogApiData = {
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

        // Projects API
        const projectsApiData = {
            projects: this.projects.map(project => ({
                slug: project.slug,
                title: project.title,
                description: project.description,
                priority: project.priority,
                technologies: project.technologies,
                icon: project.icon,
                image: project.image,
                github: project.github,
                link: project.link
            })),
            lastUpdated: new Date().toISOString(),
            totalProjects: this.projects.length
        };

        fs.writeFileSync(`${this.apiDir}/blog.json`, JSON.stringify(blogApiData, null, 2));
        fs.writeFileSync(`${this.apiDir}/projects.json`, JSON.stringify(projectsApiData, null, 2));
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
}

// CLI usage
if (require.main === module) {
    new BlogBuilder().build();
}

module.exports = BlogBuilder;