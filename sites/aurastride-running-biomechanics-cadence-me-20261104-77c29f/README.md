# AuraStride: Running Biomechanics & Cadence Metronome Lab

AuraStride is a precision running biomechanics workbench, stride optimizer, and audio-visual metronome designed for endurance runners, coaches, and athletes seeking to refine running efficiency and maintain consistent cadence.

## Features

- **Runner Profile & Pace Workbench**: Configure height, weight, speed (km/h or mph), and pace (min/km or min/mi).
- **Biomechanics Calculations**: Instantly computes stride length relative to height, estimated ground contact time (GCT), vertical oscillation efficiency, and caloric expenditure.
- **Audio-Visual Metronome**: Built with the native Web Audio API to deliver customizable cadence clicks (Digital Beep, Woodblock, Mechanical Click) accompanied by an animated visual pendulum and pulse ring.
- **Tap Tempo**: Quickly tap out your cadence in real-time to sync the metronome.
- **Distance Split Predictor**: Automatically generates projected times, paces, and total steps across standard race distances (1k, 3k, 5k, 10k, Half Marathon, Marathon).
- **Session Logging**: Store and reload your favorite workout blueprints securely using browser localStorage.

## Local Run Instructions

1. Download or clone the repository containing `index.html`, `style.css`, and `script.js`.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Enjoy a 100% client-side, zero-dependency running utility!

## Technology Stack
- Vanilla HTML5
- Modern CSS3 with CSS Grid & Flexbox
- Vanilla JavaScript (ES6+)
- Web Audio API for zero-latency audio generation
