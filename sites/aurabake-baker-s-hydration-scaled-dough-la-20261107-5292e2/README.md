# AuraBake: Baker's Hydration & Scaled Dough Laboratory

AuraBake is a precision baking formulation and baker's percentage laboratory designed for artisan bakers, pastry chefs, and home sourdough enthusiasts. Built with zero external dependencies or network requests, it runs entirely client-side with local-first vault storage.

## Features

- **Baker's Percentage Engine**: Instantly compute exact grammage or weight equivalents (Grams, Kilograms, Ounces, Pounds) based on customizable flour base weights.
- **Dynamic Ingredient Manager**: Add, edit, or remove custom ingredients, preferments, hydration sources, and inclusions with real-time percentage recalculations.
- **Desired Dough Temperature (DDT) Calculator**: Compute exact friction-adjusted water temperatures based on target dough, room, flour, and friction temperatures.
- **Proportional Canvas Bar Visualizer**: Inspect dough formula composition with an interactive graphical ratio breakdown.
- **Artisan Schedule Timeline**: View estimated bulk fermentation, stretch-and-fold intervals, and cold retard steps.
- **Local Vault Storage & Markdown Export**: Save custom recipes to browser local storage or export formatted Markdown recipe sheets instantly.
- **Classic Presets**: Load classic dough formulas including Artisan Country Sourdough, Neapolitan Pizza, Brioche, and Ciabatta.

## Running Locally

Simply clone or download this repository and open `index.html` in any modern web browser.

```bash
# Example using Python to spin up a local static server
python3 -m http.server 8080
```

## Technology Stack

- Vanilla HTML5 & Semantic Markup
- Modern CSS3 (Grid, Flexbox, Custom Properties)
- Vanilla ES6 JavaScript
- HTML5 Canvas for interactive graphics
- Browser LocalStorage & Blob API for client-side persistence and export
