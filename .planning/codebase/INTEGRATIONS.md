# External Integrations

**Analysis Date:** 2026-09-21

## Architectural Invariant: Read-Only Demo Mode

The most important integration property of this app is that **it renders fully without any network connection**. The `Backend` object in `index.html` (lines 187–213) is designed so that if Firebase is unconfigured or if the CDN import fails, the map still loads under full fog, read-only, with no errors. Every code path that touches the network goes through `Backend`; no external call is ever made directly from UI code.

This invariant must be preserved: any new backend calls must extend `Backend` and must degrade gracefully to a no-op or a rejected promise that the caller handles.

---

## Firebase

**Version:** 10.12.5

**SDK import method:** Dynamic CDN import, not a package dependency. There is no `package.json`. The three modules are loaded lazily inside `initFirebase()` (`index.html` line 205–206):

```
https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js
https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js
https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js
```

The dynamic import is gated: it only fires when `firebaseConfig.apiKey` is present and does not contain the `"YOUR_"` placeholder string (`index.html` line 184):

```js
var configured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf("YOUR_")<0);
```

**Config location:** `firebase-config.js` (committed, non-secret). Exports `firebaseConfig` (standard Firebase web app config object) and `GM_UID`.

**Project ID:** `western-reaches` (visible in `firebase-config.js`)

---

### Firestore

**Database type:** Cloud Firestore (not Realtime Database).

**SDK functions used** (destructured from `firebase-firestore.js` at init time, stored in `SDK`):
- `collection`, `doc`, `setDoc`, `deleteDoc`, `onSnapshot`, `getDoc`

**Collections and documents:**

#### `revealed/{hexId}`
- One document per revealed hex.
- Document ID: 4-character zero-padded string `CCRR` (column, row), e.g. `"3952"`.
- Document shape: `{ t: <ms> }` — a single field `t` holding the Unix timestamp (milliseconds) of when the hex was revealed.
- The *existence* of the document is the fact — `t` is metadata only.
- Live-synced to all clients via `onSnapshot` on the entire collection (`index.html` line 199). Every client (players and GM) receives the same stream; the Set `revealed` in local state is rebuilt from the snapshot on every change.

```js
// Write (GM reveal):
SDK.setDoc(SDK.doc(FB.db, "revealed", id), { t: Date.now() })

// Delete (GM hide):
SDK.deleteDoc(SDK.doc(FB.db, "revealed", id))

// Live read (all clients):
SDK.onSnapshot(SDK.collection(FB.db, "revealed"), snap => { ... })
```

#### `meta/poi`
- A single document at the fixed path `meta/poi`.
- Document shape: `{ hexes: { "CCRR": { name, terrain, region, type }, ... } }`.
- Read only by authenticated users (Firebase security rules enforce this server-side).
- Fetched once after GM sign-in via `getDoc` (`index.html` line 195, `Backend.getPOI`).
- Written once (one-time seed) via `setDoc` when the GM uploads a local `data/poi.json` (`index.html` line 196, `Backend.seedPOI`).

```js
// Read (GM sign-in):
SDK.getDoc(SDK.doc(FB.db, "meta", "poi")).then(s => s.exists() ? s.data().hexes : null)

// Write (one-time seed):
SDK.setDoc(SDK.doc(FB.db, "meta", "poi"), { hexes: hexes })
```

---

### Firebase Auth

**Auth method:** Email/password only (`signInWithEmailAndPassword`).

**Sign-in flow:**
1. User clicks "GM Login" button (`index.html` line 356).
2. If `Backend.configured` is false, a flash message prompts the user to add Firebase settings — the modal does not open.
3. Modal opens; user submits email + password.
4. `Backend.login()` calls `SDK.signInWithEmailAndPassword(FB.auth, em, pw)`.
5. On success the modal closes. `onAuthStateChanged` fires, `onGMChange(true)` is called.
6. On failure: if `e.code === "auth/invalid-credential"`, shows "Wrong email or password."; otherwise shows the raw Firebase error message.

**GM detection logic** (`index.html` line 202):

```js
SDK.onAuthStateChanged(FB.auth, function(u) {
  pendingGM(!!(u && (!GM_UID || GM_UID.indexOf("YOUR_") >= 0 || u.uid === GM_UID)));
});
```

