# SparkSplit: Dynamic Group Expense & Receipt Fairness Engine

SparkSplit is a privacy-first, fully client-side web utility designed for roommates, group travel, dinners, and shared projects to track expenses, itemize receipts, and calculate the absolute minimum number of settlement transactions required to settle all debts.

## Features
- **Participant Management**: Add and manage group members with persistent local storage.
- **Flexible Expense Splitter**: Record shared costs with Equal Split, Exact Dollar Amounts, or Weighted Shares.
- **Itemized Expense Ledger**: Review expense history and inspect detailed split breakdowns.
- **Minimal Debt Settlement Engine**: Automatically computes net balances and simplifies debt obligations into the fewest possible payments.
- **Interactive Debt Network Graph**: Visual SVG overview showing group payment relationships.
- **Export & Reset**: Download your complete session summary as JSON or clear data anytime.

## Local Run Instructions
1. Download or clone all files (`index.html`, `style.css`, `script.js`, `README.md`) into a single directory.
2. Open `index.html` in any modern web browser.

## Technology Stack
- Pure vanilla HTML5, CSS3, and JavaScript (ES6+).
- No external frameworks, build tools, CDNs, or network requests. All data stays securely in your browser's local storage.
