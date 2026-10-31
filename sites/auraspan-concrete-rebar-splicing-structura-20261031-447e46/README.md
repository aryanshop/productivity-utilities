# AuraSpan: Concrete Rebar Splicing & Structural Cover Calculator

AuraSpan is a professional civil engineering and structural construction utility designed for engineers, contractors, and concrete detailers. It computes minimum development lengths ($l_d$), Class B lap splice requirements, ACI 318-compliant concrete clear cover dimensions, and total rebar cutting schedules.

## Features

- **Structural Member Configuration**: Tailor calculations for beams, columns, slabs, and earth-supported foundations.
- **Standard Rebar Sizes**: Supports US customary bar designations from #3 up to #18 with accurate diameters and weights.
- **Environmental Exposure Adjustments**: Evaluates interior, exterior, marine, corrosive, and earth-contact exposure conditions.
- **Live Canvas Visualization**: Interactive structural cross-section displaying reinforcement cages, stirrup ties, and concrete clear cover limits.
- **Cut List Schedule**: Generates comprehensive bar mark cutting schedules with lap splice allowances.
- **Local Persistence & Export**: Save calculation sessions to browser storage and export structured JSON reports.

## Local Run Instructions

1. Download or clone this repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. No server setup, external dependencies, or build tools are required.

## Technology Stack

- Pure Vanilla HTML5, CSS3, and JavaScript (ES6+).
- HTML5 Canvas for real-time structural rendering.
- LocalStorage API for offline session saving.
