# Host integration patterns / 0.3.0 candidate

These are integration patterns and tested examples in **GenEWrist only**. No other project is modified, no remote plugin is loaded, and none of these examples constitutes a deployed integration.

| Host | Contexts / approved presentation | Host-owned state and commands | Required follow-up |
| --- | --- | --- | --- |
| BTM | Combat instruments; navigation/map | Player health/armor/energy; weapon name and unlock count; objective; Ori, map, weapon callbacks | Install pinned SDK, connect HUD events, preserve WristComputer targeting, suppression and neutral re-arm; run existing combat/save/XR tests |
| Domistika XR | Sculpting studio → painting studio; later layers/inventory | Selected tool, virtual material, active layer; reviewed tool, palette, undo commands | Register contexts from actual editor mode changes; input capture blocks sculpt/paint strokes while UI is active |
| Infinite Porch | Explorer, room tools, inventory | Current room, explicitly shared companion label, approved lighting/navigation callbacks | Verify the intended web Home deployment and integration first; do not read peer identities, messages or encrypted files into the wrist |
| PhiOS XR | Explorer/portal inspector, panel arrangement | Selected portal metadata and host-owned scene focus | Reuse its XR session and ray dispatch; external links keep confirmation/session-end semantics; no privileged PhiOS OS bridge |
| LENZ | Explorer, inventory, combat only where actual mechanics exist | Approved zone, equipped item, explicitly supplied objective | Model available mechanics honestly; XR currently has experimental stationary zones, not assumed full combat support |

`examples/spatial-hosts.js` demonstrates a minimal event-driven host registration. `examples/btm-world.js` uses BTM’s observed `activate('ori')`, `activate('map')`, `activate('weapon', index)` boundary and real HUD field names. `subscribeHUD`, input capture and repaint callbacks are host-supplied interfaces that must be implemented in that host’s separate integration PR.

## Verified destination sources

Inspected during this implementation:

- BTM merged PR #5 (`4a7ee816c9984f435ff4fabc031cd0ed4eddd847`), `docs/genewrist-bridge.md`, `src/genewrist-bridge.js`, `src/genewrist-ui.js`, `src/world-ui.js` and `src/main.js`.
- PhiOS-XR README’s VR Worlds launchpad documents Domistika XR, BTM, Spark VR, Pulse369’s public `quest.html` lab and LENZ. It also documents the PhiOS-XR Pages destination.
- SparkTheSubstrate README explicitly lists its Pages and `/vr/` destinations.
- Pulse369 README describes the full studio separately. The launcher uses the documented public Quest Lab, not the account-backed full studio.
- Infinite-Commons README describes a Pages candidate, rather than an independently verified live deployment. Its launch entry remains unavailable.
- Infinite-Porch README describes a native qualification candidate. No verified browser Home endpoint was found; Home remains the standalone console unless the user deliberately chooses another documented world.

Links are backed by source documentation; uptime and physical headset behavior were not independently established. Public page retrieval was unavailable in the research tool for the three added URLs. This limitation does not turn a documented destination into a live-availability claim.

## Future shared-host portals — design only

A true in-session portal would require one trusted application to own the XRSession, renderer, asset budget and scene loader. A future `SharedSceneHost` contract must supply: an allowlisted scene ID and version, an explicit load/cancel API with AbortSignal, an approved shared coordinate convention, an input handoff/reset boundary, a bounded resource budget, a rollback scene and a disposal receipt. User state stays with its owner; no implicit save transfer.

This contract is **not implemented**. Current Realm Atlas actions are separate-website handoffs. A host saves its own progress if appropriate, confirms the transition, ends XR successfully, disconnects wrist context and then navigates to the reviewed HTTPS URL.
