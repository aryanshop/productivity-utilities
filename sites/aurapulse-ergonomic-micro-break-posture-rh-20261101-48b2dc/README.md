# AuraPulse: Ergonomic Micro-Break & Posture Rhythm Architect

AuraPulse is a precision workspace wellness and micro-break rhythm planner designed for desk workers, programmers, and remote professionals. It orchestrates deep work focus sprints with guided somatic desk stretches, posture reminders, and gentle audio chimes using the Web Audio API.

## Features

- **Precision Rhythm Timer**: Customize work-to-break intervals (Pomodoro 25/5, Ultradian 50/10, or custom durations) with an animated visual progress ring timer and session tracker.
- **Web Audio API Chimes**: Gentle, ambient synthesized transition chimes when starting or ending focus sprints and micro-breaks.
- **Desk Somatics & Stretches**: Interactive stretch exercises categorized by neck/shoulders, wrists/hands, eye strain, and spine with live countdown timers.
- **Streak & Session Logs**: Tracks your daily movement streak, total focus minutes, and completed exercises locally via browser `localStorage`.
- **Ergonomic Tips & Rhythms**: Shufflable posture prompts and ergonomic workstation tips.
- **Fully Local & Private**: 100% client-side with no external dependencies, tracking, or network requests.

## Local Run Instructions

Since this is a fully static web application requiring no build tools or backend servers:

1. Save all project files (`index.html`, `style.css`, `script.id`, `README.md`) into a single folder.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).

## Technology Stack

- **HTML5**: Semantic layout with accessible button controls and modal structures.
- **CSS3**: Modern custom properties (CSS variables), dark/light theme support, CSS Grid & Flexbox, responsive layouts.
- **Vanilla JavaScript**: Modular state management, `localStorage` persistence, Web Audio API frequency oscillator synthesis, and dynamic DOM rendering.
