# Implementation evidence / Field Engine 0.3.0 candidate

Authority: both supplied implementation prompts. Baseline: `a18911806f2aba6aa0076282d2e2ce77f4f45287`. Release owner: Michael Wave. No auto-merge, npm publication or external repository edits.

## Verification status

- Observed baseline: 17 existing Node tests, syntax, build and static Pages-path verification passed before changes.
- Candidate: 65 Node software tests pass locally. Existing foundation/XR-layout tests are retained, including legacy BTM adapter behavior.
- Candidate static build, relative module resolution, `/GenEWrist/` path verification, hashed offline shell and private SDK packaging pass locally.
- Browser interaction: manually exercised the redesigned console, rings, a permission-gated combat action (energy 73 → 66), sculpt → paint replacement, SIGL layer/stamp editing and external travel cancellation in the cloud browser.
- The extended Playwright CI suite produces desktop, 390/320 px mobile, local-app, offline, storage-recovery and synthetic stereo evidence. CI outcome is recorded on the PR; do not infer a pass from the existence of the script.
- Physical Quest 3 / Touch / hand tracking / comfort / sustained performance: **NOT TESTED**. Use QUEST_ACCEPTANCE.md before qualifying hardware behavior.

## Requirements trace

| Requirement | Implementation / evidence |
| --- | --- |
| Canonical 3–6–9 / original names | catalog.js, preserved foundation tests, nested-rings screenshot |
| WORLD destination, contexts and custom layouts | world-adapter.js, demos.js, world-adapter tests, painting screenshot |
| Explicit grants / safe actions | registration defaults to zero grants; context/action/capability allowlists; revocation/abort tests |
| Host cleanup and navigation safety | core navigation + disposal; subscription/late-update/capture tests; XR teardown tests |
| Persistence isolation / Home fallback | separate preference and creative stores; no host state persistence; Home/blocked-storage tests |
| Useful applications | SIGL, Journal, virtual measure/level, Loom, stones, humor and motes; content tests + browser checks |
| Portal safety and verified links | source inventory in INTEGRATION_PATTERNS.md; confirm/cancel UI; XR confirmation; unavailable Porch/Commons |
| Offline first / Pages | hashed shell allowlist, VM lifecycle tests, build/static/offline verification; browser offline reload |
| Reusable host interface | API 1 declarations, scoped desktop World component, Canvas XR surface, BTM/spatial examples, versioned SDK archive/hashes |
| Stereo / tracking / input safety | per-eye real matrices; pure hit/re-arm tests; synthetic lifecycle/resource tests; browser stereo fixture |
| Accessibility / responsive | semantic buttons, persistent navigation, focus restore, 44 px radial targets, keyboard stamps, text/contrast/motion preferences; mobile browser checks |
| Originality / license / history | original procedural CSS/SVG/WebGL art; MIT; ORIGINS.md retained; no third-party art/runtime dependencies |

## Render counters — software fixture only

A deterministic Node fixture rendered 38 unchanged stereo frames with one Canvas texture upload. Changing the active ring required one additional upload. Teardown released **5 buffers, 1 texture and 2 programs**, removed all tracked session/reference-space/document listeners and cancelled the pending animation callback. This checks software resource behavior; it is not an FPS, battery, thermal or headset benchmark.

## Visual proof

Before/after screenshots were captured from the actual running console, not generated product mockups:

- [v0.2 baseline](screenshots/before-v0.2.jpg)
- [Flagship landing and physical device / Glance](screenshots/landing-glance.jpg)
- [Expanded nested 3–6–9 rings](screenshots/nested-rings.jpg)
- [Realm Atlas](screenshots/realm-atlas.jpg)
- [SIGL layers and editing controls](screenshots/sigl-layers.jpg)
- [World Mode / studio painting](screenshots/world-painting.jpg)

The CI `genewrist-browser-evidence` artifact adds full-page desktop/app captures, mobile SIGL/World layouts, PNG/SVG exports, archive export, a named check-results JSON and clearly labeled **synthetic** stereo captures. The separate `genewrist-sdk-0.3.0` artifact contains the private archive and SHA256SUMS.

## Failures and corrections preserved

- Browser screenshot acquisition initially timed out for a full-page capture; viewport capture succeeded. No headset claim was substituted.
- During manual QA, a CSS-filled icon and an activation fade made wrist content less legible in screenshots. Icons now explicitly use original unfilled strokes; activation keeps text visible.
- Virtual geometry controls initially remounted the slider during input and used a fixed illustrative solid. The input now updates only the visual/measurement fragments, and the solid follows all three dimensions.
- Candidate source was formatted for review. The formatter did not infer an SVG parser; the original small valid SVG remained unchanged. Syntax/build checks validate the delivered sources.

Any CI failures discovered after opening the PR must be repaired and the subsequent successful run linked before declaring browser qualification complete.

### First CI browser failure / repaired

Run `40802063563`, job `123212234422`: the native click on the outer-ring selector timed out because the decorative `.stage-orbit` extended beyond its stage and intercepted pointer events. The fix makes mechanical decoration explicitly pointer-transparent; the actual button is still clicked normally in the regression suite. Syntax, all 62 then-current unit tests, build/static/offline and SDK verification passed in this run before the browser failure. A host-accent contrast regression was also added during review.

### Second CI browser failure / corrected assertion

Run `40802513402`, job `123213675835`: 20 browser checks passed, including all eight working applications and all three mock hosts. The built console successfully reloaded offline and opened SIGL; the test then incorrectly required an inactive, hidden toast to appear in the accessibility tree. It now checks the persistent OFFLINE indicator directly. Review also found that the Recent view’s opt-in explanation needed to refresh when its setting changes; the render key and the same browser regression now cover this.

### Third CI browser failure / responsive repair

Run `40803038378`, job `123215374022`: the first 22 browser checks passed, including real offline reload and the opt-in-history refresh. The narrow layout then revealed horizontal overflow from the rotated stage ornament’s pseudo-elements. The stage now clips its decorative artwork, cards use shrinkable grid columns and long canonical labels wrap. The radial radius also respects the available small display. Manual two-frame CSS viewport inspection now reports equal client/scroll widths (375/375 and 305/305, with desktop scrollbar gutters); native mobile/touch acceptance remains the separate CI case. [Mobile layout review screenshot](screenshots/mobile-layout-review.jpg).

The independent mobile, blocked-storage and synthetic-stereo tail scenarios now preserve their failures together in one CI run. A failure still marks the overall job failed; no acceptance threshold was relaxed.

Mobile review also made the real offline indicator visible as a compact status pill when the normal desktop header indicator is hidden. The mobile browser case explicitly checks this state before its World screenshot.

Final performance/compatibility review coalesces identical allowlisted host updates before notifying presentations. The current BTM adapter also uses BTM’s actual ceil-health/ceil-armor/floor-energy HUD convention, preventing fractional readings from overflowing the combat instruments. Both behaviors have separate regressions.
