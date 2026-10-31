# AuraChord: Harmonic Interval & Chord Progression Lab

AuraChord is an interactive music theory workbench and chord progression designer tailored for songwriters, producers, and musicians. Built with vanilla HTML, CSS, and modern JavaScript, it runs entirely client-side with zero external dependencies.

## Features

- **Diatonic Scale Palette**: Select any Root Note (C through B) and Scale/Mode (Major, Natural Minor, Harmonic Minor, Dorian, Mixolydian, Pentatonic) to instantly compute diatonic chord scales.
- **Harmonic Function Highlighting**: Color-coded cards identify Tonic, Subdominant, and Dominant chord functions.
- **Interactive Progression Timeline**: Click diatonic chords to build, inspect, and arrange custom multi-measure chord progressions.
- **Web Audio API Synthesizer**: Audition single chords or loop through your entire progression with a responsive multi-oscillator polyphonic synth.
- **Cadence & Arc Analysis**: Real-time harmonic analysis detailing Roman numeral sequences and cadence resolutions (Authentic, Plagal, Half).
- **Local Persistence**: Save your favorite chord progressions directly to your browser's localStorage for future songwriting sessions.

## Local Run Instructions

1. Download or clone this repository.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Enable sound using the top header button to audition chord voicings and progressions.

## Technical Architecture

- **Vanilla HTML5 & CSS3**: Fully responsive CSS Grid layout with custom properties and polished dark-mode styling.
- **Vanilla JavaScript**: Modular ES6 architecture handling harmonic math, Web Audio scheduling, and storage.
- **Privacy First**: Zero network requests, analytics, cookies, or external libraries.
