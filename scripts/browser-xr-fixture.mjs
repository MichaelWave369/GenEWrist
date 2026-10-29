/** Injected by CI only. Synthetic poses + real browser WebGL, never hardware proof. */
export function installBrowserXRFixture() {
  const matrix = (x = 0, y = 0, z = 0) =>
    new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  const source = {
      handedness: "right",
      targetRaySpace: {},
      gamepad: { buttons: [{ pressed: false }] },
    },
    space = new EventTarget();
  let ray = matrix(0, 1.6, 0),
    session;
  const state = {
    frames: 0,
    uploads: 0,
    draws: 0,
    deleted: { buffers: 0, textures: 0, programs: 0 },
    session: null,
  };
  const projection = () =>
    new Float32Array([
      1.875, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, -1.004, -1, 0, 0, -0.1002, 0,
    ]);
  const frame = {
    getViewerPose: () => ({
      transform: {
        matrix: matrix(0, 1.6, 0),
        position: { x: 0, y: 1.6, z: 0 },
      },
      views: ["left", "right"].map((eye) => ({
        eye,
        projectionMatrix: projection(),
        transform: {
          inverse: { matrix: matrix(eye === "left" ? 0.032 : -0.032, -1.6, 0) },
        },
      })),
    }),
    getPose: (target) =>
      target === source.targetRaySpace ? { transform: { matrix: ray } } : null,
  };
  class SoftwareSession extends EventTarget {
    constructor() {
      super();
      this.inputSources = [source];
      this.visibilityState = "visible";
      this.renderState = {};
      this.ended = false;
      this.pending = new Set();
    }
    updateRenderState(next) {
      this.renderState = next;
    }
    async requestReferenceSpace() {
      return space;
    }
    requestAnimationFrame(fn) {
      const id = requestAnimationFrame((time) => {
        this.pending.delete(id);
        if (!this.ended) {
          state.frames++;
          fn(time, frame);
        }
      });
      this.pending.add(id);
      return id;
    }
    cancelAnimationFrame(id) {
      cancelAnimationFrame(id);
      this.pending.delete(id);
    }
    async end() {
      if (this.ended) return;
      this.ended = true;
      for (const id of this.pending) cancelAnimationFrame(id);
      this.pending.clear();
      this.dispatchEvent(new Event("end"));
      document.querySelector("#software-xr-overlay")?.remove();
    }
  }
  Object.defineProperty(navigator, "xr", {
    configurable: true,
    value: {
      isSessionSupported: async () => true,
      requestSession: async () => {
        session = new SoftwareSession();
        state.session = session;
        return session;
      },
    },
  });
  window.XRWebGLLayer = class {
    constructor(_session, gl) {
      this.framebuffer = null;
      gl.canvas.width = 1440;
      gl.canvas.height = 900;
      const overlay = document.createElement("div");
      overlay.id = "software-xr-overlay";
      overlay.style =
        "position:fixed;inset:0;z-index:1000;background:#06111c;display:grid;place-items:center";
      const label = document.createElement("p");
      label.textContent =
        "SYNTHETIC STEREO / SOFTWARE VERIFICATION — NOT QUEST HARDWARE";
      label.style =
        "position:absolute;top:0;color:#e9b874;font:12px monospace;background:#071521;padding:10px;z-index:1";
      overlay.append(label, gl.canvas);
      gl.canvas.style = "width:100%;height:100%;object-fit:contain";
      document.body.append(overlay);
      const upload = gl.texImage2D.bind(gl);
      gl.texImage2D = (...args) => {
        state.uploads++;
        return upload(...args);
      };
      const draw = gl.drawArrays.bind(gl);
      gl.drawArrays = (...args) => {
        state.draws++;
        return draw(...args);
      };
      for (const [fn, key] of [
        ["deleteBuffer", "buffers"],
        ["deleteTexture", "textures"],
        ["deleteProgram", "programs"],
      ]) {
        const original = gl[fn].bind(gl);
        gl[fn] = (value) => {
          state.deleted[key]++;
          return original(value);
        };
      }
    }
    getViewport(view) {
      return {
        x: view.eye === "left" ? 0 : 720,
        y: 0,
        width: 720,
        height: 900,
      };
    }
  };
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const value = original.call(this, type, ...args);
    if (type === "webgl" && value) value.makeXRCompatible = async () => {};
    return value;
  };
  state.select = (x, y, mode = "field") => {
    const w = mode === "glance" ? 0.3 : 0.72,
      h = mode === "glance" ? 0.225 : 0.54;
    const dx = -0.1 + (x / 1024 - 0.5) * w,
      dy = -0.13 + (0.5 - y / 768) * h,
      dz = -1.15,
      d = Math.hypot(dx, dy, dz);
    ray = matrix(0, 1.6, 0);
    ray[8] = -dx / d;
    ray[9] = -dy / d;
    ray[10] = -dz / d;
    for (const type of ["selectstart", "select", "selectend"]) {
      source.gamepad.buttons[0].pressed = type !== "selectend";
      const event = new Event(type);
      Object.defineProperties(event, {
        inputSource: { value: source },
        frame: { value: frame },
      });
      session.dispatchEvent(event);
    }
  };
  window.__softwareXR = state;
}
