# Nirbhaya Grid — Women's Safety Auto-Trigger

Module 05 of 8 in **Project Kavach** (Unified Safety Command Grid), presented for
RBVP 2026. **Concept & design only — no hardware has been built for this module.**

## What this is

Manual panic-button wearables already exist and work well — but they all share one
weak point: they need the wearer to be conscious, free, and able to press a button.
Nirbhaya Grid proposes an **automatic secondary trigger** — a heart-rate + motion
anomaly detector — that fires the same alert chain even when the wearer can't act,
running alongside the manual button rather than replacing it.

This site is a website-only exhibition deliverable: an honest landing page, a live
in-browser simulation of the trigger logic, and a documents hub for judges.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page — "What Already Exists" vs. "What We Changed," and the 3-step trigger flow |
| `trigger-demo.html` | Live simulated heart-rate chart + motion meter with Panic Button, Simulate Exercise, and Simulate Distress controls |
| `documents.html` | Write-up, synopsis, system documentation, logbook, presentation, and demo video |

## Folder structure

```
nirbhaya-grid-exhibition-site/
├── index.html
├── trigger-demo.html
├── documents.html
├── css/
│   └── style.css                 (shared Kavach-family dark theme)
├── js/
│   └── trigger-demo.js           (simulated heart-rate/motion stream, anomaly logic, manual trigger, alert log)
├── assets/
│   ├── fonts/                    (self-hosted Rajdhani / IBM Plex Sans / IBM Plex Mono — see below)
│   └── docs/
│       ├── NirbhayaGrid_Writeup_national_2026.pdf
│       ├── NirbhayaGrid_Synopsis_2026.pdf
│       ├── NirbhayaGrid_System_Documentation.pdf
│       ├── NirbhayaGrid_Logbook_2026.pdf
│       ├── NirbhayaGrid_Presentation_2026.pdf
│       └── NirbhayaGrid_Demo_2026.mp4
├── kavach-design-system.md       (canonical design tokens shared across the whole Kavach family)
├── netlify.toml
└── README.md
```

### Why `assets/fonts/` exists

The site is built to work fully offline once loaded — no exhibition wifi, no CDN
calls. Rather than linking Google Fonts, the three typefaces (Rajdhani, IBM Plex
Sans, IBM Plex Mono) are shipped as local `.ttf` files with `@font-face` rules in
`assets/fonts/fonts.css`, which every page links directly:
```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
```
This isn't a separate feature to maintain — it's the offline-fonts requirement,
just living in its own subfolder next to `assets/docs/`.

## Deploying

Push this folder as its own repo → connect to Netlify → `netlify.toml` sets the
publish directory to the repo root, so no build step is needed.

## Still needed

- Drop the six real files into `assets/docs/` using the exact filenames above
- Decide the live Netlify URL once deployed, to link from the Kavach hub's module grid
