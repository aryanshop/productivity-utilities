# AuraBrew: Specialty Coffee Extraction & Brew Ratio Laboratory

AuraBrew is a precision specialty coffee brewing workstation and extraction calculator designed for home baristas, coffee enthusiasts, and specialty roasters. Built as a fully client-side static web application with zero external dependencies or network tracking.

## Features

- **Multi-Method Ratio Calculation**: Instant ratio computation for V60 Pour-over, Chemex, Aeropress, French Press, Espresso, and Cold Brew.
- **Bidirectional Calculation**: Calculate water requirements from dry coffee dose or calculate coffee dose from target brewed volume.
- **Custom Pour Schedule Generator**: Dynamic step-by-step pouring and agitation timelines with bloom intervals.
- **Interactive Extraction Matrix**: HTML5 Canvas extraction surface plot showing TDS vs. Extraction Yield against ideal specialty coffee extraction zones.
- **Precision Brew Timer**: Fully interactive brew timer with Web Audio API chime cues for pour intervals.
- **Local Brew Archive**: Save your favorite brewing sessions directly to browser `localStorage` with backup and deletion support.

## Local Run Instructions

1. Download or clone repository files (`index.html`, `style.css`, `script.id`, `README.md`).
2. Open `index.html` directly in any modern web browser.
3. No build tools, package managers, or server connections required.

## Technical Architecture

- Pure vanilla HTML5, modern CSS3 (Grid/Flexbox variables), and modular vanilla JavaScript.
- Client-side storage via browser LocalStorage API.
- Synthesized audio output using Web Audio API oscillator nodes.
