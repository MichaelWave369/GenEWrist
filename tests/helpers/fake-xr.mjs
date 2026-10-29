/** Deterministic software fixture only; never presented as a physical headset. */
export class TrackedTarget extends EventTarget {
  constructor() {
    super();
    this.listeners = new Map();
  }
  addEventListener(name, fn, ...args) {
    super.addEventListener(name, fn, ...args);
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
  }
  removeEventListener(name, fn, ...args) {
    super.removeEventListener(name, fn, ...args);
    this.listeners.get(name)?.delete(fn);
  }
  listenerCount() {
    return [...this.listeners.values()].reduce((n, set) => n + set.size, 0);
  }
}
export function installFakeXR({ failTexture = false, failSpace = false } = {}) {
  let id = 0;
  const deleted = { programs: 0, buffers: 0, textures: 0, shaders: 0 },
    draws = [];
  const gl = {};
  for (const [i, key] of [
    "VERTEX_SHADER",
    "FRAGMENT_SHADER",
    "COMPILE_STATUS",
    "LINK_STATUS",
    "ARRAY_BUFFER",
    "STATIC_DRAW",
    "DYNAMIC_DRAW",
    "TEXTURE0",
    "TEXTURE_2D",
    "TEXTURE_MIN_FILTER",
    "TEXTURE_MAG_FILTER",
    "TEXTURE_WRAP_S",
    "TEXTURE_WRAP_T",
    "LINEAR",
    "CLAMP_TO_EDGE",
    "UNPACK_FLIP_Y_WEBGL",
    "RGBA",
    "UNSIGNED_BYTE",
    "FLOAT",
    "FRAMEBUFFER",
    "SCISSOR_TEST",
    "DEPTH_TEST",
    "LEQUAL",
    "COLOR_BUFFER_BIT",
    "DEPTH_BUFFER_BIT",
    "TRIANGLES",
    "LINES",
    "TRIANGLE_STRIP",
  ].entries())
    gl[key] = i + 1;
  for (const method of [
    "shaderSource",
    "compileShader",
    "attachShader",
    "linkProgram",
    "bindBuffer",
    "bufferData",
    "bufferSubData",
    "useProgram",
    "enableVertexAttribArray",
    "disableVertexAttribArray",
    "vertexAttribPointer",
    "activeTexture",
    "bindTexture",
    "texParameteri",
    "pixelStorei",
    "uniform1i",
    "texImage2D",
    "bindFramebuffer",
    "enable",
    "depthFunc",
    "viewport",
    "scissor",
    "clearColor",
    "clear",
    "uniformMatrix4fv",
    "disable",
  ])
    gl[method] = () => {};
  for (const method of ["createShader", "createProgram", "createBuffer"])
    gl[method] = () => ({ id: ++id });
  gl.createTexture = () => (failTexture ? null : { id: ++id });
  gl.getShaderParameter = gl.getProgramParameter = () => true;
  gl.getAttribLocation = (_p, name) => ["pos", "color", "uv"].indexOf(name);
  gl.getUniformLocation = () => ({});
  gl.makeXRCompatible = async () => {};
  for (const [method, key] of [
    ["deleteProgram", "programs"],
    ["deleteBuffer", "buffers"],
    ["deleteTexture", "textures"],
    ["deleteShader", "shaders"],
  ])
    gl[method] = () => deleted[key]++;
  gl.drawArrays = (...args) => draws.push(args);
  const context = {
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    fillText() {},
    beginPath() {},
    arc() {},
    stroke() {},
    drawImage() {},
    moveTo() {},
    lineTo() {},
    measureText: (value) => ({ width: String(value).length * 13 }),
  };
  const document = new TrackedTarget();
  document.createElement = () => {
    const canvas = new TrackedTarget();
    canvas.width = 0;
    canvas.height = 0;
    canvas.getContext = (type) => (type === "2d" ? context : gl);
    return canvas;
  };
  const space = new TrackedTarget();
  class Session extends TrackedTarget {
    constructor() {
      super();
      this.inputSources = [];
      this.renderState = {};
      this.visibilityState = "visible";
      this.frame = null;
      this.ended = false;
      this.cancelled = 0;
    }
    updateRenderState(state) {
      this.renderState = state;
    }
    async requestReferenceSpace() {
      if (failSpace) throw Error("No reference space");
      return space;
    }
    requestAnimationFrame(fn) {
      this.frame = fn;
      return ++id;
    }
    cancelAnimationFrame() {
      this.cancelled++;
      this.frame = null;
    }
    async end() {
      this.ended = true;
      this.dispatchEvent(new Event("end"));
    }
    pump(frame) {
      const fn = this.frame;
      this.frame = null;
      fn?.(0, frame);
    }
  }
  const session = new Session(),
    old = {};
  const replacements = {
    document,
    navigator: {
      xr: {
        isSessionSupported: async () => true,
        requestSession: async () => session,
      },
    },
    XRWebGLLayer: class {
      constructor() {
        this.framebuffer = null;
      }
      getViewport(view) {
        return {
          x: view.eye === "left" ? 0 : 512,
          y: 0,
          width: 512,
          height: 768,
        };
      }
    },
  };
  for (const [key, value] of Object.entries(replacements)) {
    old[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const matrix = (x = 0, y = 0, z = 0) =>
    Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  const views = ["left", "right"].map((eye) => ({
    eye,
    projectionMatrix: matrix(),
    transform: { inverse: { matrix: matrix() } },
  }));
  const frame = {
    getViewerPose: () => ({
      transform: {
        matrix: matrix(0, 1.6, 0),
        position: { x: 0, y: 1.6, z: 0 },
      },
      views,
    }),
    getPose: () => null,
  };
  return {
    session,
    space,
    gl,
    deleted,
    draws,
    document,
    frame,
    matrix,
    restore() {
      for (const key of Object.keys(replacements)) {
        if (old[key]) Object.defineProperty(globalThis, key, old[key]);
        else delete globalThis[key];
      }
    },
  };
}
