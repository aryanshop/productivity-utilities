# StellarPalette: Exoplanet Atmosphere & Color Spectrum Analyzer

StellarPalette is an interactive productivity and worldbuilding utility designed for astronomers, sci-fi authors, and astrophotography enthusiasts. It calculates and visualizes the precise sky color spectrum, atmospheric scattering properties, and horizon glow of exoplanets based on stellar classification and complex gas composition recipes.

## Features
- **Stellar Class Selection & Temperature Slider**: Choose between M, K, G, F, and A-type star classifications or fine-tune exact Kelvin temperatures from 2,500K to 10,000K.
- **Interactive Atmospheric Composition Sliders**: Adjust percentage balances of Nitrogen ($N_2$), Carbon Dioxide ($CO_2$), Methane ($CH_4$), Water Vapor ($H_2O$), and Sulfur Dioxide ($SO_2$/Aerosols) with automatic normalization.
- **Planetary Parameters**: Configure surface atmospheric pressure (0.1 to 10.0 atm) and solar elevation angles (0° to 90°).
- **Real-time Sky Dome Simulation**: HTML5 Canvas rendering engine depicting simulated zenith-to-horizon gradients and stellar disk position.
- **Dynamic Swatch Generator**: Instant extraction of hexadecimal color values for zenith, horizon, sunset glow, and host star.
- **Export Utilities**: One-click CSS variable generation and JSON blueprint export.
- **Atmospheric Physics Breakdown**: Instant calculation of dominant scattering types (Rayleigh vs. Mie), optical thickness, and insolation index.

## Local Run Instructions
1. Download or clone the repository containing `index.html`, `style.css`, and `script.js`.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No build tools, package managers, or server installation required. Runs completely client-side in vanilla HTML, CSS, and JavaScript.
