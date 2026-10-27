# AeroGrid: Workspace Desk Cable & Power Load Optimizer

AeroGrid is a professional, client-side utility designed for remote workers, developers, and desktop enthusiasts to calculate desk electrical power loads, evaluate circuit safety limits, estimate monthly electricity costs, and visualize cable routing.

## Features

- **Electrical Load Calculator**: Computes total wattage, amperage draw based on adjustable regional circuit voltages (120V US / 230V EU), and percentage capacity limits.
- **Safety Circuit Warnings**: Automatically flags high continuous load warnings (>80%) and potential breaker overload hazards (>100%).
- **Monthly Cost Estimator**: Calculates estimated monthly electricity expense based on customizable electricity tariffs ($/kWh).
- **Interactive Hardware Inventory**: Add, manage, and categorize hardware devices (computers, monitors, audio interfaces, lighting, chargers).
- **Desk Cable Routing Visualizer**: Live HTML5 Canvas rendering of desk topology, surge protector hub placement, device nodes, and estimated cable routing.
- **Data Portability**: Export and import workspace setups as clean JSON files.
- **Persistent Storage**: Automatically saves your workspace inventory locally in the browser.

## Local Run Instructions

1. Download or clone this repository.
2. Open `index.html` directly in any modern web browser.
3. No server setup or external dependencies required.

## Tech Stack

- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+).
- HTML5 Canvas for interactive vector graphics.
- LocalStorage for client-side persistence.
- 100% offline and privacy-first (no telemetry or external network calls).
