# AuraVane: Wind Sail & Kite Traction Force Lab

AuraVane is a precision aerodynamics and traction force calculator designed for kiteboarders, sailors, land-sailors, and wind sports enthusiasts. It computes apparent wind vectors, total pulling forces, drive versus heel components, and Beaufort wind safety levels entirely client-side.

## Features
- **Apparent Wind Calculation**: Accurately computes apparent wind speed and angle from true wind and craft velocity vectors.
- **Aerodynamic Force Physics**: Calculates total lift/drag traction force in Newtons and lbf based on air density and sail area.
- **Interactive Vector Canvas**: Real-time visual rendering of true wind, craft velocity, apparent wind, and force vectors.
- **Beaufort Scale Integration**: Automatic safety risk warnings and gale threshold alerts.
- **Snapshot Logging**: Save scenario configurations to local session tables and export logs as JSON.
- **Metric & Imperial Support**: Seamlessly toggle between knots/m² and mph/sq.ft.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser.
3. No build tools, package managers, or server connections are required.

## Technology Stack
- Vanilla HTML5, CSS3, and JavaScript (ES6+)
- HTML5 Canvas 2D API
- Client-side LocalStorage session persistence
