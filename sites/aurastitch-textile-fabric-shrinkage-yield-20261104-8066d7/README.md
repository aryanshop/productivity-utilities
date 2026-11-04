# AuraStitch: Textile Fabric Shrinkage & Yield Estimator

AuraStitch is a precision sewing, tailoring, and textile yardage calculator designed for garment makers, sewists, quilters, and DIY crafters. It computes accurate fabric requirements, post-wash shrinkage allowances, pattern matching waste percentages, and grainline yield optimization.

## Features
- **Pre-Treatment Shrinkage Calibration:** Set warp (length) and weft (width) shrinkage percentages to prevent post-wash garment shrinkage surprises.
- **Dynamic Pattern Piece Inventory:** Add, edit, and delete custom garment pattern pieces with dimensions and quantities.
- **Waste & Layout Factors:** Adjust for pattern matching (plaid/stripes/naps) and couture seam allowances.
- **Visual Bolt Simulation:** HTML5 Canvas representation of fabric bolt layout and grainline distribution.
- **Instant Cost & Yield Calculation:** Automatically converts square inches into precise linear yardage (rounded up to standard 1/8 yard increments) and total material cost.
- **Local-First Persistence:** Saves projects directly in your browser's `localStorage` with zero external network requests or tracking.

## Local Run Instructions
1. Download or clone this repository.
2. Open `index.html` in any modern web browser.
3. That's it! No build tools, package managers, or server setups required.

## Technology Stack
- Vanilla HTML5, CSS3, and ES6 JavaScript.
- Responsive CSS Grid and Flexbox layout.
- HTML5 Canvas for interactive bolt visualization.
