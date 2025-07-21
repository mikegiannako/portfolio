---
title: From Static to Dynamic - Rebuilding My Projects System
date: 2025-01-21
category: Web Development
icon: 🔧
---

After successfully building my [blog system](building-this-blog.html) with dynamic Markdown generation, I realized I had been thinking about my portfolio all wrong. Why was I hardcoding project cards in HTML when I could apply the same data-driven approach I used for blog posts?

## The Inspiration

The blog system worked so well because it separated **content from code**. Writing a new blog post meant creating a `.md` file, not editing HTML templates. This got me thinking: why couldn't projects work the same way?

Looking at my existing project cards, they were incredibly uniform:
- Icon or image
- Title and description  
- Technology stack badges
- Links to GitHub/demos

Perfect candidates for JSON-driven generation.

## The New System

I extended my existing `build-blog.js` script to also process project data. Now the workflow is:

### 1. **JSON-Based Project Definitions**
```json
{
  "title": "Alpha Compiler & VM",
  "description": "Developed a compiler with a shift-reduce parser...",
  "icon": "🔧",
  "priority": "platinum",
  "technologies": ["C", "C++", "Yacc", "Bison", "Assembly"],
  "github": "https://github.com/username/project"
}
```

### 2. **Flexible Media Support**
Projects can use either emoji icons or actual screenshots:
```json
// Icon-based (good for projects with not much visual content)
"icon": "🔧"

// Image-based (great for visual projects)  
"image": "assets/images/project-screenshots/project-demo.png"
```

### 3. **Automated Build Process**
Same `npm run build` command now processes both blog posts AND projects. The script:
- Reads JSON files from `portfolio-content/projects/`
- Sorts by priority automatically
- Generates project cards with proper links
- Updates the main index.html

## A New Addition

I also added my thesis project to test the system - a Spring Boot application that automatically evaluates Java programming assignments. It analyzes code structure and runs test cases, providing both web and CLI interfaces for grading student submissions. It felt like the perfect candidate to showcase the new project system's flexibility.

## The Priority Experiment

I implemented a **ranking system** with platinum, gold, silver, and bronze priorities. Projects display in that order with subtle star indicators for the top tiers.

However, I'm treating this as an **experiment**. The visual indicators (star icons and colored borders) might be too much. I'm considering simplifying to just maintain the priority **ordering** without the visual flair. The goal is to highlight my best work without making the portfolio feel cluttered or overly gamified.


## Looking Forward

This is just the beginning. I'm planning to:

### **Add More Projects**
Several projects from my academic and personal work are waiting to be documented and added to the system.

### **Enhanced Demos**
Each project will get proper demonstrations:
- **Live demos** for web applications
- **Interactive showcases** for tools and utilities  
- **YouTube videos** for complex systems that can't be easily demoed online

## Lessons Learned

This reinforced something important about web development: **consistency is powerful**. When you find a pattern that works (like the Markdown → HTML blog system), look for other places to apply it.

The portfolio is now much more maintainable. Adding a new project means creating a JSON file, not hunting through HTML and making sure I don't break existing styling.

---

*Curious about the technical details? You can see the build system and project structure on my [GitHub](https://github.com/mikegiannako/portfolio).*