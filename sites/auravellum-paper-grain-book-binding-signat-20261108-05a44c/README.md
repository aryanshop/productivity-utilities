# AuraVellum: Paper Grain & Book Binding Signature Laboratory

AuraVellum is a precision bookbinding, paper grain orientation, and signature imposition laboratory designed for bookbinders, printmakers, journal makers, and zine creators. Built with vanilla HTML5, CSS3, and JavaScript.

## Features

- **Comprehensive Book Specs:** Configure finished book page dimensions (width & height), total page counts, and binding styles (Case Binding, Coptic Stitch, Saddle Stitch, Japanese Stab).
- **Paper Grain & Stock Analysis:** Select paper weights (80gsm text up to 300gsm cover stock) and parent sheet sizes (A3, A4, US Letter, Tabloid, Large Press Sheets) to evaluate grain direction compatibility and prevent page buckling.
- **Signature Imposition & Folding Engine:** Automatically calculate signature counts, total parent sheets required, spine bulk thickness, and folio folding sequences.
- **Interactive Canvas Imposition Map:** Visualize page layouts on parent press sheets with grain direction indicators and signature folio pagination navigation.
- **Bindery Specifications & Tooling Guide:** Instantly compute recommended greyboard thickness, ribbon dimensions, and adhesive types.
- **Local Project Presets:** Save and restore custom book projects using browser `localStorage` without external servers or network requests.

## Local Execution

Simply clone or download this repository and open `index.html` in any modern web browser. No build tools, package managers, or server environments are required.

## Static & Privacy-First

All calculations, rendering, and preset storage occur entirely client-side. No tracking, telemetry, or external scripts are used.
