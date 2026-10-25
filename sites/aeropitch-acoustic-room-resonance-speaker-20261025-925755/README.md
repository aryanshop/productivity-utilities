# AeroPitch: Acoustic Room Resonance & Speaker Placement Calculator

## Purpose
**AeroPitch** is a precision acoustic room resonance and speaker placement calculator built for home studio producers, musicians, and audio enthusiasts. It evaluates room dimensions, calculates axial standing wave modes, estimates Speaker-Boundary Interference Response (SBIR) cancellation frequencies, determines Schroeder transition thresholds, and renders a top-down room blueprint with optimal listening position (sweet spot) calculations.

## Features
- **Axial Room Mode Generator**: Computes exact standing wave frequencies up to 300Hz across length, width, and height axes.
- **Schroeder Frequency & RT60 Estimation**: Estimates reverberation time and modal-to-diffuse acoustic transition thresholds based on boundary materials.
- **SBIR Frequency Calculator**: Identifies primary cancellation nulls caused by speaker distance to front walls.
- **Interactive Top-Down Canvas Visualizer**: Renders scale-accurate room layouts, equilateral triangle monitoring geometry, and 38% rule sweet-spot placement.
- **Quick Studio Presets**: Instantly load typical project studio, master control room, or bedroom studio dimensions.

## Local Run Instructions
1. Download or clone the repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No build tools, external servers, or network connection required.

## Technology Stack
- Pure vanilla HTML5, CSS3, and JavaScript.
- Responsive CSS Grid layout.
- HTML5 Canvas for interactive vector rendering.
- 100% client-side privacy with zero data collection or external dependencies.
