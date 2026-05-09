# Always On Generators — Field Hub

A Progressive Web App (PWA) built for Always On Generators field technicians and estimators. Every tool runs entirely in the browser with no backend — install it to your home screen and use it offline in the field.

**Live site:** [brandonaog.github.io/AOGHome](https://brandonaog.github.io/AOGHome)

---

## Tools

| Tool | Path | Description |
|---|---|---|
| **Installation Estimate** | `/estimate/` | Quote and pricing forms for new generator installs |
| **Maintenance Report** | `/maintenance/` | Service logs, PMs, and repair documentation |
| **Site Visit / Permitting** | `/site-visit/` | On-site inspection, assessment, and permitting info |
| **Electrical Install** | `/elect-install/` | New generator installation paperwork and checklists |
| **Gas Installation** | `/gas-install/` | Gas line hookup, connection, and installation paperwork |
| **Load Calculation** | `/load-calcs/` | *(Experimental)* Advanced power load analysis and sizing — NEC 2020 |
| **Breaker & Conductor Sizing** | `/breaker-conductor/` | NEC conductor sizing, derating, EGC, and parallel sets |
| **Conduit Fill Calculator** | `/conduit-fill/` | NEC Chapter 9 conduit sizing and fill calculations |
| **Sketch Pad** | `/sketch-pad/` | Freehand site diagrams and field drawings |

---

## Features

**Progressive Web App**
- Installable on iOS (Add to Home Screen) and Android
- Full offline support via Service Worker — all forms available without a connection
- Auto-saves drafts to localStorage every 30 seconds so nothing is lost if the browser closes

**Forms**
- Address autocomplete with Mapbox (falls back to Nominatim/OpenStreetMap)
- GPS location lookup button on address fields
- Form validation with inline error highlighting before PDF/email export
- Email export pre-populates a mailto with key estimate details

**Print / Export**
- PDF button — optimized for both desktop and mobile Safari (single-page output)
- iPhone button — renders the form as a JPEG image for long-press saving to Photos
- Android button — downloads a JPEG directly to Downloads

**UI**
- Light / Dark mode toggle with preference saved to localStorage
- Seasonal themes applied automatically (New Year, Valentine's, St. Patrick's, Spring, Summer, Fourth of July, Halloween, Thanksgiving, Christmas)
- Responsive layout — works on phones, tablets, and desktop

---

## Project Structure

```
AOGHome/
├── index.html              # Hub home page — links to all tools
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (Network-First / Stale-While-Revalidate)
├── offline.html            # Fallback page shown when offline and page not cached
├── logo.png
├── icons/                  # PWA icons (192px, 512px, Apple touch)
├── estimate/               # Installation Estimate form
├── maintenance/            # Maintenance Report form
├── site-visit/             # Site Visit / Permitting form
├── elect-install/          # Electrical Installation form
├── gas-install/            # Gas Installation form
├── load-calcs/             # Load Calculation tool
├── breaker-conductor/      # Breaker & Conductor Sizing tool
├── conduit-fill/           # Conduit Fill Calculator
└── sketch-pad/             # Drawing Pad
```

Each tool is a self-contained `index.html` — no build step, no dependencies to install, no server required.

---

## Local Development

Clone the repo and open any `index.html` directly in a browser. For Service Worker and PWA features to work, serve over a local server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080`.

> **Note:** The Service Worker runs in production scope (`./`). During local testing, set `DEV_MODE = true` in `sw.js` to disable aggressive caching and see fresh changes immediately.

---

## Deployment

The site deploys automatically via **GitHub Pages** from the `main` branch. Push to `main` and the live site updates within a minute or two.

No build process — what's in the repo is what ships.

---

## Tech Stack

- Vanilla HTML, CSS, JavaScript — zero frameworks, zero build tools
- [Orbitron](https://fonts.google.com/specimen/Orbitron) · [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) · [Exo 2](https://fonts.google.com/specimen/Exo+2) via Google Fonts
- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/) for address autocomplete
- [html2canvas](https://html2canvas.hertzen.com/) for iPhone/Android image export
- Service Worker with Cache API for offline support

---

## License

Private — Always On Generators. Not for redistribution.
