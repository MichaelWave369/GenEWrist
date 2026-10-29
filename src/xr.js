/** Experimental standalone WebXR adapter. Host games keep their own XR lifecycle.
 * All geometry is original/procedural; no remote assets or per-frame texture uploads.
 */
import { createWrist } from "./core.js";
import { createXRSurface } from "./xr-surface.js";
import {
  createInputGuard,
  rayPanelHit,
  targetAt,
  positionDock,
} from "./xr-interaction.js";
const IDENTITY = () =>
  Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const solidVertex =
  "attribute vec3 pos;attribute vec3 color;uniform mat4 projection,view,model;varying vec3 tint;void main(){tint=color;gl_Position=projection*view*model*vec4(pos,1.0);}";
const solidFragment =
  "precision mediump float;varying vec3 tint;void main(){gl_FragColor=vec4(tint,1.0);}";
const panelVertex =
  "attribute vec2 pos;attribute vec2 uv;uniform mat4 projection,view,model;varying vec2 tex;void main(){tex=uv;gl_Position=projection*view*model*vec4(pos,0.0,1.0);}";
const panelFragment =
  "precision mediump float;varying vec2 tex;uniform sampler2D panel;void main(){gl_FragColor=texture2D(panel,tex);}";
function makeProgram(gl, vertex, fragment, resources) {
  const shaders = [];
  let program;
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ]) {
      const shader = gl.createShader(type);
      if (!shader) throw Error("Shader allocation failed");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
    }
    program = gl.createProgram();
    if (!program) throw Error("Program allocation failed");
    for (const shader of shaders) gl.attachShader(program, shader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program) || "Program link failed");
    resources.programs.push(program);
    return program;
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    for (const shader of shaders) gl.deleteShader(shader);
  }
}
function geometry() {
  const out = [];
  const vertex = (p, c) => out.push(...p, ...c);
  const tri = (a, b, c, color) => {
    vertex(a, color);
    vertex(b, color);
    vertex(c, color);
  };
  const box = (x, y, z, w, h, d, color) => {
    const v = [
      [x - w / 2, y - h / 2, z - d / 2],
      [x + w / 2, y - h / 2, z - d / 2],
      [x + w / 2, y + h / 2, z - d / 2],
      [x - w / 2, y + h / 2, z - d / 2],
      [x - w / 2, y - h / 2, z + d / 2],
      [x + w / 2, y - h / 2, z + d / 2],
      [x + w / 2, y + h / 2, z + d / 2],
      [x - w / 2, y + h / 2, z + d / 2],
    ];
    for (const [indices, shade] of [
      [[4, 5, 6, 7], 1],
      [[1, 0, 3, 2], 0.5],
      [[0, 4, 7, 3], 0.65],
      [[5, 1, 2, 6], 0.8],
      [[3, 7, 6, 2], 1.15],
      [[0, 1, 5, 4], 0.45],
    ]) {
      const c = color.map((n) => Math.min(1, n * shade));
      tri(v[indices[0]], v[indices[1]], v[indices[2]], c);
      tri(v[indices[0]], v[indices[2]], v[indices[3]], c);
    }
  };
  const ring = (outer, inner, z, depth, color, segments = 64) => {
    for (let i = 0; i < segments; i++) {
      const a = (i * Math.PI * 2) / segments,
        b = ((i + 1) * Math.PI * 2) / segments,
        p = (r) => [Math.cos(a) * r, Math.sin(a) * r, z],
        q = (r) => [Math.cos(b) * r, Math.sin(b) * r, z];
      tri(p(outer), q(outer), p(inner), color);
      tri(q(outer), q(inner), p(inner), color);
      const backA = [Math.cos(a) * outer, Math.sin(a) * outer, z - depth],
        backB = [Math.cos(b) * outer, Math.sin(b) * outer, z - depth],
        shade = color.map((n) => n * (0.5 + 0.15 * Math.cos(a)));
      tri(p(outer), backA, backB, shade);
      tri(p(outer), backB, q(outer), shade);
    }
  };
  return { out, vertex, tri, box, ring };
}
function wearableGeometry() {
  const g = geometry();
  g.box(0, 0, -0.014, 0.11, 0.43, 0.018, [0.055, 0.09, 0.115]);
  for (let i = -12; i <= 12; i++)
    g.box(0, i * 0.016, -0.001, 0.106, 0.003, 0.006, [0.17, 0.22, 0.24]);
  g.ring(0.131, 0, 0.017, 0.036, [0.22, 0.27, 0.29]);
  g.ring(0.128, 0.112, 0.027, 0.012, [0.65, 0.49, 0.31]);
  g.ring(0.117, 0.108, 0.032, 0.008, [0.16, 0.24, 0.27]);
  g.ring(0.107, 0, 0.031, 0.004, [0.025, 0.075, 0.1]);
  g.ring(0.102, 0.101, 0.034, 0.001, [0.29, 0.66, 0.7]);
  g.ring(0.083, 0.082, 0.035, 0.001, [0.17, 0.3, 0.35]);
  g.ring(0.061, 0.06, 0.035, 0.001, [0.19, 0.34, 0.38]);
  g.ring(0.04, 0.038, 0.036, 0.001, [0.65, 0.49, 0.31]);
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24,
      r = 0.119;
    g.box(
      Math.cos(a) * r,
      Math.sin(a) * r,
      0.036,
      0.002,
      0.005,
      0.001,
      i % 4 ? [0.42, 0.44, 0.39] : [0.81, 0.65, 0.42],
    );
  }
  g.box(0.14, 0, 0.009, 0.022, 0.05, 0.027, [0.5, 0.4, 0.28]);
  g.box(-0.019, -0.095, 0.038, 0.009, 0.002, 0.002, [0.3, 0.9, 0.94]);
  g.box(0, -0.095, 0.038, 0.009, 0.002, 0.002, [0.3, 0.7, 0.74]);
  g.box(0.019, -0.095, 0.038, 0.009, 0.002, 0.002, [0.3, 0.5, 0.54]);
  return new Float32Array(g.out);
}
function environmentGeometry() {
  const triangles = geometry(),
    lines = geometry();
  const line = (a, b, color) => {
    lines.vertex(a, color);
    lines.vertex(b, color);
  };
  for (let i = -16; i <= 16; i++) {
    line([i, 0, -18], [i, 0, 9], [0.045, 0.13, 0.19]);
    line([-16, 0, i], [16, 0, i], [0.045, 0.13, 0.19]);
  }
  const sunX = 0,
    sunY = 3.1,
    sunZ = -12;
  for (let i = 0; i < 64; i++) {
    const a = (i * Math.PI) / 32,
      b = ((i + 1) * Math.PI) / 32;
    triangles.tri(
      [sunX, sunY, sunZ],
      [sunX + Math.cos(a) * 1.6, sunY + Math.sin(a) * 1.6, sunZ],
      [sunX + Math.cos(b) * 1.6, sunY + Math.sin(b) * 1.6, sunZ],
      [0.23, 0.135, 0.12],
    );
  }
  for (let i = 0; i < 8; i++) {
    const y = 2 + i * 0.23;
    line([-1.65, y, -11.98], [1.65, y, -11.98], [0.08, 0.1, 0.16]);
  }
  for (let i = -8; i < 8; i++) {
    const x = i * 2;
    triangles.tri(
      [x, 0, -10],
      [x + 1, 1.2 + (i % 3) * 0.3, -10],
      [x + 3, 0, -10],
      [0.035, 0.065, 0.095],
    );
  }
  for (let i = 0; i < 90; i++) {
    const x = (((i * 83) % 197) / 197) * 24 - 12,
      y = 2 + (((i * 37) % 101) / 101) * 9,
      z = -10 - (((i * 19) % 43) / 43) * 5;
    line([x, y, z], [x + 0.025, y, z], [0.3, 0.43, 0.5]);
  }
  return {
    triangles: new Float32Array(triangles.out),
    lines: new Float32Array(lines.out),
  };
}
export async function launchExperimentalXR({
  wrist = createWrist(),
  onEnd = () => {},
  onNotice = () => {},
  onTravel = null,
  onDemo = () => {},
  readApp = () => ({}),
  onAppAction = () => {},
} = {}) {
  if (!navigator.xr || typeof navigator.xr.requestSession !== "function")
    throw Error("WebXR not exposed by this browser");
  if (!(await navigator.xr.isSessionSupported?.("immersive-vr")))
    throw Error("Immersive VR not supported");
  const session = await navigator.xr.requestSession("immersive-vr", {
    optionalFeatures: ["local-floor", "hand-tracking"],
  });
  const resources = { programs: [], buffers: [], textures: [] },
    guard = createInputGuard(),
    metrics = { frames: 0, eyeDraws: 0, textureUploads: 0, attachedFrames: 0 };
  let gl = null,
    space = null,
    closed = false,
    dirty = true,
    revision = 0,
    frameId = null,
    hover = null,
    dock = null,
    lastCapture = null,
    stop = () => {},
    floorSpace = true,
    latestState = wrist.snapshot();
  const panelModel = IDENTITY(),
    deviceModel = IDENTITY(),
    environmentModel = IDENTITY(),
    identity = IDENTITY(),
    rayData = new Float32Array(12);
  const canvas = document.createElement("canvas");
  let surface;
  const listeners = [];
  const listen = (target, name, fn) => {
    target.addEventListener(name, fn);
    listeners.push(() => target.removeEventListener(name, fn));
  };
  const capture = (value) => {
    if (lastCapture === value) return;
    lastCapture = value;
    wrist.setInputCaptured(value);
  };
  const finish = () => {
    if (closed) return;
    closed = true;
    if (frameId !== null) session.cancelAnimationFrame?.(frameId);
    for (const remove of listeners.splice(0)) {
      try {
        remove();
      } catch {}
    }
    stop();
    guard.clear();
    capture(false);
    wrist.disconnectWorld();
    if (gl) {
      for (const t of resources.textures) gl.deleteTexture(t);
      for (const b of resources.buffers) gl.deleteBuffer(b);
      for (const p of resources.programs) gl.deleteProgram(p);
    }
    resources.textures.length =
      resources.buffers.length =
      resources.programs.length =
        0;
    surface?.destroy();
    canvas.width = canvas.height = 1;
    try {
      onEnd();
    } catch {}
  };
  const end = async () => {
    if (closed) return;
    await session.end();
    finish();
  };
  const recenter = () => {
    dock = null;
    guard.reset();
    dirty = true;
    revision++;
    onNotice("XR dock recentered. Release the trigger before selecting.");
  };
  listen(session, "end", finish);
  try {
    gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      xrCompatible: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw Error("WebGL unavailable");
    if (gl.makeXRCompatible) await gl.makeXRCompatible();
    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
    try {
      space = await session.requestReferenceSpace("local-floor");
    } catch {
      floorSpace = false;
      space = await session.requestReferenceSpace("local");
    }
    surface = createXRSurface({
      wrist,
      onExit: end,
      onRecenter: recenter,
      onTravel: async (id) => {
        if (!onTravel) {
          onNotice("This renderer requires a host travel callback.");
          return;
        }
        await end();
        await onTravel(id);
      },
      onNotice,
      onDemo,
      readApp,
      onAppAction,
    });
    const solid = makeProgram(gl, solidVertex, solidFragment, resources),
      panel = makeProgram(gl, panelVertex, panelFragment, resources);
    const makeBuffer = (data, usage = gl.STATIC_DRAW) => {
      const value = gl.createBuffer();
      if (!value) throw Error("Buffer allocation failed");
      resources.buffers.push(value);
      gl.bindBuffer(gl.ARRAY_BUFFER, value);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      return { buffer: value, count: data.length / 6 };
    };
    const device = makeBuffer(wearableGeometry()),
      env = environmentGeometry(),
      envTriangles = makeBuffer(env.triangles),
      envLines = makeBuffer(env.lines),
      rayBuffer = makeBuffer(rayData, gl.DYNAMIC_DRAW);
    const quad = makeBuffer(
      new Float32Array([
        -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, -0.5, 0.5, 0, 1, 0.5, 0.5, 1, 1,
      ]),
    );
    const texture = gl.createTexture();
    if (!texture) throw Error("Texture allocation failed");
    resources.textures.push(texture);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const [name, value] of [
      [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
      [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    ])
      gl.texParameteri(gl.TEXTURE_2D, name, value);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const attrs = {
      solid: {
        pos: gl.getAttribLocation(solid, "pos"),
        color: gl.getAttribLocation(solid, "color"),
      },
      panel: {
        pos: gl.getAttribLocation(panel, "pos"),
        uv: gl.getAttribLocation(panel, "uv"),
      },
    };
    const uniforms = (program) => ({
      projection: gl.getUniformLocation(program, "projection"),
      view: gl.getUniformLocation(program, "view"),
      model: gl.getUniformLocation(program, "model"),
    });
    const su = uniforms(solid),
      pu = uniforms(panel);
    gl.useProgram(panel);
    gl.uniform1i(gl.getUniformLocation(panel, "panel"), 0);
    const disableAttributes = () => {
      for (const n of new Set([
        attrs.solid.pos,
        attrs.solid.color,
        attrs.panel.pos,
        attrs.panel.uv,
      ]))
        if (n >= 0) gl.disableVertexAttribArray(n);
    };
    const mesh = (mesh, model, view, mode) => {
      gl.useProgram(solid);
      disableAttributes();
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.enableVertexAttribArray(attrs.solid.pos);
      gl.vertexAttribPointer(attrs.solid.pos, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(attrs.solid.color);
      gl.vertexAttribPointer(attrs.solid.color, 3, gl.FLOAT, false, 24, 12);
      gl.uniformMatrix4fv(su.projection, false, view.projectionMatrix);
      gl.uniformMatrix4fv(su.view, false, view.transform.inverse.matrix);
      gl.uniformMatrix4fv(su.model, false, model);
      gl.drawArrays(mode, 0, mesh.count);
    };
    const pointerSource = (source) =>
      source.handedness === latestState.preferences.handedness ||
      source.handedness === "none";
    const targetFor = (event) => {
      if (
        !pointerSource(event.inputSource) ||
        !event.frame ||
        !space ||
        session.visibilityState === "hidden"
      )
        return null;
      const ray = event.frame.getPose(event.inputSource.targetRaySpace, space);
      return ray
        ? targetAt(
            surface.targets,
            rayPanelHit(panelModel, ray.transform.matrix),
          )
        : null;
    };
    const execute = (target) => {
      if (!target) return;
      Promise.resolve()
        .then(() => target.action())
        .catch((error) => onNotice("XR action unavailable: " + error.message));
      dirty = true;
      revision++;
    };
    listen(session, "selectstart", (event) => {
      const target = targetFor(event);
      guard.observe(
        event.inputSource,
        event.inputSource.gamepad?.buttons?.[0]?.pressed,
      );
      guard.start(event.inputSource, target, revision);
    });
    listen(session, "select", (event) => {
      const target = targetFor(event);
      if (guard.select(event.inputSource, target, revision)) execute(target);
    });
    listen(session, "selectend", (event) => guard.end(event.inputSource));
    listen(session, "squeeze", (event) => {
      if (pointerSource(event.inputSource)) {
        wrist.setMode(
          wrist.snapshot().preferences.mode === "glance" ? "field" : "glance",
        );
        guard.reset();
      }
    });
    listen(session, "visibilitychange", () => {
      guard.reset();
      hover = null;
      surface.setHover(null);
      capture(false);
      dirty = true;
      revision++;
    });
    listen(session, "inputsourceschange", (event) => {
      for (const source of event.removed || []) guard.remove(source);
      hover = null;
      dirty = true;
      revision++;
    });
    listen(space, "reset", recenter);
    listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      end().catch(() => finish());
    });
    let keyboardIndex = 0;
    listen(document, "keydown", (event) => {
      if (
        !["ArrowRight", "ArrowLeft", "Tab", "Enter", "Escape"].includes(
          event.key,
        )
      )
        return;
      event.preventDefault();
      if (event.key === "Escape") {
        surface.reset();
        wrist.setMode("glance");
        guard.reset();
        return;
      }
      if (event.key === "Enter") {
        execute(
          surface.targets[keyboardIndex % Math.max(1, surface.targets.length)],
        );
        return;
      }
      keyboardIndex =
        (keyboardIndex +
          (event.key === "ArrowLeft" ? -1 : 1) +
          surface.targets.length) %
        Math.max(1, surface.targets.length);
      hover = surface.targets[keyboardIndex]?.id;
      surface.setHover(hover);
      dirty = true;
    });
    stop = wrist.subscribe((state) => {
      latestState = state;
      dirty = true;
      revision++;
      guard.reset();
    });
    const render = (_time, frame) => {
      if (closed) return;
      const pose = frame.getViewerPose(space),
        p = latestState.preferences;
      metrics.frames++;
      if (pose && session.visibilityState !== "hidden") {
        if (!dock) {
          dock = {
            transform: {
              matrix: new Float32Array(pose.transform.matrix),
              position: {
                x: pose.transform.position.x,
                y: pose.transform.position.y,
                z: pose.transform.position.z,
              },
            },
          };
          environmentModel[12] = dock.transform.position.x;
          environmentModel[13] = floorSpace
            ? 0
            : dock.transform.position.y - 1.6;
          environmentModel[14] = dock.transform.position.z;
        }
        let hand = null,
          ray = null;
        for (const source of session.inputSources) {
          guard.observe(source, source.gamepad?.buttons?.[0]?.pressed ?? false);
          if (
            source.handedness !== p.handedness &&
            source.handedness !== "none"
          ) {
            const joint = source.hand?.get?.("wrist");
            if (joint && frame.getJointPose)
              hand = frame.getJointPose(joint, space);
            if (!hand && source.gripSpace)
              hand = frame.getPose(source.gripSpace, space);
          }
          if (pointerSource(source) && source.targetRaySpace) {
            const candidate = frame.getPose(source.targetRaySpace, space);
            if (candidate) ray = candidate.transform.matrix;
          }
        }
        const attached = positionDock(pose, hand, panelModel, deviceModel, p);
        if (!attached) positionDock(dock, null, panelModel, deviceModel, p);
        else metrics.attachedFrames++;
        const hit = ray ? rayPanelHit(panelModel, ray) : null,
          target = targetAt(surface.targets, hit),
          nextHover = target?.id || null;
        if (nextHover !== hover) {
          hover = nextHover;
          surface.setHover(hover);
          dirty = true;
        }
        capture(p.mode === "field" || Boolean(hit));
        if (dirty) {
          surface.render();
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            surface.canvas,
          );
          metrics.textureUploads++;
          dirty = false;
        }
        let rayVisible = false;
        if (ray) {
          const distance = hit?.distance || 2;
          rayData.set([
            ray[12],
            ray[13],
            ray[14],
            0.25,
            0.75,
            0.8,
            ray[12] - ray[8] * distance,
            ray[13] - ray[9] * distance,
            ray[14] - ray[10] * distance,
            0.9,
            0.72,
            0.45,
          ]);
          gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer.buffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, rayData);
          rayVisible = true;
        }
        gl.bindFramebuffer(
          gl.FRAMEBUFFER,
          session.renderState.baseLayer.framebuffer,
        );
        gl.enable(gl.SCISSOR_TEST);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        for (const view of pose.views) {
          const vp = session.renderState.baseLayer.getViewport(view);
          gl.viewport(vp.x, vp.y, vp.width, vp.height);
          gl.scissor(vp.x, vp.y, vp.width, vp.height);
          gl.clearColor(0.018, 0.035, 0.065, 1);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          if (p.environment) {
            mesh(envTriangles, environmentModel, view, gl.TRIANGLES);
            mesh(envLines, environmentModel, view, gl.LINES);
          }
          mesh(device, deviceModel, view, gl.TRIANGLES);
          gl.useProgram(panel);
          disableAttributes();
          gl.bindBuffer(gl.ARRAY_BUFFER, quad.buffer);
          gl.enableVertexAttribArray(attrs.panel.pos);
          gl.vertexAttribPointer(attrs.panel.pos, 2, gl.FLOAT, false, 16, 0);
          gl.enableVertexAttribArray(attrs.panel.uv);
          gl.vertexAttribPointer(attrs.panel.uv, 2, gl.FLOAT, false, 16, 8);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniformMatrix4fv(pu.projection, false, view.projectionMatrix);
          gl.uniformMatrix4fv(pu.view, false, view.transform.inverse.matrix);
          gl.uniformMatrix4fv(pu.model, false, panelModel);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (rayVisible) mesh(rayBuffer, identity, view, gl.LINES);
          metrics.eyeDraws++;
        }
        gl.disable(gl.SCISSOR_TEST);
      } else {
        guard.reset();
        capture(false);
      }
      if (!closed) frameId = session.requestAnimationFrame(render);
    };
    frameId = session.requestAnimationFrame(render);
    return Object.freeze({
      session,
      canvas,
      end,
      recenter,
      stats: () => ({
        ...metrics,
        disposed: closed,
        buffers: resources.buffers.length,
        textures: resources.textures.length,
        programs: resources.programs.length,
      }),
    });
  } catch (error) {
    try {
      await session.end();
    } catch {}
    finish();
    throw error;
  }
}
