# AuraGrain: Analog Film Exposure & Zone System Laboratory

AuraGrain is a precision photographic exposure calculator and Ansel Adams Zone System workstation built for analog film photographers, darkroom printers, and photography students.

## Features

- **Film ISO & Metering Control:** Configure film speeds from ISO 25 to 3200 and base light levels across standard Exposure Values (EV -2 to EV 18).
- **Lens Filter Compensation:** Automatically factor in light loss from Yellow, Orange, Red, Polarizer, and Neutral Density filters.
- **Ansel Adams Zone System Integration:** Place shadow and highlight subjects on specific Zones (Zone 0 through Zone X) to ensure optimal shadow detail and highlight preservation.
- **Reciprocity Failure Calculation:** Automatically calculate long exposure adjustments for shutter speeds exceeding 1 second using Schwarzschild's law approximations.
- **Development Push/Pull Calculator:** Determine gamma adjustments (N-2 to N+2) for contrast control during film development.
- **Interactive Zone Step Wedge:** HTML5 Canvas visual representation of the 11-step tonal scale with real-time reflectance inspection.
- **Field Notes Logger:** Save and review shooting setups locally in your browser session.

## Local Run Instructions

Simply clone or download this repository and open `index.html` in any modern web browser. No server, build tools, or external libraries required.

## Technology Stack

- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+).
- Canvas 2D API for interactive tonal zone scaling.
- 100% Client-side execution with zero external data transmission.