- If `GM_UID` is the placeholder `"YOUR_GM_UID"`, **any signed-in user is treated as GM**. This is a deliberate bootstrap escape hatch for initial POI seeding.
- Once `GM_UID` is set to a real UID, only that specific user gets GM privileges. All other signed-in users are treated as non-GM.

**Sign-out:** `Backend.logout()` calls `SDK.signOut(FB.auth)`. Auth state change fires `onGMChange(false)`, which clears `isGM`, `gmMode`, `gmKey`, and resets UI.

**Note:** Firebase security rules enforce server-side access control. The `isGM` client flag only controls what the UI offers — it is not a security boundary.

---

### Configured vs. Demo Mode Detection

The app detects its operating mode at startup (before any Firebase load):

| Condition | Mode | Behavior |
|-----------|------|----------|
| `apiKey` missing or contains `"YOUR_"` | Demo | Flash "Demo mode — add Firebase settings…"; `Backend.configured = false`; `onRevealed(cb)` calls `cb(new Set())` immediately; `onGM(cb)` calls `cb(false)` immediately |
| `apiKey` is real but CDN blocked / offline | Falls back to demo | `initFirebase()` catches the import error, sets `configured = false`, flashes "Couldn't reach the live server — showing the map read-only" |
| `apiKey` is real and CDN reachable | Live mode | `onSnapshot` streams `revealed/` collection; auth state monitored |

---

### Failure Modes Handled in Code

**CDN blocked or offline during init (`index.html` line 212):**
```js
catch(e) {
  console.error("Firebase load/init failed:", e);
  configured = false;
  Backend.configured = false;
  flash("Couldn't reach the live server — showing the map read-only");
}
```
App continues rendering read-only; no crash.

**Offline save failure during reveal/hide (`index.html` line 305):**
```js
op.catch(function(e) {
  if(willReveal) revealed.delete(id); else revealed.add(id);
  renderFog(); renderOverlay();
  flash("Couldn't save the change — check your connection");
  console.warn(e);
});
```
Optimistic local update is rolled back if Firestore write fails.

**Firestore sync error on `onSnapshot` (`index.html` line 200):**
```js
function(err) { console.warn("revealed sync error", err); }
```
Logged; no UI crash.

**GM button clicked when unconfigured (`index.html` line 357):**
```js
if(!Backend.configured) { flash("Add your Firebase settings in firebase-config.js"); return; }
```
Modal does not open; user sees a flash message.

**POI seed file is invalid JSON (`index.html` line 371):**
```js
catch(err) { flash("That file isn't valid JSON"); }
```

---

## Google Fonts

**Service:** Google Fonts CDN

**Integration method:** Standard `<link rel="stylesheet">` in `<head>` (`index.html` lines 8–9). No API key required.

**Fonts loaded:**
- `Cinzel` (weights 500, 600, 700) — branding, headings, coordinate labels
- `Spectral` (regular, medium, semibold; normal and italic) — body text, search input, modal text

**Preconnect hints** (`index.html` lines 6–7):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**Failure mode:** If Google Fonts CDN is blocked, the app falls back to `Georgia, serif` (Spectral fallback) and the browser's default serif (Cinzel fallback). Defined in CSS on `body` and `.btn` elements. No functionality is affected — fonts are purely decorative.

**No environment variables required.**

---

## Webhooks & Callbacks

None. The app is a read/write client only; it receives no incoming webhooks.

---

## Required Environment Configuration

| Variable | Location | Purpose | Required for live mode |
|----------|----------|---------|----------------------|
| `firebaseConfig.apiKey` | `firebase-config.js` | Firebase project auth | Yes |
| `firebaseConfig.authDomain` | `firebase-config.js` | Firebase Auth domain | Yes |
| `firebaseConfig.projectId` | `firebase-config.js` | Firestore project | Yes |
| `firebaseConfig.storageBucket` | `firebase-config.js` | Firebase Storage (unused in app currently) | No |
| `firebaseConfig.messagingSenderId` | `firebase-config.js` | Firebase messaging | No |
| `firebaseConfig.appId` | `firebase-config.js` | Firebase app identifier | Yes |
| `GM_UID` | `firebase-config.js` | GM account UID gate | Recommended (omit = any signed-in user is GM) |

A `.env` file is present (gitignored) — its contents are not read by any application code. All configuration flows through `firebase-config.js`.

---

*Integration audit: 2026-09-21*
