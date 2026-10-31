# ΦOperator → Gen.E.Wrist / ΦSURF Bridge (Rung 3)

## Architecture

ΦSURF is built into Gen.E.Wrist at src/phisurf.js and src/phisurf-dom.js. It is **not** a separate 19th 3/6/9 module or standalone PhiSurf repo. This rung adds a local, optional Passport adapter for the browser console without changing WORLD capabilities, host state, or the XR input engine.

Components:

- src/operator-passport.js validates the PhiOperator Passport version 1 schema and derives cosmetic-only reward flags. It uses the dedicated storage key genewrist.operator-passport.v1; no import data is mixed into the wrist settings, creative archives, or world host sessions.
- src/phisurf.js accepts an optional operatorBridge and offers OPERATOR SHORTCUTS as a child of the existing MODULES submenu only after Standard Rank 2 is cleared. It offers three curated existing local tools: SIGL Designer, S.N.A.K.E.'s Toolkit and JourneyLog. It uses the original app-opening calls. Existing world favorites retain their own unrelated behavior. The six fixed root choices and the original 3/6/9 ring groups remain unmodified.
- src/phisurf-dom.js forwards the bridge to the headless engine, while the browser stylesheet displays the earned ΦSURF dial skin.
- src/main.js offers an explicit import/export/remove flow in the existing settings dialog and enables the optional wrist pulse visual from Standard Rank 3.

## Real user flow

1. Open PhiOperator and clear Rank 1, then Rank 2 Standard with at least 7/9. Rank 3 enables the additional pulse cosmetic after clearing it.
2. In PhiOperator → ASCENSION PASSPORT, choose **EXPORT PASSPORT**. This downloads phioperator-passport-v1.json.
3. Open the Gen.E.Wrist browser console and **Device Settings → Operator Passport bridge → IMPORT OPERATOR PASSPORT**.
4. Choose that JSON file and accept the explicit replace confirmation. The status will report the validated cleared rank.
5. Open ΦSURF with Shift+Space or the floating button. Choose 3·6·9 MODULES → OPERATOR SHORTCUTS; launch one of the three existing bundled local apps.
6. To undo, Device Settings → REMOVE IMPORT. Or export a copy before changing browsers.

The browser is intentionally not allowed to read PhiOperator's other-origin localStorage. There is no cross-origin fetch, redirect carrying scores, URL tokens, remote API, account, or server sync.

## Schema / compatibility

PhiOperator currently exports:

    {"format":"phioperator-passport","version":1,
      "results":[{"rank":1,"mode":"standard","bestScore":9}]}

The importer validates version/format, score bounds 0–9, ranks 1–6, two documented modes, unique result keys and a 16 KiB limit. It sanitizes away unexpected attributes. Cosmetic flags require sequential Standard completions; Chaos scores never unlock either integration.

Passports can be edited and spoofed. They are not certificates of identity, trust, competence or access. Nothing in this adapter may bypass the WorldAdapter capability grant checks. Other host software does not receive or automatically import any Passport data.

## Verification

    npm run check
    npm test
    npm run build
    npm run verify:static
    npm run verify:offline
    npm run build:sdk
    npm run verify:sdk

Tests cover malformed inputs, blocked storage, rank thresholds, Chaos separation, menu invariants, curated local-app routing and revocation of the import while ΦSURF is open.

Browser smoke after merge:
- View settings and import a valid exported Passport; confirm the new submenu appears only at Rank 2.
- Test 3/6/9 root navigation, WORLD host grants, keyboard selection, gamepad controls and radial gestures remain functional.
- Import Rank 3 and inspect the wrist pulse, then enable reduced motion to ensure animation stops.
- Remove the import; the optional submenu and colors should disappear without losing your world favorites, host grants, or creative content.
- Test malformed JSON and storage-blocked browser; bad files must fail without overwriting the existing Passport.
- Desktop and mobile screenshots and physical Quest 3 verification remain a separate acceptance step. This PR does not add new XR menu geometry or in-headset cosmetics.

## Next

Possible future adapters: PhiOS-Mobile, PhiServe, DomistikaXR, and optional consent-based local IPC for a genuinely universal Passport. Every consumer must independently honor the no-security-escalation rule.