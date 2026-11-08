# AuraPulse: Ergonomic Micro-Break & Posture Rhythm Architect

AuraPulse is a precision workspace wellness and micro-break rhythm planner designed for desk workers, programmers, and remote professionals. It blends customizable work-to-break interval timers (Pomodoro, Ultradian, and custom rhythms) with curated somatic desk stretches, eye-strain relief exercises, and mindfulness breathwork prompts.

## Features

- **Interactive Visual Timer**: Animated SVG circular progress ring with custom work/break modes and real-time tab title updates.
- **Web Audio API Chimes**: Gentle, synthesizing acoustic chimes to signal session transitions without external media assets.
- **Somatic Desk Exercise Studio**: Curated database of ergonomic desk stretches, neck & shoulder tension relief, 20-20-20 eye strain resets, and box breathing prompts with instant category filtering.
- **Local-First Session Logger**: Automatically tracks completed focus intervals and calculates daily consistency streaks using browser `localStorage`.
- **Fully Client-Side**: No external dependencies, tracking scripts, or network requests. Private and lightning fast.

## Running Locally

Simply open `index.html` in any modern web browser or serve via a local static server:

```bash
# Example using Python 3
python3 -m http.server 8000
```

Navigate to `http://localhost:8000` in your browser.
