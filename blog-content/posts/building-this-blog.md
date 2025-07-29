---
title: Building This Blog - A Developer's Journey
date: 2025-07-20
category: Web Development
icon: 🚀
---

Welcome to my new blog! After months of having a placeholder "coming soon" message, I finally decided to build a proper blogging system for my portfolio. This first post is about the journey of creating this very blog you're reading.

## Why Build a Blog?

As a Computer Science graduate transitioning into my Master's degree, I realized that **sharing knowledge** is just as important as acquiring it. Whether it's documenting my learning experiences or exploring new technologies, writing helps solidify my understanding.

Plus, recruiters and fellow developers often want to see not just *what* you've built, but *how you think* about problems.

## The Technical Challenge

Instead of using WordPress or a ready-made solution, I chose to build a custom static blog system that integrates seamlessly with my existing portfolio. Here's what I wanted:

- **Static generation** for fast loading (perfect for GitHub Pages)
- **Markdown support** for easy writing
- **Automated deployment** via GitHub Actions
- **No database** to maintain or backup (for now at least)

### The Build Process

The system I created uses:

```js
// Simple but powerful: Markdown → HTML
const content = marked.parse(markdown);
const html = template.replace('{{CONTENT}}', content);
```

**Key Features:**
- Write posts in Markdown with frontmatter
- Automatic excerpt generation
- Template-based HTML generation
- JSON API for future enhancements

The entire workflow is now as simple as:
1. Write `.md` file
2. `git push`
3. GitHub Actions builds and deploys automatically

## What to Expect

This blog will be my space to share:

### 💻 **Development Projects**
- Deep dives into projects
- Code reviews and architecture decisions

### 🎓 **Learning Journey**
- Master's degree experiences and coursework
- New programming languages and frameworks

### 🤔 **Technical Reflections**
- Problem-solving methodologies
- Tool comparisons and recommendations

## A Personal Note

> "The best way to learn is to teach, and the best way to remember is to write."

I've always believed that explaining concepts to others (or to future me) is one of the most effective ways to truly understand them. This is something that I have experienced firsthand as a tutor/mentor for my peers and juniors. I take pride in being able to break down topics that seem complex to others into digestible pieces.

## Looking Forward

My immediate goals for this blog include:

- **Consistency**: Aim for at least one post per month
- **Quality over quantity**: Focus on meaningful, well-researched content
- **Community**: Engage with readers and learn from their perspectives

I'm excited to share this journey with you. Whether you're a fellow CS student or just someone curious about technology, I hope you'll find something valuable here.

---

*Have thoughts on this post or suggestions for future topics? Feel free to [reach out](../index.html#contact) - I'd love to hear from you!*