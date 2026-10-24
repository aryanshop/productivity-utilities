# AuraVault: Secure Password Strength & Entropy Inspector

AuraVault is a professional, client-side cryptographic password strength inspector, entropy calculator, and secure offline passphrase generator. Built for privacy-conscious users, developers, and security enthusiasts.

## Features

1. **Real-Time Password Strength Inspector**: Type or paste any password to instantly analyze cryptographic entropy (in bits), character pool size, and estimated brute-force crack times across online attacks, desktop GPUs, and enterprise clusters.
2. **Security & Composition Audits**: Evaluates modern NIST compliance rules including length requirements, mixed-case letters, numbers, special symbols, dictionary word checks, keyboard walk detections, and repeating pattern analysis.
3. **Secure Passphrase Generator**: Diceware-style customizable passphrase generator with adjustable word counts (3 to 8 words), capitalization rules, random number/symbol appending, and custom word separators.
4. **Session Audit Ledger**: Tracks tested passwords and entropy metrics locally in memory during your session.
5. **100% Offline & Private**: Zero network requests, zero telemetry, and zero data storage outside your browser's local memory.

## Local Run Instructions

Since this is a fully static web application requiring no build tools or backend servers:

1. Download or clone the repository containing `index.html`, `style.css`, and `script.js`.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Enjoy instant offline password auditing and passphrase generation!

## Technology Stack

- Pure Vanilla HTML5, CSS3, and modern ECMAScript JavaScript.
- No external frameworks, CDNs, or external font files.
