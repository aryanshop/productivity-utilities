# AuraPace: Visual Metronome & Polyrhythm Frequency Lab

AuraPace is a precision timing, tempo, and polyrhythm laboratory built for musicians, producers, audio engineers, and public speakers. Designed with vanilla HTML5, CSS3, and modern JavaScript, it delivers professional-grade metronome capabilities directly in your browser without requiring any external libraries or network requests.

## Features

- **Precise Audio Synthesis**: Powered by the browser's native Web Audio API, offering clean, zero-latency click tones across multiple sound profiles (Classic Woodblock, Digital Beep, Metal Cowbell, Soft Sine).
- **Dynamic Visual Pendulum**: Real-time SVG animated pendulum synchronized precisely with tempo and subdivisions.
- **Customizable Time Signatures & Subdivisions**: Configure meters from 2/2 up to 12/8 with quarter, eighth, triplet, and sixteenth-note subdivisions.
- **Interactive Tap Tempo**: Tap rhythmically on the button to instantly calculate and lock in your target BPM.
- **Live Session Statistics**: Real-time tracking of elapsed session time, total beats counted, and measure progression.

## Local Run Instructions

1. Download or clone the repository containing `index.html`, `style.css`, and `script.js`.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Click **▶ Start Metronome** and adjust tempo or sound settings as desired.

## Technical Architecture

- Pure vanilla front-end implementation.
- Zero external dependencies, tracking, or network fetching.
- Fully accessible keyboard controls and responsive design optimized for desktops and mobile devices.
