/** Versioned shell only; no host data, game saves, remote sites or runtime API caching. */
export async function registerOfflineShell({ onState = () => {} } = {}) {
  if (
    !document.querySelector('meta[name="genewrist-build"]') ||
    !("serviceWorker" in navigator) ||
    !isSecureContext
  )
    return null;
  try {
    const registration = await navigator.serviceWorker.register(
      new URL("../sw.js", import.meta.url),
      {
        scope: new URL("../", import.meta.url).pathname,
        updateViaCache: "none",
      },
    );
    if (registration.waiting)
      onState(
        "A Field Engine update is ready. Close this console’s tabs and reopen to apply it.",
      );
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed")
          onState(
            navigator.serviceWorker.controller
              ? "Update ready. Close this console’s tabs and reopen to apply it."
              : "Offline shell cached. Your local apps are ready for offline use.",
          );
      });
    });
    return registration;
  } catch {
    onState(
      "Offline caching unavailable. You can use this session and export your work.",
    );
    return null;
  }
}
