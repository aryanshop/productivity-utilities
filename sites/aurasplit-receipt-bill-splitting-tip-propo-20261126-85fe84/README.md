# AuraSplit: Receipt Bill Splitting & Tip Proportion Laboratory

AuraSplit is a precision bill-splitting, itemized receipt allocation, and proportional tip/tax calculation workstation designed for group dinners, shared travel expenses, roommates, and events.

## Features

1. **Participant Management**: Add and remove group members dynamically with local persistence.
2. **Itemized Receipt Breakdown**: Add individual receipt items with custom pricing and assign them specifically to subset diners (or split among all automatically).
3. **Tax, Tip & Discount Adjustments**: Configure flat tax amounts, custom percentage tips (with 15%, 18%, 20%, 25% quick presets), discounts, and choose whether tips are calculated on pre-tax subtotals or post-tax totals.
4. **Proportional Distribution Engine**: Fairly allocates subtotal shares, proportional tax, proportional tip, and discounts across all participants.
5. **Canvas Visual Breakdown**: Renders a clean interactive HTML5 Canvas donut chart showing percentage share distributions.
6. **Summary Export**: One-click clipboard export for group chat sharing.
7. **Privacy-First**: Operates 100% client-side with zero data collection or tracking.

## Local Run Instructions

1. Clone or download this repository.
2. Open `index.html` in any modern web browser.
3. That's it! No build steps or server requirements.

## Technologies
- Vanilla HTML5, CSS3, and JavaScript (ES6+)
- HTML5 Canvas API
- Web Storage API (localStorage)
