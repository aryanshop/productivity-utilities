# AuraSlate: Solar Array & Cable Voltage Drop Calculator

AuraSlate is a precision electrical engineering and solar photovoltaic wire sizing laboratory designed for off-grid system builders, electricians, van lifers, and renewable energy hobbyists.

## Features
- **DC Circuit Sizing**: Configure system voltages (12V, 24V, 48V, 120V), run distance in feet or meters, maximum amperage, and conductor material (Copper vs. Aluminum).
- **Engineering Analytics**: Calculates round-trip wire resistance, exact voltage drop in volts and percentage, delivered terminal voltage, power loss in watts, and estimated annual energy waste.
- **Interactive Canvas Chart**: Visualizes voltage drop percentages across all standard AWG wire sizes (14 AWG to 4/0) with a clear target threshold limit line.
- **Auto-Select Recommendation**: Instantly calculates and selects the minimum wire gauge required to stay within your target voltage drop threshold.
- **Local-First Presets**: Save, load, and manage circuit configurations securely in browser local storage.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser.
3. No build tools, external libraries, or server requirements needed. All calculations and rendering run 100% client-side.

## Technical Stack
- Vanilla HTML5, CSS3, and Modern JavaScript (ES6+)
- HTML5 Canvas for responsive graphical visualization
- Web Storage API for local preset persistence
