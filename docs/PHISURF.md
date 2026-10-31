# ΦSURF Rung 1 · Gen.E.Wrist quick navigation

**Status:** Rung 1 merged; Rung 2 input refinement candidate. This is a built-in navigation module, not a new application, host, or replacement for the 3–6–9 architecture.

## Supported controls

| Surface | Open | Select | Back / close |
| --- | --- | --- | --- |
| Browser desktop | Floating ΦSURF button or Shift+Space | Click a sector, arrow keys then Enter, or hold the dial's center and flick into the ring before releasing | Escape / Backspace to parent; CLOSE to dismiss |
| Browser touch | Press floating ΦSURF; tap an option | Touch the options; drag-release from launcher when within the dial | BACK / CLOSE |
| Browser gamepad | Manually turn PAD: ON in the dial, then LB | Left stick to aim and release LB, or A to select | B to go back |
| Experimental embedded XR | Existing wrist panel's ΦSURF button | Guarded controller ray and trigger selecting radial options | DIAL BACK / CLOSE DIAL |

Rung 2 introduces a **center-origin gesture**: open PhiSurf, then press the Φ center, move into a radial sector and release. This is a single-level selection gesture, not continuous navigation through multiple nested levels. The same pure radial-sector math handles mouse and gamepad direction. Selection highlight changes do not rebuild the center while its pointer is captured. Keyboard focus stays within the open dial and returns to the previous control after closing.

Gamepad is **off by default**. The browser viewer must opt in to polling; this avoids taking control from a game in a host app. XR uses the existing host-owned controller and input guard, not a new global input hook. There is currently **no physical Quest 3 flick-motion calibration** or guarantee of wrist comfort.

## Menu architecture

Top-level destinations are HOME, UNIVERSAL, WORLD, REALM ATLAS, 3·6·9 MODULES and BACK. Modules branch into the original canonical 3, 6 and 9 sets, not a duplicate catalog. WORLD branches to a safe mode navigation action and, when connected, the host's currently declared context controls. Context actions beyond eight per page are placed under MORE CONTROLS, keeping at most nine live options on a dial.

The headless engine is in `src/phisurf.js`; browser rendering and gestures live in `src/phisurf-dom.js`. `src/xr-surface.js` embeds the engine into the existing canvas and `src/xr.js` forwards dial revisions into the existing texture-upload / neutral-trigger-arming lifecycle. The shared host owns its own save state, gameplay capture and renderer.

## Host security and persistence

- No manifest-supplied JavaScript, external URL, arbitrary file read or hidden state access.
- Host buttons derive strictly from the **current** versioned WorldAdapter manifest/context. Only already-granted controls can be selected, and the underlying `requestWorldAction` checks again when invoked.
- WORLD MODE does not become another universal ring, and pressing HOME is always local. External travel still requires the existing Realm Atlas confirmation flow.
- PhiSurf selection, dial history, host status and grants are not written into localStorage or creative-content archives.
- Closing the UI unsubscribes its listeners; ending the XR surface disposes its copy of the dial.

## Verification

Run `npm run check && npm test && npm run build && npm run verify:static && npm run verify:offline && npm run build:sdk && npm run verify:sdk` on Node 22. Browser tests require the configured Playwright/Chromium runtime; CI runs those separately. Physical Quest 3 testing must independently check sizing, pointer stability, neutral input re-arm, controller conflicts and comfort.

## Follow-up rung

After the Rung 1 implementation is reviewed and the same headless engine is verified in a second consumer, consider the continuous one-motion nested flick, joystick-neutral debounce, actual Quest controller ergonomics, app-specific quick actions, and optional extraction into a PhiSurf repository. Do not fork Gen.E.Wrist's core or bypass WORLD capability grants.
