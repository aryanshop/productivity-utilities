# AeroStitch: Parametric Parachute & Aerodynamic Decelerator Designer

## Overview
AeroStitch is a precision engineering utility and design workbench for rocketry enthusiasts, hobbyists, search-and-rescue payload designers, and physics students. It calculates parachute and drag canopy dimensions using fundamental aerodynamics and physics equations (terminal velocity, drag equation, and tensile load distribution).

## Key Features
- **Flight & Payload Calculator**: Computes required surface area, nominal diameter ($D_0$), dynamic kinetic force in Newtons, and estimated canopy mass based on payload mass, descent speed, air density, and structural safety factors.
- **Interactive Canopy Geometry**: Supports Hemispherical, Flat Circular, Cruciform, and Annular decelerator geometries with configurable gore/panel counts.
- **Live Blueprint SVG Generator**: Instantly renders precision single-gore sewing patterns with seam allowances and top-down assembly profiles.
- **Fabric Cut List & BOM Estimator**: Select from 30D Silnylon, 70D Ripstop Nylon, Polyester Chiffon, or Tyvek with automated material yardage and weight estimation.
- **Exportable Blueprints**: Download high-resolution SVG blueprints directly from the browser.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No build tools, external servers, or dependencies required. Runs 100% locally and offline.

## Technical Architecture
- Built with vanilla HTML5, modern CSS3 (Grid, Custom Properties, Responsive Layouts), and interactive client-side JavaScript.
- Zero external libraries or third-party trackers. All calculations and SVG renderings happen entirely in-memory.
