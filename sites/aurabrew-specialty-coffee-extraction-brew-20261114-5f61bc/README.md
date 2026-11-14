# AuraBrew: Specialty Coffee Extraction & Brew Ratio Laboratory

AuraBrew is a precision specialty coffee extraction laboratory and brew ratio calculator for home baristas, coffee roasters, and enthusiasts. It helps dial in extraction metrics, water temperatures, grind sizes, and pour schedules across multiple popular brew methods.

## Features
- **Multi-Method Support**: V60 Pour-Over, Chemex, French Press, AeroPress, Espresso, and Cold Brew.
- **Dual Calculation Modes**: Compute water requirements from dry coffee dose or calculate coffee dose from a target cup volume.
- **Precision Metrics**: Computes brew ratios, theoretical extraction efficiency (%), Total Dissolved Solids (TDS) projection, and grind size recommendations.
- **Pour Timeline**: Generates a step-by-step extraction timeline with timed water pours for manual pour-over methods.
- **Thermal Slurry Decay Simulation**: Interactive HTML5 Canvas cooling curve visualizing water temperature loss during extraction.
- **Recipe Bookmarking**: Save favorite brew parameters directly to browser local storage with one-click deletion.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No installation, build tools, or server required (100% static client-side application).

## Technology Stack
- Vanilla HTML5, CSS3, and JavaScript (ES6+)
- HTML5 Canvas for thermal visualization
- CSS Grid & Flexbox responsive design
- LocalStorage API for offline recipe persistence
