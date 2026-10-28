# Host adapter API (experimental v0.1)

Use the shared core and bridge via pinned-version ES imports. The host can register status/actions without giving the wrist unrestricted access to its game state.

    import {createWrist} from './src/core.js';
    import {createHostAdapter} from './src/bridge.js';

    const wrist=createWrist({storage:window.localStorage});
    const host=createHostAdapter({
      id:'btm',
      capabilities:['scan'],
      readStatus:()=>({health:86,armor:42,energy:73,ori:'ONLINE'}),
      requestAction:(action,payload)=>action==='scan'
    });
    wrist.setHost(host);

Supported API: snapshot, subscribe, setRing, setMode, setTheme, setReducedMotion, openApp, closeApp, registerApp, registerWorld, setHost, readHostStatus, requestHostAction, toggleFavorite, getWorld, planLaunch, markVisited, reset.

Registering a world requires id, title and an optional HTTPS URL. A null URL is intentionally unavailable. planLaunch returns a structured description; the host decides whether to request confirmation and navigate. It never silently leaves the current world.

registerApp accepts display metadata only. Untrusted downloaded JavaScript is not supported; a future signed/permissioned plugin API is out of scope.

This first standalone demo uses mock BTM status. Real BTM integration must be done in a separate host-specific PR after validating control, calibration and XR resource boundaries.
