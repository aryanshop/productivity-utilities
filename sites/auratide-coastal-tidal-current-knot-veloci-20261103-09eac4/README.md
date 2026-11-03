# AuraTide: Coastal Tidal Current & Knot Velocity Laboratory

AuraTide is a precision coastal navigation and marine tidal flow calculator built for sailors, sea kayakers, anglers, and marine educators. It models tidal velocity curves, Rule of Twelfths progressions, and safe transit windows entirely client-side.

## Features
- **Tidal Velocity Modeling**: Calculates peak ebb and flood currents with adjustable tidal cycles (Semi-diurnal, Diurnal, Spring, Neap).
- **Safe Transit Windows**: Computes exact duration windows where current velocity stays below user-defined vessel thresholds.
- **Rule of Twelfths Breakdown**: Detailed hourly fractional breakdown table for standard tidal flow management.
- **Interactive Canvas Visualizer**: Renders real-time harmonic current curves and threshold reference markers.
- **Session Logging & Export**: Save simulation parameters locally and export logs as JSON backups.

## Local Run Instructions
1. Download or clone all files (`index.html`, `style.css`, `script.js`, `README.md`) into a single folder.
2. Open `index.html` directly in any modern web browser.

## Technology Stack
- Pure Vanilla HTML5, CSS3, and JavaScript.
- HTML5 Canvas for graphical curve rendering.
- LocalStorage API for persisting user logs.
- Zero external dependencies, build tools, or network tracking.
