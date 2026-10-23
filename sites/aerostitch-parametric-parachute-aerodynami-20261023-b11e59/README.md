# AeroStitch: Parametric Parachute & Aerodynamic Decelerator Designer

AeroStitch is a professional, client-side engineering workbench for designing parachutes, drogues, and aerodynamic decelerators. Built for rocketeers, modelers, search-and-rescue payload engineers, and physics educators.

## Features

- **Physics-Based Calculations**: Computes terminal velocity, nominal surface area, drag force, and dynamic opening shock loads using standard aerodynamic equations.
- **Multiple Canopy Geometries**: Supports Hemispherical (Dome), Flat Circular, Cruciform (Square), and Annular canopy types with preset drag coefficients ($C_d$).
- **Interactive SVG Blueprint**: Live visualizer that renders scale canopy profile diagrams and individual gore panel layouts with seam dimensions.
- **Fabric & Cut List Estimator**: Generates a complete bill of materials including gore panel dimensions, suspension line lengths, and estimated total fabric weight and linear yardage.
- **Export & Print**: One-click JSON design spec export and clean print view.

## Local Run Instructions

Since AeroStitch is a 100% static client-side web application, no build tools, package managers, or backend servers are required.

1. Download or clone the repository containing `index.html`, `style.css`, and `script.js` into a single folder.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).

## Tech Stack

- Vanilla HTML5, CSS3, and Modern JavaScript (ES6+)
- Responsive SVG for parametric rendering
- Zero external dependencies, libraries, or network requests.
