# AuraVibe: Acoustic Room Response & Speaker Placement Lab

## Overview
AuraVibe is a precision acoustic room simulation and speaker placement workbench designed for audiophiles, home studio producers, musicians, and acoustic enthusiasts. It computes foundational room acoustic metrics, analyzes speaker boundary interference response (SBIR), calculates axial room modes, and renders a top-down interactive room map featuring optimal equilateral stereo sweet spots.

## Features
- **Room Dimension & Geometry Calculator:** Configure room length, width, and ceiling height in Feet or Meters with instant axial mode (F1) computation.
- **Boundary Construction Modeling:** Select wall materials (Drywall, Concrete, Brick, Glass) and flooring surfaces to calculate reverberation time (RT60).
- **SBIR Front-Wall Cancellation Analysis:** Predicts boundary interference frequencies and provides recommendations for bass traps and speaker positioning.
- **Interactive Canvas Room Map:** Top-down visualization displaying L/R monitors, toe-in angles, listener sweet spots, and 38% rule guidelines.
- **Local-First Preset Management:** Save and restore custom room configurations securely in browser `localStorage` without external servers or network requests.

## Local Run Instructions
1. Download or clone the repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No build tools, compilers, or server hosting are required.

## Tech Stack
- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+)
- HTML5 Canvas 2D API for real-time architectural rendering
- LocalStorage API for local state persistence

## Privacy
100% client-side calculation and rendering. No analytics, telemetry, or external scripts.
