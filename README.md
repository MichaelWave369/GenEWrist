# GEN.E.WRIST — The Field Engine

**One wrist. One home. Every world.** Enter the Field / Φ369 Labs.

An original, MIT-licensed, dependency-free, local-first creative console and reusable interface for digital worlds. The **0.3.0 candidate** preserves the canonical eighteen-module **3–6–9** architecture and adds **WORLD Mode**, driven by a trusted host’s versioned registration manifest.

**Universal Mode is who you are. World Mode is what you’re doing.**

**ΦSURF Rungs 1–3 candidate:** A local-first radial quick navigator built *inside* Gen.E.Wrist, not a nineteenth 3–6–9 module. Desktop users can open the dial with **Shift+Space** or the floating ΦSURF control, choose nested modules or destinations, and use an optional explicitly enabled gamepad mode. A center-origin **hold / flick / release** gesture and trapped modal keyboard focus reduce accidental actions and improve accessibility. Rung 3 adds optional dwell-to-dive navigation through nested browser menus while the pointer stays held, plus gamepad neutral-rearm protection. The shared experimental XR canvas now includes an in-headset ΦSURF dial, operated using existing guarded ray/select input. Host actions remain restricted to current-context commands with explicit existing capability grants; no permission is created by opening the dial. Physical Quest 3 behavior is not yet verified.

## Try the console

The existing Pages address remains `https://michaelwave369.github.io/GenEWrist/`. The candidate appears there only after human review/merge and a successful Pages deployment. Source preview:

```sh
npm run dev
```

Open the printed local URL. Activate Field Mode, choose a ring, create a SIGL or open WORLD to try three visibly simulated hosts. Desktop, keyboard, touch and experimental WebXR presentations use the same shared state.

## What works

- Original circular wearable presentation: machined layers, engraved bezel, strap, illuminated rings and copper/ion design language.
- Exact 3 Identity, 6 Tools and 9 Refuge modules, with explicit local-app/concept/planned labels.
- WORLD combat, studio and explorer/inventory demonstrations; subscribed sculpt → paint changes; explicit grants, revocation and clean disconnect.
- SIGL: five layers, color/brush control, radial symmetry, undo/redo, geometric stamps, explicit local projects, transparent PNG/SVG export.
- JourneyLog: manually written private notes, archive import/export and deletion. No silent travel logging.
- Virtual geometry measure/level/left-hand gauge, actual Loom app launches, DriftRocks, Laughter Forge and GlowMotes.
- Realm Atlas search, favorites, opt-in recents, configured Home and accessible confirmed external handoffs. Unverified destinations remain disabled.
- Content-versioned offline shell after first successful cache; validated preferences/content with blocked-storage session fallback.
- Experimental standalone XR: original 3D wearable/environment, per-eye projection, tracked wrist/controller fallback, pointer hit testing, guarded selection, in-headset navigation and deterministic cleanup.

## Verify / build

Node 20+; CI uses Node 22. No runtime dependency install is required.

```sh
npm run check
npm test
npm run build
npm run verify:static
npm run verify:offline
npm run build:sdk
```

`dist/` is deployable under `/GenEWrist/` or another static HTTPS subpath. `npm run test:browser` requires the Playwright/Chromium test runtime; CI installs the pinned runtime and captures desktop/mobile/synthetic stereo evidence. The private SDK archive includes a version and per-file SHA-256 manifest; no npm publication occurs.

## Boundaries

WorldAdapter API 1 exposes only allowlisted status and explicitly granted actions. No arbitrary memory reads, remote plugins, telemetry, accounts or automatic game-save transfer. Host state/grants never enter user preference or creative-content storage. Gen.E.Wrist owns shared behavior; each host owns its state, input rules, rendering lifecycle and saves.

BTM’s existing v0.2 integration remains untouched. A tested current-game WorldAdapter example is included, but installation requires a separate BTM PR. Infinite Porch remains the intended universal Home after a verified web deployment/integration; until then the local console is always available.

Physical Quest 3 acceptance is **pending**. Synthetic stereo and automated tests do not prove comfort, performance or hardware compatibility. Other original fictional modules remain clearly labeled concepts; separate websites do not share a single XR session.

[PhiSurf controls and boundaries](docs/PHISURF.md) · [Architecture](docs/ARCHITECTURE.md) · [WorldAdapter API](docs/ADAPTER_API.md) · [Host patterns](docs/INTEGRATION_PATTERNS.md) · [Provenance](docs/ORIGINS.md) · [Plan](docs/FLAGSHIP_PLAN.md) · [Quest acceptance](docs/QUEST_ACCEPTANCE.md) · [Evidence](docs/IMPLEMENTATION_EVIDENCE.md)
