# AuraVolt: Battery Solar Array & Autonomous Off-Grid Energy Lab

AuraVolt is a precision off-grid electrical system design and solar array sizing workbench designed for van lifers, tiny house builders, boaters, homesteaders, and renewable energy enthusiasts.

## Features
- **Appliance Energy Inventory:** Build and customize a comprehensive list of AC and DC daily electrical loads with automated Watt-hour calculations.
- **Solar Array Sizing:** Compute required photovoltaic wattage and standard panel counts based on peak sun hours and real-world system efficiency derates.
- **Battery Bank Calculator:** Determine minimum Amp-Hour (Ah) and Watt-Hour (Wh) capacities across LiFePO4, AGM, and Flooded lead-acid chemistries with custom Depth of Discharge (DoD) limits and cloudy autonomy days.
- **Inverter Sizing:** Automatically calculates continuous AC loads and recommended inverter surge capacity.
- **Interactive 24-Hour Simulation:** Live HTML5 Canvas rendering of the daily energy balance showing solar generation peaks versus battery state of charge curves.
- **Presets & Export:** Quick-load presets for camper vans and off-grid cabins, plus local JSON system spec export and print summaries.

## Local Run Instructions
Clone or download this repository and open `index.html` directly in any modern web browser.

## Technical Architecture
- Built with vanilla HTML5, CSS3, and modern ES6 JavaScript.
- 100% client-side execution with no external dependencies, tracking scripts, or server connections.
