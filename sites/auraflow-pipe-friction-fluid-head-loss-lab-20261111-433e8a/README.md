# AuraFlow: Pipe Friction & Fluid Head Loss Laboratory

AuraFlow is a precision fluid dynamics and pipe friction head loss laboratory designed for mechanical engineers, plumbers, aquaponics designers, and DIY irrigation hobbyists. It models liquid flow behavior through pipes and fittings using rigorous fluid mechanics equations.

## Features
- **Fluid Profiles:** Select from multiple fluids including water at varying temperatures, ethylene glycol, seawater, and olive oil with accurate density and viscosity properties.
- **Flexible Units & Sizes:** Configure flow rates in GPM, L/min, or m³/h with standard pipe nominal diameters or custom millimetric inner diameters.
- **Darcy-Weisbach & Colebrook-White Calculations:** Automatically computes Reynolds numbers, laminar vs. turbulent flow regimes, friction factors, and head losses.
- **Fittings & Elevation Modeling:** Account for equivalent lengths of 90°/45° elbows, gate valves, tees, and static elevation changes.
- **Interactive Canvas Schematic:** Real-time animated visualization of laminar and turbulent fluid particle streams inside the pipe.
- **Session Log & Export:** Keep track of your system calculations in a local session table and export records to JSON.

## Local Run Instructions
1. Download or clone the repository containing all files (`index.html`, `style.css`, `script.js`, `README.md`).
2. Open `index.html` directly in any modern web browser.
3. No external dependencies, server setups, or build tools are required.

## Technical Note
This is a static client-side web application built with vanilla HTML5, CSS3, and JavaScript, relying on the native HTML5 Canvas API and local storage data handling.
