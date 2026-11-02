# AuraGlow: Home LED Lighting Wattage & Cost Estimator

AuraGlow is a precision home lighting audit and LED retrofit calculator designed for homeowners, renters, and interior designers. It evaluates legacy lighting installations (incandescent, CFL, halogen) against modern LED replacements to compute exact annual electricity savings, payback intervals, and carbon dioxide offset metrics.

## Features

- **Room Circuit Builder**: Add individual rooms, specify fixture counts, daily usage hours, current legacy bulb types, and target LED wattages and color temperatures.
- **Preset Loaders**: Instantly load sample configurations for a 3-Bedroom Apartment, Suburban Home, or Small Studio/Office.
- **Real-Time Financial Analytics**: Calculates exact annual kilowatt-hour consumption, electricity costs based on configurable local utility rates ($/kWh), and net annual dollar savings.
- **Environmental CO₂ Impact**: Computes yearly carbon dioxide emission reductions associated with lower energy consumption.
- **HTML5 Canvas Visualizer**: Renders a dynamic comparison chart illustrating current vs. optimized LED costs across all rooms.
- **Data Export & Persistence**: Stores your session securely in browser `localStorage` and supports exporting comprehensive JSON audit reports.

## Local Run Instructions

1. Download or clone this repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No build tools, external servers, or package managers required. The application runs entirely client-side.

## Technologies Used

- Pure HTML5, CSS3, and Vanilla JavaScript (ES6+)
- Canvas 2D API for data visualization
- Web Storage API for local data persistence

## License

This project is released under the MIT License.
