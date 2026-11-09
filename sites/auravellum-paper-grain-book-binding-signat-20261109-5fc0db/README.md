# AuraVellum: Paper Grain & Book Binding Signature Laboratory

AuraVellum is a precision bookbinding, paper grain orientation, and signature imposition laboratory built for bookbinders, printmakers, journal makers, and zine creators.

## Features

- **Book & Signature Configuration**: Input finished book dimensions, total page counts, and choose from multiple professional binding styles (Case Binding / Smyth Sewn, Saddle Stitch, Coptic Stitch, Japanese Stab Binding).
- **Paper Stock & Caliper Library**: Select from standard text and cover weights (70gsm up to 250gsm cover stock) with verified caliper thicknesses.
- **Parent Sheet Imposition**: Configure parent sheet sizes (US Letter, Tabloid, A4, A3, 25x38" publisher sheets) to evaluate optimal layout yields and waste percentages.
- **Spine Bulk & Weight Calculation**: Instantly computes exact spine thickness (bulk) in inches and millimeters, number of signatures required, parent sheets needed with makeready buffer, and total paper weight.
- **Grain Direction Validator**: Automatically checks whether paper grain runs parallel or perpendicular to the spine to prevent buckling and ensure smooth page turns.
- **Interactive Canvas Schema**: Renders visual imposition diagrams and signature stack previews.
- **Project Export**: Export complete production specifications as local JSON.

## Local Run Instructions

1. Download or clone repository.
2. Open `index.html` in any modern web browser.
3. All calculations and rendering run entirely client-side with zero external dependencies or network requests.

## Technology Stack

- Pure HTML5 Semantic Markup
- Modern CSS3 Variables & Responsive Grid
- Vanilla ES6 JavaScript
- HTML5 Canvas 2D API
