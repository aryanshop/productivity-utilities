# AuraVault: Client-Side AES-GCM Encrypted Secret & Note Vault

AuraVault is a privacy-first, zero-knowledge client-side encryption utility and secure note management workspace. It empowers users to store sensitive passwords, API keys, confidential notes, and private journal entries securely inside their browser using industry-standard **AES-GCM 256-bit encryption** backed by **PBKDF2** key derivation.

## Key Features

- **Zero-Knowledge Architecture**: All encryption and decryption happen strictly in your browser using the native Web Crypto API. No plaintext or keys ever touch any server.
- **Master Passphrase & Entropy Meter**: Real-time password strength scoring helps you construct robust cryptographic passphrases.
- **Categorized Secure Notes**: Organize credentials, API keys, secure notes, and private journal entries with custom tags and instant search filtering.
- **Backup & Restore**: Securely export and import your encrypted vault data via localized JSON backup files.
- **Privacy Focused**: No third-party trackers, no cookies, no external fonts or CDN requests.

## Running Locally

Because this project is entirely static (HTML5, CSS3, and vanilla JavaScript), you can run it instantly without build tools or package managers:

1. Download or clone the repository containing `index.html`, `style.css`, and `script.js`.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).

## Tech Stack

- **HTML5 & CSS3**: Responsive CSS Grid layout with custom dark theme styling.
- **JavaScript (ES6+)**: Modular vanilla JavaScript.
- **Web Crypto API**: Native browser `window.crypto.subtle` implementing PBKDF2 (100,000 iterations) and AES-GCM 256.
