# AuraVibe: Acoustic Room Response & Speaker Placement Lab

AuraVibe is a precision acoustic engineering and speaker placement laboratory designed for mixing engineers, audiophiles, home studio owners, and acoustic designers. It offers real-time calculation of modal frequencies, speaker boundary interference response (SBIR), and interactive room layout simulation.

## Features

- **Interactive Top-Down Room Canvas**: Drag and drop studio monitors and listening sweet spot coordinates directly with real-time feedback.
- **Axial Room Mode Calculator**: Computes exact standing wave frequencies for room length, width, and height up to 300 Hz.
- **SBIR & Schroeder Frequency Diagnostics**: Analyzes primary speaker boundary interference cancellation frequencies and modal transition thresholds based on boundary wall material properties.
- **Equilateral Triangle Geometry Validation**: Instantly verifies stereo imaging angles and adherence to acoustic placement rules (such as the 38% rule).
- **Local-First Presets & JSON Export**: Save configurations to browser storage or export workspace setups for documentation.

## Local Run Instructions

1. Download or clone this repository.
2. Open `index.html` in any modern web browser.
3. No external dependencies, servers, or build tools are required.

## Technology Stack

- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+).
- HTML5 Canvas for interactive vector rendering.
- LocalStorage API for workspace persistence.
