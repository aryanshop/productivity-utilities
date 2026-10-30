# AuraStrobe: Persistence of Vision & Stroboscopic Frequency Lab

## Purpose
AuraStrobe is an interactive optical calculation workbench and simulation studio designed for motion designers, lighting technicians, electronics hobbyists, and educators. It simulates stroboscopic frequency freeze effects and Persistence of Vision (POV) LED wand displays in real time.

## Features
- **Stroboscopic Freeze Mode:** Simulate rotating machinery or fans under variable stroboscopic flash rates. Automatically calculate optical phase ratios, slip velocity, and harmonic aliasing thresholds.
- **Web Audio Tone Sync:** Optional Web Audio API oscillator sync that matches stroboscopic flash frequency to audit auditory-visual resonance.
- **POV Wand Display Mode:** Configure custom text messages, wand sweep RPM, LED column resolution, and multiplex refresh rates to visualize circular Persistence of Vision text generation.
- **Real-Time Telemetry:** Live calculation readouts for harmonic order limits, sweep durations, and motion states.
- **Session Export:** Export your exact calculation settings and parameters to a local JSON file.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No build tools, external servers, or package installations required.

## Technology Stack
- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+)
- HTML5 Canvas 2D Rendering Context
- Web Audio API for frequency tone generation
- Local-first design with zero external network requests or tracking.
