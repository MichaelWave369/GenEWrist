/** Gen.E.Wrist WorldAdapter API 1 / SDK 0.3.0. */
export type WorldLayout =
  | "combat"
  | "studio"
  | "explorer"
  | "inventory"
  | "dashboard";
export type WorldIcon =
  | "crosshair"
  | "brush"
  | "compass"
  | "cube"
  | "home"
  | "layers"
  | "spark"
  | "map"
  | "inventory";
export interface WorldField {
  id: string;
  label: string;
  type: "meter" | "text" | "number";
  min?: number;
  max?: number;
  unit?: string;
}
export interface WorldAction {
  id: string;
  label: string;
  capability: string;
}
export interface WorldControl {
  action: string;
  label: string;
  icon?: WorldIcon;
}
export interface WorldView {
  type: "note" | "steps" | "palette" | "grid";
  title: string;
  items: string[];
}
export interface WorldContext {
  id: string;
  title: string;
  layout: WorldLayout;
  description?: string;
  icon?: WorldIcon;
  fields?: WorldField[];
  controls?: WorldControl[];
  views?: WorldView[];
}
export interface WorldManifest {
  apiVersion: 1;
  id: string;
  title: string;
  kind?: "host" | "demo";
  description?: string;
  icon?: WorldIcon;
  theme?: { accent?: string };
  capabilities?: string[];
  actions?: WorldAction[];
  initialContext: string;
  contexts: WorldContext[];
}
export interface WorldState {
  contextId?: string;
  status?: Record<string, string | number>;
}
export interface WorldAdapter {
  readonly manifest: Readonly<WorldManifest>;
  readState(): Readonly<WorldState>;
  subscribe(
    listener: (state: Readonly<WorldState> | null, error?: Error) => void,
  ): () => void;
  hasAction(action: string): boolean;
  execute(
    action: string,
    options?: { signal?: AbortSignal },
  ): unknown | Promise<unknown>;
  capture(value: boolean): void;
  disconnect(): void;
}
export interface WorldAdapterOptions {
  manifest: WorldManifest;
  readState?: () => WorldState;
  subscribe?: ((listener: (state: WorldState) => void) => () => void) | null;
  actions?: Record<
    string,
    (options: { signal?: AbortSignal }) => unknown | Promise<unknown>
  >;
  onCapture?: (captured: boolean) => void;
  onDisconnect?: () => void;
}
export interface WorldConnection {
  snapshot():
    | (WorldState & {
        manifest: Readonly<WorldManifest>;
        grants: string[];
        captured: boolean;
      })
    | null;
  update(state: WorldState): boolean;
  setGrants(grants: string[]): void;
  capture(value: boolean): boolean;
  request(action: string): Promise<boolean>;
  dispose(): void;
}
export const WORLD_ADAPTER_VERSION: 1;
export function createWorldAdapter(options: WorldAdapterOptions): WorldAdapter;
export function validateWorldManifest(
  manifest: WorldManifest,
): Readonly<WorldManifest>;
export function connectWorld(
  adapter: WorldAdapter,
  options?: {
    grants?: string[];
    onUpdate?: (state: ReturnType<WorldConnection["snapshot"]>) => void;
    onFault?: (error: Error) => void;
  },
): WorldConnection;
