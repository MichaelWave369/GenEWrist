# Gen.E.Wrist integration API / SDK 0.3.0

**Universal Mode is who you are. World Mode is what you’re doing.**

The versioned `WorldAdapter` API is **1**. TypeScript declarations: `src/world-adapter.d.ts`. Runtime validation is authoritative; TypeScript does not grant trust. All factories and shared state remain framework-independent JavaScript modules.

## Trusted registration, explicit grants

```js
import { createWrist } from './genewrist/src/core.js';
import { createWorldAdapter } from './genewrist/src/world-adapter.js';

const wrist = createWrist({ storage: window.localStorage });
const adapter = createWorldAdapter({
  manifest: {
    apiVersion: 1, id: 'my-studio', title: 'My Studio',
    initialContext: 'paint', theme: { accent: '#8ecbff' }, icon: 'brush',
    capabilities: ['undo'],
    actions: [{ id: 'undo-stroke', label: 'Undo stroke', capability: 'undo' }],
    contexts: [{
      id: 'paint', title: 'Painting', layout: 'studio',
      fields: [{ id: 'brush', label: 'Brush', type: 'text' }],
      controls: [{ action: 'undo-stroke', label: 'UNDO STROKE', icon: 'layers' }],
      views: [{ type: 'note', title: 'Canvas', items: ['Your host owns this scene.'] }]
    }]
  },
  readState: () => ({ contextId: 'paint', status: { brush: studio.brushName } }),
  subscribe: notify => studio.subscribe(snapshot => notify({
    contextId: snapshot.contextId,
    status: { brush: snapshot.brushName }
  })),
  actions: { 'undo-stroke': ({ signal }) => studio.undo({ signal }) },
  onCapture: captured => studio.setUIInputCapture(captured),
  onDisconnect: () => studio.clearWristHighlight()
});
wrist.connectWorld(adapter); // no grants by default
wrist.navigate('world');
// Only after a deliberate user permission choice:
wrist.setWorldGrants(['undo']);
await wrist.requestWorldAction('undo-stroke');
// On application change, world unload or XR end:
wrist.disconnectWorld();
```

`subscribe` must return an unsubscribe function. Without a subscription, use explicit `wrist.updateWorld({contextId,status})` when something changes. There is no polling. Context changes replace the visible field/control allowlist immediately. Missing readings display “—”; no generated live data.

## Manifest contract

| Property | Accepted form / limit |
| --- | --- |
| `apiVersion` | Exactly `1`; unsupported versions rejected |
| `id`, context/action/capability IDs | 1–64 lowercase letters/digits/hyphens; unique within their lists |
| `kind` | `host` by default; `demo` visibly labels simulated data |
| `title`, labels | Plain text, bounded lengths, escaped by presentations |
| `theme.accent` | Six-digit hexadecimal color; invalid values use a safe default |
| `icon` | Bundled crosshair, brush, compass, cube, home, layers, spark, map or inventory glyph |
| `contexts` | 1–12; each has identity, title, layout, fields, controls and optional views |
| `layout` | `combat`, `studio`, `explorer`, `inventory`, `dashboard` |
| `fields` | Up to 12; `meter`, `number`, `text`; bounded finite numeric ranges or 160-character text |
| `controls` | Up to 16 per context; reference a documented action |
| `actions` / `capabilities` | Up to 32 / 24; every action requires a declared capability |
| `views` | Up to 6 reviewed `note`, `steps`, `palette`, `grid` components; no HTML/JS/iframes |

The wrist validates and deeply freezes a detached manifest. Host data is filtered to the current context’s field allowlist. Action handlers receive an AbortSignal, **not** arbitrary payloads, private save objects or automatic return-data storage. No action is enabled without a separate wrist-side capability grant. An action must also be present in the current context and have a bundled callback.

## Lifecycle and navigation

`connectWorld(adapter, {grants: []})` replaces any previous host and clears its subscription and grants. `setWorldGrants` revokes or replaces the live grant set. `disconnectWorld` aborts in-flight requests, unsubscribes, releases input capture and discards state. Late callbacks are ignored; invalid subscribed updates disconnect to Universal Mode. Cleanup exceptions cannot suppress Home or trap navigation.

A trusted callback can already run code in its own host. This contract is an explicit interface boundary, **not a JavaScript sandbox**. Never load untrusted remote plugins. Hosts must cooperate with AbortSignal cancellation; revoking a grant cannot undo an already performed host action.

The core owns `home`, `back`, `navigate('universal'|'world'|'atlas'|'home')`. Host manifests cannot supply, remove or replace these controls. `setInputCaptured` signals UI capture; a gameplay host must apply its existing suppression and neutral-trigger re-arm rules.

## Reusable presentations

- `mountWorldPanel({root,wrist,onNotice})` in `src/presentation.js`: scoped desktop/mobile World screen, persistent navigation, permission controls and explicit disposal. This embedded component displays host screens; it does not claim to embed all standalone creative editors.
- `createXRSurface({wrist,...callbacks})` in `src/xr-surface.js`: returns `canvas`, current `targets`, `render`, `setHover`, `reset`, `destroy`. Upload only when dirty. A host uses its existing renderer, ray intersection and XR session. Do not call the standalone session launcher inside a running game session.
- `launchExperimentalXR` in `src/xr.js`: optional **standalone** session/geometry/lifecycle adapter. It is not automatically installed in BTM.
- `views.js`: reviewed plain-data presentation helpers used by the standalone console and embedded World component.

## BTM compatibility

Legacy `createHostAdapter`, `mockBTMAdapter` and `makeBTMAdapter({readSnapshot,requestScan})` exports remain available. The legacy scan example is not evidence that current BTM has a scan command. New code should use `makeBTMWorldAdapter`.

The production WorldAdapter example maps actual BTM health, armor, energy, equipped weapon, objective, six weapon slots, Ori and tactical map controls. It exposes only callbacks supplied by the host, checks the supplied unlocked weapon count before equipping, and never invokes a nonexistent scan. See `examples/btm-world.js` and `docs/INTEGRATION_PATTERNS.md`.

BTM PR #5’s v0.2 offline snapshots remain independent and untouched. Canonical module IDs, counts, ring assignment and public catalog/world helper exports are preserved. Updating BTM’s pin requires its own PR, input regression suite and physical acceptance.

## Distribution and ownership

Run `npm run build:sdk` for a private `genewrist-0.3.0.tgz` with an explicit version, API number and SHA-256 manifest for each source file. Review the archive/digest and pin the package or exact merged Git commit in the consuming project. No npm package is published. Do not keep editing divergent copied files in hosts; update reviewed, versioned dependencies together.

Gen.E.Wrist owns shared behavior. Hosts own state, permissions, rendering lifecycle, save systems and application-specific command validation.
