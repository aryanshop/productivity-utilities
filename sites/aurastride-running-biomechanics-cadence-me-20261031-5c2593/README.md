# AuraStride: Running Biomechanics & Cadence Metronome Lab

AuraStride is a precision running biomechanics workbench and interactive metronome lab designed for runners, coaches, and endurance athletes. It runs entirely client-side with no external dependencies or server requests.

## Features

- **Live Biomechanics Calculator**: Instantly computes stride length, estimated ground contact time (GCT), vertical oscillation, and 30-minute calorie burn based on height, weight, speed, and cadence.
- **Interactive Web Audio Metronome**: Features an accurate lookahead audio scheduler using the Web Audio API with customizable tones (woodblock, digital beep, click) and visual pulse rings.
- **Cadence vs Stride Length Optimizer**: Renders an interactive HTML5 Canvas optimization curve displaying optimal endurance cadence zones.
- **Workout Split & Interval Calculator**: Generates detailed split tables for distances ranging from 1 km to full marathons.
- **Session History Logging**: Save and reload training session presets directly in browser LocalStorage.
- **Unit System Toggle**: Instantly switch between Metric (km/h, cm, kg) and Imperial (mph, in, lbs) units.

## Local Run Instructions

1. Download or clone the repository containing `index.html`, `style.css`, and `script.js`.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Enjoy configuring your cadence and testing the metronome!

## Technical Stack

- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+).
- Web Audio API for precise rhythmic audio feedback.
- HTML5 Canvas API for real-time biomechanical visualization.
