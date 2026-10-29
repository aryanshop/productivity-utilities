# AuraGrid: Solar Panel & Off-Grid Battery Autonomy Planner

AuraGrid is a precision solar energy sizing and off-grid battery autonomy calculation workbench designed for homeowners, vanlifers, and remote cabin operators. Built entirely with vanilla HTML5, CSS3, and modern JavaScript, it runs completely offline with zero external dependencies.

## Features

- **Appliance Load Inventory**: Add, customize, and audit your household or camper electrical loads in Watt-hours per day.
- **Solar Array Calculator**: Computes exact solar panel quantities needed based on your regional peak sun hours and system efficiency losses.
- **Battery Bank Autonomy**: Estimates required battery capacity (Ah) across different voltages (12V, 24V, 48V) and battery chemistries (LiFePO4, AGM, Flooded Lead-Acid) taking into account usable depth of discharge (DoD) and target autonomy days.
- **MPPT Sizing**: Calculates recommended charge controller Amperage ratings with safety factor margins.
- **24-Hour Energy Balance Simulation**: Interactive HTML5 Canvas chart comparing cumulative solar harvest curves against daily load consumption.
- **Local Persistence & Export**: Automatically saves your appliance inventory to `localStorage` and supports one-click JSON system configuration export.

## Local Run Instructions

1. Download or clone the repository.
2. Open `index.html` in any modern web browser.
3. Adjust peak sun hours, system voltages, and appliance loads to instantly calculate your solar power requirements.

## Technical Architecture

- **Pure Vanilla Stack**: No frameworks, build steps, external scripts, or external fonts.
- **Responsive UI**: Built with CSS Grid and Flexbox for seamless adaptation across mobile devices, tablets, and desktop workstations.
- **Privacy First**: All calculations and storage remain 100% client-side.
