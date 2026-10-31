import { createPhiSurf } from "./phisurf.js";

/**
 * Optional browser presentation. Pointer gestures and keyboard are local;
 * gamepad capture is opt-in to avoid stealing controls from a host game.
 */
export function mountPhiSurf({ wrist, root = document.body, onNotice = () => {} } = {}) {
  if (!root?.appendChild) throw TypeError("Mount root required");
  const doc = root.ownerDocument || document;
  const win = doc.defaultView || window;
  const surf = createPhiSurf({ wrist, onError: (error) => onNotice(error.message) });
  const style = doc.createElement("style");
  style.textContent = [
    ".phisurf-launch{position:fixed;z-index:94;right:20px;bottom:20px;border:1px solid #69e3df;border-radius:50px;background:#092633;color:#c4fff6;padding:14px 19px;font:700 14px system-ui;letter-spacing:.07em;box-shadow:0 8px 24px #0008;cursor:pointer}",
    ".phisurf-launch:focus-visible,.phisurf-panel button:focus-visible{outline:3px solid #ffdf97;outline-offset:3px}",
    ".phisurf-panel[hidden]{display:none}",
    ".phisurf-panel{position:fixed;z-index:95;inset:0;background:#031119d9;display:grid;place-items:center}",
    ".phisurf-orbit{width:min(92vw,440px);height:min(92vw,440px);max-height:72vh;position:relative;border:1px solid #2d6e78;border-radius:50%;box-shadow:inset 0 0 70px #0c3943,0 0 0 12px #16384133;background:radial-gradient(circle,#173a45 0%,#071923 65%,#071923 100%)}",
    ".phisurf-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid #4accbf;border-radius:50%;width:112px;height:112px;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#e4f8f6;font:800 13px system-ui;text-align:center;background:#06242f;pointer-events:none}",
    ".phisurf-center strong{font-size:30px;color:#74eedf}",
    ".phisurf-item{position:absolute;overflow:hidden;width:108px;min-height:48px;transform:translate(-50%,-50%);border:1px solid #539ba5;border-radius:12px;background:#103542;color:#e9f8f5;font:600 11px system-ui;line-height:1.25;cursor:pointer;padding:7px;word-break:normal;touch-action:none}",
    ".phisurf-item[disabled]{opacity:.38;cursor:not-allowed}",
    ".phisurf-item[aria-current=true],.phisurf-item:hover:not(:disabled){border-color:#ffe3a8;background:#286071;color:white}",
    ".phisurf-footer{position:absolute;bottom:8px;left:0;right:0;display:flex;justify-content:center;gap:12px}",
    ".phisurf-footer button{background:#12323e;color:#e8f3f0;border:1px solid #5b8792;border-radius:10px;padding:9px 13px;cursor:pointer;font:600 12px system-ui}",
    ".phisurf-hint{position:absolute;top:10px;left:10px;right:10px;text-align:center;color:#b8d0d5;font:12px system-ui}",
    "@media(prefers-reduced-motion:reduce){.phisurf-orbit,.phisurf-item{transition:none!important}}",
    "@media(max-width:480px){.phisurf-launch{right:9px;bottom:9px}.phisurf-item{width:90px;font-size:10px;min-height:43px}.phisurf-center{width:88px;height:88px}}",
  ].join("\n");
  const launch = doc.createElement("button");
  launch.type = "button"; launch.className = "phisurf-launch";
  launch.textContent = "ΦSURF";
  launch.setAttribute("aria-label", "Open PhiSurf quick navigation");
  launch.setAttribute("aria-keyshortcuts", "Shift+Space");
  const panel = doc.createElement("section");
  panel.className = "phisurf-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "PhiSurf quick navigation");
  panel.setAttribute("aria-modal", "true");
  panel.hidden = true;
  const orbit = doc.createElement("div");
  orbit.className = "phisurf-orbit";
  panel.append(orbit);
  const hint = doc.createElement("p");
  hint.className = "phisurf-hint";
  hint.textContent = "HOLD · FLICK · RELEASE  /  ESC TO BACK";
  const footer = doc.createElement("div");
  footer.className = "phisurf-footer";
  const back = doc.createElement("button");
  back.type = "button"; back.textContent = "← BACK";
  const exit = doc.createElement("button");
  exit.type = "button"; exit.textContent = "CLOSE";
  const pad = doc.createElement("button");
  pad.type = "button"; pad.textContent = "PAD: OFF";
  footer.append(back, pad, exit);
  orbit.append(hint, footer);
  root.append(style, launch, panel);
  let gesture = null, padEnabled = false, gamepadFrame = 0, lastLB = false;
  let lastA = false, lastB = false, lastSelected = -1, destroyed = false;
  let focusBeforeOpen = null;
  function paint() {
    if (destroyed) return;
    const s = surf.snapshot();
    panel.hidden = !s.open;
    launch.setAttribute("aria-expanded", String(s.open));
    orbit.querySelectorAll(".phisurf-item,.phisurf-center").forEach((el) => el.remove());
    if (!s.open) return;
    const center = doc.createElement("div");
    center.className = "phisurf-center";
    const glyph = doc.createElement("strong");
    glyph.textContent = "Φ";
    const name = doc.createElement("span");
    name.textContent = s.title;
    center.append(glyph, name);
    orbit.append(center);
    const n = s.items.length;
    s.items.forEach((item, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / n;
      const button = doc.createElement("button");
      button.type = "button"; button.className = "phisurf-item";
      button.style.left = (50 + 38 * Math.cos(angle)) + "%";
      button.style.top = (50 + 38 * Math.sin(angle)) + "%";
      button.textContent = item.label;
      button.disabled = !item.enabled;
      button.setAttribute("aria-current", String(s.selected === i));
      button.setAttribute("aria-label", item.label + (item.enabled ? "" : " (locked)"));
      button.addEventListener("click", () => { void surf.activate(i); });
      orbit.append(button);
    });
  }
  const stop = surf.subscribe((state) => {
    if (state.open && panel.hidden) focusBeforeOpen = doc.activeElement;
    if (!state.open && !panel.hidden && focusBeforeOpen?.isConnected) focusBeforeOpen.focus({ preventScroll: true });
    paint();
  });
  function mouseIndex(clientX, clientY) {
    const rect = orbit.getBoundingClientRect();
    const x = clientX - (rect.left + rect.width / 2), y = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(x, y);
    if (distance < Math.max(32, rect.width * 0.15) || distance > rect.width * 0.55) return -1;
    const n = surf.snapshot().items.length;
    return n ? Math.round(((Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) * n / (Math.PI * 2)) % n : -1;
  }
  const pointerDown = (e) => {
    if (e.button !== 0 || gesture) return;
    e.preventDefault();
    gesture = { id: e.pointerId };
    surf.open();
    launch.setPointerCapture?.(e.pointerId);
  };
  const pointerMove = (e) => {
    if (gesture?.id !== e.pointerId) return;
    surf.select(mouseIndex(e.clientX, e.clientY));
  };
  const pointerUp = (e) => {
    if (gesture?.id !== e.pointerId) return;
    gesture = null;
    const i = surf.snapshot().selected;
    if (i >= 0) void surf.activate(i);
  };
  const pointerCancel = () => { gesture = null; surf.close(); };
  launch.addEventListener("pointerdown", pointerDown);
  doc.addEventListener("pointermove", pointerMove);
  doc.addEventListener("pointerup", pointerUp);
  doc.addEventListener("pointercancel", pointerCancel);
  launch.addEventListener("click", (e) => { if (!e.detail) surf.open(); });
  back.addEventListener("click", () => surf.back());
  exit.addEventListener("click", () => surf.close());
  panel.addEventListener("pointerdown", (e) => { if (e.target === panel) surf.close(); });
  const keydown = (e) => {
    if (e.target?.closest?.("input,textarea,select,[contenteditable=true]")) return;
    if (e.shiftKey && e.code === "Space" && !e.repeat) {
      e.preventDefault(); surf.open(); return;
    }
    if (!surf.snapshot().open) return;
    if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); e.stopImmediatePropagation(); surf.back(); return; }
    if (e.key === "Enter" && surf.snapshot().selected >= 0) {
      e.preventDefault(); void surf.activate(surf.snapshot().selected); return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = surf.snapshot().items.length;
      if (n) surf.select((surf.snapshot().selected + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : n - 1)) % n);
    }
  };
  doc.addEventListener("keydown", keydown, true);
  function loopPad() {
    if (destroyed || !padEnabled) return;
    const gp = win.navigator.getGamepads?.()?.find((p) => p && p.connected);
    if (gp && !doc.hidden) {
      const lb = Boolean(gp.buttons?.[4]?.pressed);
      const a = Boolean(gp.buttons?.[0]?.pressed);
      const b = Boolean(gp.buttons?.[1]?.pressed);
      if (lb && !lastLB && !surf.snapshot().open) surf.open();
      if (surf.snapshot().open) {
        const x = gp.axes?.[0] || 0, y = gp.axes?.[1] || 0;
        if (Math.hypot(x, y) > 0.55) {
          const n = surf.snapshot().items.length;
          if (n) surf.select(Math.round(((Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) * n / (Math.PI * 2)) % n);
        } else if (lastSelected !== -1) surf.select(-1);
        if (lastLB && !lb && surf.snapshot().selected >= 0) void surf.activate(surf.snapshot().selected);
        else if (a && !lastA && surf.snapshot().selected >= 0) void surf.activate(surf.snapshot().selected);
        if (b && !lastB) surf.back();
      }
      lastLB = lb; lastA = a; lastB = b;
      lastSelected = surf.snapshot().selected;
    }
    gamepadFrame = win.requestAnimationFrame(loopPad);
  }
  pad.addEventListener("click", () => {
    padEnabled = !padEnabled;
    pad.textContent = padEnabled ? "PAD: ON" : "PAD: OFF";
    if (padEnabled) loopPad();
    else { win.cancelAnimationFrame(gamepadFrame); lastLB = false; lastA = false; lastB = false; }
  });
  paint();
  return Object.freeze({
    open: () => surf.open(),
    close: () => surf.close(),
    snapshot: surf.snapshot,
    dispose() {
      if (destroyed) return;
      destroyed = true;
      win.cancelAnimationFrame(gamepadFrame);
      launch.removeEventListener("pointerdown", pointerDown);
      doc.removeEventListener("pointermove", pointerMove);
      doc.removeEventListener("pointerup", pointerUp);
      doc.removeEventListener("pointercancel", pointerCancel);
      doc.removeEventListener("keydown", keydown, true);
      stop(); surf.dispose(); panel.remove(); launch.remove(); style.remove();
    },
  });
}
