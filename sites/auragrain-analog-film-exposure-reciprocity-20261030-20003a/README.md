# AuraGrain: Analog Film Exposure & Reciprocity Lab

AuraGrain is a precision analog photography workbench and utility suite designed for film shooters, darkroom printers, and vintage camera enthusiasts. Built entirely with vanilla HTML, CSS, and JavaScript with zero external dependencies.

## Features

1. **Reciprocity Failure Calculator**: Computes Schwarzschild reciprocity failure time compensation for popular black-and-white film stocks (Ilford, Kodak, Fujifilm) combined with optical density filter factors (ND, Circular Polarizers, color contrast filters).
2. **Visual Reciprocity Curve**: Interactive HTML5 canvas graph mapping out exposure compensation curves.
3. **Precision Darkroom Timer**: Fully featured countdown timer with Web Audio API sound cues for long exposures or chemical development steps.
4. **Film Chemistry Dilution Lab**: Quickly calculate exact concentrate and water volumes for common film developer ratios (1:25, 1:50, 1:9, etc.).
5. **Sunny 16 Reference**: Quick reference guide for natural daylight metering without a light meter.

## Running Locally

Simply download or clone the repository and open `index.html` in any modern web browser.

```bash
# Example using Python to serve locally
python3 -m http.server 8080
```

## Privacy & Security

This is a 100% client-side static application. No data, telemetry, or personal information is collected or transmitted.
