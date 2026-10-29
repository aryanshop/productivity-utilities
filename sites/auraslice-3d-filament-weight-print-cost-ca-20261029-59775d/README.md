# AuraSlice: 3D Filament Weight & Print Cost Calculator

AuraSlice is a precision 3D printing economics and filament spool management workbench designed for makers, hobbyists, and print farm operators. It runs entirely client-side with zero external dependencies.

## Features

- **Filament Spool Costing**: Calculate exact material cost per gram based on spool purchase price and net weight.
- **Energy & Wear Estimation**: Factor in printer power draw (watts), local electricity rates ($/kWh), and machine maintenance/wear-and-tear hourly rates.
- **Failure Contingency & Labor**: Account for print failures, wastage safety margins, and post-processing labor hours.
- **Profit Markup & Pricing**: Instantly evaluate total production costs and suggested retail prices across customizable markup percentages.
- **Interactive Canvas Breakdown**: Visualize cost distribution (filament, power, wear, labor, risk) with a responsive HTML5 pie chart.
- **Local Inventory Vault**: Save custom spool profiles directly to browser `localStorage` and quickly load or manage them.
- **Report Export**: Export professional print job estimates directly to CSV.

## Local Run Instructions

1. Download or clone this repository.
2. Open `index.html` in any modern web browser.
3. That's it! No build steps or web servers required.
