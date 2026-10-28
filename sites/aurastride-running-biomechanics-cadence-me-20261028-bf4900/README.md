# AuraStride: Running Biomechanics & Cadence Metronome Lab

## Overview
AuraStride is a precision running biomechanics workbench, stride rate calculator, and interactive audio-visual metronome designed for runners, coaches, and endurance athletes. It helps users analyze running efficiency, optimize stride length relative to pace and cadence, calculate ground contact times, and maintain target cadence through real-time audio cues.

## Features
- **Runner Profile & Pace Customization**: Configure height, weight (with Metric/Imperial toggle support), and running speed (min/km or min/mi).
- **Precision Cadence Metronome**: Interactive audio-visual metronome powered by the Web Audio API with customizable pitch, visual pendulum feedback, and quick cadence adjustment buttons.
- **Biomechanics Calculations**: Computes stride length, estimated ground contact time (GCT), vertical oscillation, and overall efficiency scores.
- **Interactive Stride Curve Chart**: Real-time canvas visualization mapping stride length against cadence curves for your exact running velocity.
- **Distance Split & Step Calculator**: Automated table computing total step counts and split times for 1km, 5km, 10km, and Half Marathon distances.
- **Session History Logging**: Save and review past biomechanics profiles directly in your browser's LocalStorage.

## Local Run Instructions
1. Download or clone the project repository.
2. Open `index.html` directly in any modern web browser.
3. No build tools, external packages, or internet connection are required.

## Technical Stack
- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+)
- Web Audio API for synthetic metronome audio generation
- HTML5 Canvas for dynamic biomechanics curve rendering
- LocalStorage for session history persistence
