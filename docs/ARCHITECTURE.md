# GEN.E.WRIST architecture v0.1

- **Catalog** (src/catalog.js): canonical historical 3–6–9 panels.
- **Core** (src/core.js): mode, theme, app selection, host state, world directory, user favorites and navigation planning. No browser APIs required.
- **Storage** (src/storage.js): allowlisted, versioned, local preference format; corrupt/blocked storage is nonfatal.
- **Bridge** (src/bridge.js): host-owned readStatus and explicitly capability-granted requestAction. No hidden hooks into game memory.
- **Worlds** (src/worlds.js): strictly HTTPS validated destinations; unknown destinations are disabled.
- **Presentation** (src/main.js, public/): standalone accessible application.
- **XR experiment** (src/xr.js): minimal stereo renderer, not BTM's production equipment runtime.

## Authority boundaries
The host game retains collision, combat, checkpointing, save files, audio, XR session lifecycle and safety. GEN.E.WRIST supplies a portable interface and optional app metadata. Other games are not automatically modified by this repository.

## World handoff
A verified destination requires explicit user confirmation, and a native XR host should end its immersive session and save its own progress before navigating. Cross-origin localStorage is not shared. Seamless in-session scene transitions require a future single XR host loading compatible scenes, not hyperlinks pretending to be teleporters.

## Security and privacy
No telemetry, login, network API, remote scripts, automatic sensor reads, arbitrary app installation or permissions without the user's request. Future plugins, Bluetooth/physical devices and multiplayer need independent threat models. Only locally bundled modules are executable.

## Expansion roadmap
BTM adapter first, followed by PhiOS XR/Infinite Porch, then Domistika XR, Spark, LENZ, Commons and other worlds. Aether Engine/Optic Eyes/Threads are documented extension points, not implemented hardware.
