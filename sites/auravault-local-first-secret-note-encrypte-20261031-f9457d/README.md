# AuraVault: Local-First Secret Note & Encrypted Share Studio

AuraVault is a precision, zero-knowledge encryption utility and secret note sharing studio designed to protect confidential information entirely client-side. Utilizing native browser Web Crypto API (PBKDF2 key derivation and AES-GCM 256-bit encryption), users can lock sensitive credentials, API tokens, and private notes into tamper-proof ciphertexts without any server communication.

## Key Features
- **Client-Side AES-GCM**: Industry-standard authenticated encryption with 100% execution in the browser sandbox.
- **Passphrase Entropy & Strength Inspector**: Real-time feedback measuring password complexity and bits of entropy.
- **Passphrase Generator Lab**: Create high-entropy Diceware word passphrases or customizable random alphanumeric passwords with offline crack-time estimators.
- **Vault Export/Import**: Package encrypted envelopes into self-contained JSON files or drop files directly into the decryption canvas.
- **Zero Server Telemetry**: Operates completely offline with no third-party libraries, external tracking, or cookies.

## Local Run Instructions
1. Download or clone all project files (`index.html`, `style.css`, `script.js`, `README.md`) into a local directory.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Enjoy secure secret management instantly!

*Note: This is a static client-side project with zero external network requests.*
