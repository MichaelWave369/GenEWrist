# GEN.E.WRIST
**The Builder's Companion | Enter the Field / Φ369 Labs**

An MIT-licensed, dependency-free, local-first foundation for a universal wrist interface across XR/VR worlds. This first milestone includes a responsive interactive demo, the canonical 3–6–9 application architecture, a portable host adapter API, safe world directory, and an experimental WebXR display.

## Run locally
Node.js 20 or later required.

    npm run dev

Open http://localhost:4173. Try Glance/Field, the three rings, Loom Market, SIGL drawing, DriftRocks, a simulated BTM status panel, and the world directory.

    npm run check
    npm test
    npm run build

The dist/ folder is deployable to any static HTTPS host, including GitHub Pages.

## Boundaries
- GEN.E.WRIST owns the shared interface; each game owns its own adapter.
- Ring layout: 3 identity, 6 tool, 9 play/decompression panels.
- Local-only app registry. No remote arbitrary-code downloads.
- No telemetry, account, external services, actual sensors, hardware pairing or medical claims.
- BTM has a confirmed HTTPS destination. Other worlds have clearly marked placeholder entries until URLs are verified.
- Changing websites is a navigation handoff, not seamless WebXR world teleportation.
- Physical Quest 3 testing, controller inputs and host game integrations remain pending.

Read docs/ORIGINS.md, docs/ARCHITECTURE.md, docs/ADAPTER_API.md and docs/QUEST_ACCEPTANCE.md.

MIT licensed. Original implementation and visuals, with no copied third-party game assets.
