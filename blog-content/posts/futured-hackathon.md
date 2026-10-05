---
title: "Winning the Real World Impact Award at the FuturEd AI Hackathon"
date: 2026-10-01
category: AI
icon: 🏆
---

This one's fresh. Last week, my teammate and I took part in the **FuturEd AI** hackathon, a 28-hour event organized by **Epignosis** (the company behind TalentLMS) together with our Computer Science Department at the University of Crete. The theme was **AI in education**, and 17 teams competed for three awards.

Those 17 teams weren't just whoever signed up. Around 50 teams originally applied, and the list was curated from there: some teams were accepted straight away, some were rejected, and some, like us, went through a short interview. We had to explain our idea to someone who would later be our mentor, and convince them it was worth building. Getting through that was already a small win before the hackathon had even started.

## The Setup

The whole thing took place in the University's reading room, which turned out to be a surprisingly good hackathon venue: lots of space, lots of tables and a lot of people quietly (and not so quietly) typing away. And the food was amazing. I can't stress that enough. A well-fed team is a productive team.

The people hosting the event and the mentors deserve a special mention. They were genuinely helpful and friendly the whole time, always open to questions, giving feedback on ideas and making sure everyone had what they needed. It made the atmosphere feel a lot less like a competition and a lot more like a room full of people building cool things.

That said, the competition *was* there. The ideas from the other teams were great, and walking around and seeing what everyone was working on was both inspiring and a little intimidating.

## The Goal

Going in, we had our eyes on two of the awards: **Real World Impact** and **AI Innovation**. We wanted to build something a professor could actually pick up and use, not just a flashy demo. That shaped every decision we made.

## The Idea: LearnTrace

We built **LearnTrace**, a dashboard that helps university professors find *where* students get stuck, and *why*.

The idea is simple: professors run frequent quizzes with freeform answers, every answer gets graded automatically, and LearnTrace then figures out **learning dependencies between topics** from anonymous student performance. So instead of just "students did badly on Locking", you get something like:

> *Students struggling with Serializability were 5.2× more likely to struggle with Locking.*

That tells a professor that the problem isn't really Locking. It's the topic underneath it.

The grading is done by **Jev**, TypeSafe's System One model, which had been released just a couple of weeks before. Jev is *not* an LLM, which was the whole point: it grades each answer with an understanding level and a 0–100 grade, at around 100 answers per second for a tiny fraction of a cent each. Grading a full quiz of ~2,300 answers live took about 20 seconds and cost around six cents.

On top of that, LearnTrace lets professors:

- **Build question banks** per course week, either by uploading existing questions or generating them from lecture PDFs.
- **Create quizzes and exams** in about a minute, with balanced variants and a slider-controlled topic mix, avoiding questions that were already used.
- **Explore a Learning Map** showing which topics are prerequisites for which, where every arrow comes with its statistical evidence (relative risk with confidence intervals, partial correlations and clustering of struggling students).
- **Import past semesters** and run custom analyses over every answer, like finding common misconceptions.

We also built a student view, where each student gets a practice deck of the questions they struggled with, ordered so that the foundational topics come first, with instant grading and hints that never give away the model answer.

## Proving It Works

One thing I'm particularly happy with is how we made sure the analytics weren't just pretty arrows. Our demo data came from 247 simulated students whose skills followed a hidden dependency graph that only the data generator knew. LearnTrace then had to *recover* that graph from their graded answers alone, and it did: every planted dependency came out with the right direction, with no false positives. Having that check meant we could actually trust what the Learning Map was showing.

## The Presentation

This was the rough part. We had **7 minutes** for both the demo *and* the pitch, and fitting everything we'd built into that window was really hard. We had started practicing from the morning of the second day, cutting and reordering things again and again, and even so the presentation didn't go 100% as planned. When you have that little time, every small hiccup costs you.

Then came the wait while the judges deliberated.

We won the **Real World Impact** award.

Considering it was one of the two awards we were aiming for from the start, and knowing how strong the other teams were, it was a very rewarding moment. I'm proud of what we built in such a short time, and of building something that could genuinely help professors and students.

Big thanks to the organizers, the mentors and every team that participated. It was a great event, and exactly the kind of thing I'd do again.

---

*You can read more about LearnTrace in this portfolio's projects section.*