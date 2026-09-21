# Western Reaches — Interactive Hex Map

A shared, fog-of-war hex map for the Western Reaches Shadowdark campaign.
Players open a link and see only the hexes the party has explored; the GM
signs in and reveals or hides hexes with a click. Everyone shares one
party-wide reveal state that syncs live.

- **Base map** under fog of war (the campaign region map, cleaned to parchment).
- **Reveal / hide** any hex as GM — players see it appear instantly.
- **Fast-travel network**: click an explored hex to highlight the connected
  chain of explored neighbours you can travel through.
- **Keyed points of interest** show names and details **to the GM only**.
  Players see the map's own location markers on revealed hexes, never the key.
- **Demo mode**: before Firebase is set up, the map runs read-only under full
  fog so you can confirm it renders.

Grid: 6-mile flat-top hexes, columns 1–64, rows 0–80, coordinates as `CCRR`
(e.g. `3435` = column 34, row 35). The pixel↔hex transform is calibrated to
the source map (RMS ~2.3 px).

---

## What's in here

```
index.html          the whole app (map engine + Firebase glue)
firebase-config.js  your Firebase settings — edit this, safe to commit
assets/map.webp     the parchment base map
data/poi.json       the keyed-location spoiler data — GITIGNORED, stays local
.gitignore
README.md
```

`data/poi.json` is deliberately **not** committed. It holds every keyed
location's name and type — the spoilers. It lives on your machine and, once
you import it, in Firestore behind GM-only rules. It never ships in the public
repo and is never sent to a player's browser.

---

## One-time setup

### 1. Put it under version control with jj

From inside this folder:

```
jj git init
```

(This has to be run by you — `jj` isn't available in the assistant's sandbox.)
That creates the git backing store jujutsu uses. You'll create the GitHub
remote and push in step 4.

### 2. Set up Firebase (free tier is plenty)

Firebase gives you the live sync and the GM login. The free "Spark" plan
covers a group this size with room to spare.

1. Go to <https://console.firebase.google.com> and **Add project**. Name it
   anything (e.g. `western-reaches`). You can skip Google Analytics.
2. In the project, open **Build → Firestore Database → Create database**.
   Start in **production mode**, pick a region near you.
3. Open **Build → Authentication → Get started**, and enable the
   **Email/Password** sign-in provider.
4. Still in Authentication, go to the **Users** tab, **Add user**, and create
   your GM login (your email + a password you choose). This is what you'll type
   into the map's GM login box.
5. Copy the **UID** shown for that user. Open **firebase-config.js** and paste
   it into `GM_UID`.
6. Back in project settings (gear icon → **Project settings → General**),
   scroll to **Your apps**, click the web icon `</>`, register an app, and copy
   the `firebaseConfig` values it shows you into **firebase-config.js**,
   replacing every `YOUR_...` placeholder.

These config values are **not secrets** — they're meant to ship in client code.
Your data is protected by the security rules in the next step, not by hiding
the keys.

### 3. Lock down the data with security rules

In **Firestore Database → Rules**, replace the contents with this, then
**Publish**. Change `PASTE_YOUR_GM_UID_HERE` to the same UID from step 2.5:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Which hexes are revealed. Anyone with the link can read (players need
    // this to see the map); only the GM can change it.
    match /revealed/{hexId} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == "PASTE_YOUR_GM_UID_HERE";
    }

    // The keyed-location spoiler data. GM only, for both reading and writing —
    // players never receive it.
    match /meta/poi {
      allow read, write: if request.auth != null
                         && request.auth.uid == "PASTE_YOUR_GM_UID_HERE";
    }
  }
}
```

### 4. Publish to GitHub Pages

Create an empty repo on GitHub (no README, since you have one), then from this
folder:

```
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

> `jj` note: with a colocated repo (`jj git init` in a folder git already knows,
> or after `git init`), the plain `git` commands above work as written. If you
> prefer to drive everything through jujutsu, use `jj git remote add` and
> `jj git push` instead — either path publishes the same files.

Then on GitHub: **Settings → Pages → Build and deployment**, set **Source** to
*Deploy from a branch*, branch `main`, folder `/ (root)`, and **Save**. After a
minute your map is live at `https://<you>.github.io/<repo>/`. That's the link
you give players.

### 5. Import the point-of-interest key (once)

Open your live map, click **GM login**, sign in with the account from step 2.4.
A one-time prompt offers to **import the POI key** — pick your local
`data/poi.json`. It uploads to Firestore's `meta/poi` document (GM-only), and
from then on keyed hexes show their details to you on any device you sign in
from. You only do this once.

---

## Running it locally while you iterate

Because `index.html` loads Firebase and `firebase-config.js` as ES modules,
open it through a local server rather than double-clicking the file:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

With placeholder config it comes up in demo mode; with real config it's the
live map. This is the natural place to keep working in Claude Code — edit
`index.html`, refresh, and push when you're happy.

---

## Notes & honest caveats

- **The base map image is downloadable.** On any public static site, a
  determined player can fetch `assets/map.webp` directly and see the whole
  region under the fog. The *keyed locations* (names, types) stay hidden — those
  live only in GM-only Firestore. For a friendly group this is the right
  trade-off; if you ever want the terrain itself hidden too, that needs a
  server that renders per-player tiles, which is a much bigger build.
- **One shared reveal state.** Every player sees the same explored hexes — this
  is the party-wide map you asked for, not per-player fog.
- **Costs.** Firestore's free tier limits (reads/writes/storage per day) are far
  above what a hexcrawl group generates. You're very unlikely to hit them.
