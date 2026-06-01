---
title: Giving the Portfolio a Real Identity
date: 2026-06-01
category: Web Development
icon: 🎨
---

For a while my portfolio did its job, but it never felt like *mine*. It was a competent dark template — the same flat blue, the same system font, the same layout you've seen on a hundred other developer sites. It said "a developer made this," but it didn't say anything about *which* developer. So I sat down to redesign the whole frontend from scratch.

## Figuring out the vibe

The first attempt actually overshot. I built a refined dark theme with a serif display font and a gold accent, and while it looked polished, it gave off a "prestige" energy — the kind of thing that suits a law firm or a luxury watch brand, not a 20-something who mostly writes compilers. It felt like borrowing someone else's suit.

So I went the other way: a bright, approachable light theme with a single indigo accent and [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) for the headings — a font with some personality without trying too hard. Monospace is reserved for the technical bits (dates, tags, section labels), which feels right for someone who spends most of the day in a terminal.

## A dark mode that feels like home

I couldn't *not* add a dark mode. But instead of inventing a palette, I borrowed the one I already stare at all day: **Atom One Dark**, my editor theme. There's something nice about a site that matches the environment its author actually lives in. A toggle in the corner switches between the two, your choice is remembered, and the code snippets in these posts now use real One Dark highlighting in either theme.

Getting it to switch *without* a flash of the wrong colors on every page load took a couple of tries — the trick was painting the correct background before the stylesheet even loads — but it's smooth now.

## Tidying up the details

A few smaller things I'd been meaning to fix:

- **The project tiers.** [Last time](rebuilding-project-cards.html) I wondered out loud whether the star badges and colored borders were "too much." Turns out they were. They're now a single quiet colored dot in the corner — the ranking is still there, just whispering instead of shouting.
- **Readable links.** Project cards now have proper labeled buttons instead of tiny icons you had to squint at.
- **Honest content.** My research assistantship wrapped up and I started as a teaching assistant for the Compilers course, so the site now says what's actually true.

## Was it worth it?

Probably more time than a portfolio strictly needs. But it's the one project where the audience *is* the design, and it's the first thing I point people to. It should feel like me — and this one finally does.

---

*Built and designed from scratch — feel free to poke around the source on my [GitHub](https://github.com/mikegiannako/portfolio).*
