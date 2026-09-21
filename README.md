# Western Reaches Map

A single-page fog-of-war hex map for the Shadowdark "Western Reaches" campaign. Players see the
basemap under full fog; the GM signs in, reveals hexes, and every viewer sees the update live.
See the [live site](https://flinney.github.io/western-reaches-map/).

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

Opening `index.html` via `file://` does not work because the entry point uses ES modules
(`<script type="module">`) and dynamic `import()`, which require an HTTP origin.

No build step, package manager, or test suite is needed.

## Demo mode

With the committed `firebase-config.js` unchanged, the app renders the basemap under full fog
with no sign-in required. The `Backend` adapter in `index.html` gates the Firebase load on the
`apiKey` value — if it contains a placeholder string, or if the Firebase CDN is unreachable,
the app falls back to demo mode and shows a brief in-app notice:

- Unconfigured: "Demo mode — add Firebase settings in firebase-config.js to go live"
- CDN blocked or offline: "Couldn't reach the live server — showing the map read-only"

**You do not need to sign in or configure Firebase to see the map render locally.**

Note: the committed config contains a real `firebaseConfig` block (connected to an active
Firebase project) but leaves `GM_UID = "YOUR_GM_UID"`. A fresh local clone will attempt to
reach the live Firebase project; the "no sign-in required" property is about not needing to
authenticate, not about making zero network calls.

## Going live with your own Firebase project

The top-of-file comment in [`firebase-config.js`](./firebase-config.js) is the canonical
walkthrough. Replace the `firebaseConfig` values with your own project's config and set
`GM_UID` to your Firebase Auth user's UID.

## Files

Served by the deploy:

- `index.html` — the entire application (markup, styles, and logic in one file)
- `firebase-config.js` — Firebase project settings and GM UID
- `assets/map.webp` — the basemap image

Not committed (gitignored, never enter the deployed artifact):

- `data/poi.json` — spoiler key of keyed points of interest; the GM imports it once into
  Firestore via the sign-in modal's file picker
- `.env` — local secrets (not read by any app code; all config flows through `firebase-config.js`)
- `.planning/` — local planning docs

## Deploy

Every push to `main` triggers `.github/workflows/pages.yml`, which uploads the repo root to
GitHub Pages with no build step. The workflow can also be run manually from the Actions tab.

## Where the deep docs live

`CLAUDE.md` (at the repo root) covers architecture and hex-grid calibration details.
`.planning/codebase/` contains a deeper codebase map (note: `.planning/` is gitignored, so
this directory is available only in local clones, not on the deployed site).
