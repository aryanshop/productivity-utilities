# AuraPulse: Biophilic Circadian Lighting & Solar Arc Studio

## Purpose
AuraPulse Studio is an interactive biophilic lighting and circadian rhythm design workbench tailored for remote workers, interior designers, and architects. It simulates daily solar trajectories, calculates biological melanopic lux (mEDI) based on workspace window orientation and room depth, and maps out optimal correlated color temperature (CCT) shifts to support peak cognitive alertness during deep work and evening wind-down.

## Features
- **Workspace Parameter Configuration**: Adjust window orientation (North, East, South, West, Skylight), room depth from window, glass visual transmittance, and seasonal declination.
- **Interactive Solar Arc Canvas**: Live HTML5 Canvas rendering of the sun's trajectory across the sky with responsive time scrubbing.
- **Circadian Rhythm Profile**: Visualizes cortisol (alertness) and melatonin (wind-down) biological curves across a 24-hour cycle.
- **Lighting Prescription Engine**: Calculates precise CCT (Kelvin) and mEDI values in real time for any hour of the day.
- **Preset & Export Studio**: Quick preset loader and detailed circadian schedule export tool for lighting design implementation.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser.
3. No server setup or build tooling required (100% vanilla client-side static web application).

## Technology Stack
- Vanilla HTML5, CSS3, and JavaScript (ES6+)
- HTML5 Canvas API for real-time solar arc and rhythm curve rendering
- Responsive CSS Grid and Flexbox layout with dark theme aesthetics
