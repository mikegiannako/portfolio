---
title: "Participating and Winning a University Game Jam"
date: 2026-06-27
category: Game Development
icon: 🎮
---

Better late than never — this post is long overdue. Back on April 29th, 2026 at 11:00, our team sat down for a 28-hour game jam that ran until April 30th at 15:00. The theme was **Out of Place**, with a restriction of **Retro Graphics**. The team was me and Orfeas handling programming, Marianthi on digital art, and Exw on sound design.

## The Brainstorm

The first ~3 hours after theme announcement were pure chaos — in the best way. We threw around a lot of ideas. One that I genuinely loved was a 3D game where you play as a 2D character, leaning fully into the visual dissonance of the theme. Another was inspired by *Wreck-It Ralph*: a game character that ends up in the wrong arcade machine and has to navigate through completely different game genres. Passing through Tetris could play like a platformer, passing through a racing game could work like Frogger. That one had a lot of potential.

Ultimately though, taking into account the time constraint, we landed on something more grounded: an *Overcooked*-inspired cooking game, where you play as an alien chef who accidentally crash-landed on Earth with a food truck and now has to serve increasingly confused humans. It hit the theme perfectly and had a clear, fun gameplay loop we could actually build in time.

## The Tech Stack

We made a deliberate decision early on to **not use a game engine**. None of us had enough experience with any specific engine to learn it on the fly under a time crunch — that's a recipe (no pun intended) for disaster. Instead, we went with **Raylib + C++**. We hadn't used Raylib before either, but at least we knew C++, and Raylib is simple enough that we could get something on screen quickly.

It was the right call.

## The Grind

After aligning on the concept, we went home and got to work. And work we did. It genuinely felt like overtime — the kind where you lose track of time and suddenly it's 3am and you're debating how a cutting minigame should feel. Taking a break meant browsing for sound effects. Ordering food was the only cooking we had time for, which felt very on-theme.

The game itself featured a top-down kitchen layout where you'd pick up ingredients, process them through a fruit-ninja-style cutting minigame, grill or fry them, and serve customers who appeared at the window with timed orders. We even threw in a drink station with an *osu!catch*-inspired minigame. It came together better than I expected.

By the morning of the second day we shifted into polish mode — animations, game feel, audio integration. We also compiled the project with **Emscripten**, making it playable directly in the browser with no download required, which I'm really glad we did.

## The Presentation

After little sleep, me and Orfeas grabbed a laptop and headed to the University to present. Meeting the other teams was one of the best parts of the whole experience. Everyone had similar stories to tell: late nights, last-minute pivots, features cut at 2am. There's a real charm in that.

Presentations were fun, the games were genuinely impressive consiering the restriction, and then came the wait while the judges deliberated.

We won.

Honestly, I'm still proud of what the four of us pulled off in that time frame, with a library none of us had used before, on little sleep. It was stressful and exhausting and exactly the kind of thing I'd do again.

---

*You can go check the code as well as try the game out by going to this portfolio's projects section.*
