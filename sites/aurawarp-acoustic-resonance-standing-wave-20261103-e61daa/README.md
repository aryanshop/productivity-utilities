# AuraWarp: Acoustic Resonance & Standing Wave Room Lab

AuraWarp is a precision client-side acoustical room mode calculator and standing wave frequency analyzer designed for home studio producers, acoustic engineers, and musicians.

## Features
- **Eigenmode Calculation**: Computes axial, tangential, and oblique room modes (eigenmodes) up to 300Hz based on precise room dimensions.
- **Interactive Canvas Spectrum**: Visualizes modal frequency distribution and highlights strong axial resonances.
- **Sweet Spot Locator**: Applies the industry-standard 38% rule to recommend optimal speaker and listening positions.
- **Unit Flexibility**: Supports both Imperial (Feet) and Metric (Meters) room dimensions.
- **Export Studio Session**: Download full calculation reports and mode tables as JSON files locally.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser.
3. Adjust room dimensions and construction parameters to instantly recalculate acoustic eigenmodes.

## Technology Stack
- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+).
- HTML5 Canvas for frequency spectrum rendering.
- 100% Client-side operation with zero external dependencies or network requests.
