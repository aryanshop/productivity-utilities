# AuraBreeze: Indoor Plant Vapor Pressure Deficit & Transpiration Lab

AuraBreeze is a precision horticultural utility designed for greenhouse growers, indoor gardeners, and botanical enthusiasts to calculate and monitor Vapor Pressure Deficit (VPD), relative humidity thresholds, dew points, and leaf transpiration status.

## Features

- **Real-Time VPD Calculation:** Computes Saturated Vapor Pressure (SVP), Actual Vapor Pressure (AVP), and VPD in kPa using Tetens' formula.
- **Leaf Temperature Offset:** Accounts for transpirational cooling where leaf temperatures drop below ambient under LED or HID grow lights.
- **Unit Flexibility:** Toggle seamlessly between Celsius (°C) and Fahrenheit (°F).
- **Growth Stage Guidance:** Match climate metrics against specific plant lifecycle stages (Propagation, Vegetative, Flowering, and Drying/Curing).
- **Snapshot Logging:** Save environmental logs to local storage, review historical adjustments, and export records as JSON.

## Local Run Instructions

1. Download or clone the project repository.
2. Open `index.html` in any modern web browser.
3. Adjust air temperature, relative humidity, and leaf offset sliders to explore climate recommendations.

## Technical Stack

- Pure Vanilla HTML5, CSS3, and JavaScript.
- 100% Client-Side with local storage persistence.
- No external frameworks, build tools, or network requests.
