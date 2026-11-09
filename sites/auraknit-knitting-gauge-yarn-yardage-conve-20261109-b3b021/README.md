# AuraKnit: Knitting Gauge & Yarn Yardage Conversion Laboratory

AuraKnit is a precision textile conversion, knitting gauge, and yarn yardage calculator designed for knitters, crocheters, fiber artists, and garment makers. Built as a fully responsive, client-side static web application with local-first vault storage.

## Features

1. **Gauge & Swatch Calculations**:
   - Input measured swatch dimensions (inches or centimeters) and stitch/row counts.
   - Calculates exact stitch and row densities per unit basis (e.g., per 4 inches or 10 cm).
   - Computes aspect ratios to evaluate stitch distortion.

2. **Yarn & Yardage Estimator**:
   - Select yarn weight categories (Lace, Fingering, Sport, DK, Worsted, Bulky, Super Bulky).
   - Configure individual skein yardage and gram weight.
   - Set target project yardage and safety buffers to compute exact skeins required and total estimated project weight in grams/kilograms.

3. **Garment Sizing & Construction**:
   - Tailored for sweaters, cardigans, scarves, hats, and socks.
   - Factors in target bust/circumference and positive/negative ease.
   - Computes precise cast-on stitch counts and vertical row heights.

4. **Interactive Swatch Visualizer**:
   - HTML5 Canvas rendering of the knitted stitch grid pattern based on current gauge ratios.

5. **Local-First Project Vault & Backup**:
   - Automatically saves all projects to browser `localStorage`.
   - Export and import your entire project vault as a standalone JSON backup file.

## Local Running Instructions

1. Download or clone the project files (`index.html`, `style.css`, `script.js`, `README.md`).
2. Open `index.html` directly in any modern web browser.
3. No installation, build tools, or network connection required.
