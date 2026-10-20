(() => {
  "use strict";

  // Keep browser history restoration, with a small per-entry backup and a
  // semantic handoff for the differently sized Ukrainian and English copy.
  const root = document.documentElement;
  const stateKey = "solarCityPosition";
  const storagePrefix = "solarcity:position:v1:";
  const transferKey = `${storagePrefix}language`;
  const locale = root.lang === "en" ? "en" : "uk";
  const landmarkSelector = [
    "h1", "h2", "h3", "p", "article", "figure", "img", "video",
    "form", "label", "input", "select", "textarea", "button",
    ".section-head", ".platform-sequence", ".project-image", ".project-media",
    ".network-canvas", ".curve-module", ".curve-plot", ".asset-stage",
    ".asset-map", ".asset-metrics", ".community-capex", ".holding-map", ".development-timeline li",
    ".scale-item", ".community-system li", ".projects-archive-cta",
    ".footer-brand", ".footer-top", ".footer-bottom"
  ].join(",");
  const readStorage = (key) => {
    try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
  };
  const writeStorage = (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Native history remains available. */ }
  };
  const removeStorage = (key) => {
    try { sessionStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  };
  const navigationType = (() => {
    const type = performance.getEntriesByType?.("navigation")?.[0]?.type;
    if (type) return type;
    return performance.navigation?.type === 1 ? "reload"
      : performance.navigation?.type === 2 ? "back_forward" : "navigate";
  })();
  const historyLoad = navigationType === "reload" || navigationType === "back_forward";
  try { history.scrollRestoration = "auto"; } catch { /* Older embedded browsers use their default. */ }

  const layoutTop = (element) => {
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  };
  const documentHeight = () => Math.max(root.scrollHeight, document.body.scrollHeight);
  const maxScroll = () => Math.max(0, documentHeight() - window.innerHeight);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const headerInset = (y = window.scrollY) => {
    const style = getComputedStyle(root);
    const property = y > 24 ? "--header-scrolled-h" : "--header-h";
    return (parseFloat(style.getPropertyValue(property)) || document.querySelector("[data-header]")?.offsetHeight || 0) + 12;
  };
  const containers = () => [...document.querySelectorAll("main > section[id], footer.site-footer")];
  const containerKey = (element) => element.id || "footer";
  const findContainer = (key) => containers().find((element) => containerKey(element) === key);
  const elementPath = (element, container) => {
    const path = [];
    for (let node = element; node && node !== container; node = node.parentElement) {
      if (!node.parentElement) return null;
      path.unshift([...node.parentElement.children].indexOf(node));
    }
    return path;
  };
  const resolvePath = (container, path) => {
    if (!Array.isArray(path)) return null;
    let element = container;
    for (const index of path) {
      if (!Number.isInteger(index) || index < 0) return null;
      element = element?.children[index];
    }
    return element ?? null;
  };
  const validPosition = (position) => position && Number.isFinite(position.y)
    && Number.isFinite(position.width) && Number.isFinite(position.totalHeight)
    && typeof position.container === "string";

  const capture = () => {
    const y = Math.max(0, window.scrollY);
    const inset = headerInset(y);
    const point = y + inset;
    const list = containers();
    const container = [...list].reverse().find((element) => layoutTop(element) <= point) ?? list[0];
    if (!container) return null;
    const top = layoutTop(container);
    const height = Math.max(1, container.offsetHeight);
    const landmarks = [...container.querySelectorAll(landmarkSelector)].filter((element) =>
      element.offsetHeight > 1 && !element.classList.contains("sr-only")
      && !element.closest('[hidden], [aria-hidden="true"]')
    ).map((element) => ({ element, top: layoutTop(element) })).sort((a, b) => a.top - b.top);
    // A paragraph, image frame or form field retains its internal reading point.
    // Otherwise interpolate between adjacent structural landmarks.
    const inside = landmarks.filter(({ element, top: landmarkTop }) =>
      landmarkTop <= point && point < landmarkTop + element.offsetHeight
    ).sort((a, b) => a.element.offsetHeight - b.element.offsetHeight)[0];
    const above = [...landmarks].reverse().find((landmark) => landmark.top <= point);
    const below = landmarks.find((landmark) => landmark.top > point);
    const aboveTop = above?.top ?? top;
    const belowTop = below?.top ?? top + height;
    return {
      y, width: root.clientWidth, totalHeight: documentHeight(), viewportHeight: window.innerHeight,
      heroViewportHeight: parseFloat(getComputedStyle(root).getPropertyValue("--hero-viewport-height")) || 0,
      path: window.location.pathname, locale, container: containerKey(container),
      containerProgress: clamp((point - top) / height, 0, 1),
      inside: inside ? { path: elementPath(inside.element, container), fraction: clamp((point - inside.top) / inside.element.offsetHeight, 0, 1) } : null,
      above: above ? elementPath(above.element, container) : [],
      below: below ? elementPath(below.element, container) : null,
      intervalProgress: belowTop > aboveTop ? clamp((point - aboveTop) / (belowTop - aboveTop), 0, 1) : 0,
      bottom: Math.max(0, maxScroll() - y), savedAt: Date.now()
    };
  };

  let entry;
  let sequence = 0;
  const stateObject = () => history.state && typeof history.state === "object" && !Array.isArray(history.state) ? history.state : {};
  const replaceEntry = (value) => {
    entry = value;
    try { history.replaceState({ ...stateObject(), [stateKey]: value }, "", window.location.href); } catch { /* Session backup still works. */ }
  };
  const freshEntry = () => ({
    id: window.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${sequence++}`,
    path: window.location.pathname
  });
  const existingEntry = stateObject()[stateKey];
  replaceEntry(existingEntry?.id && existingEntry.path === window.location.pathname ? existingEntry : freshEntry());
  const entryStorageKey = (value = entry) => `${storagePrefix}${value.path}:${value.id}`;
  const entryPosition = (value) => {
    if (!value?.id || value.path !== window.location.pathname) return null;
    const position = readStorage(entryStorageKey(value)) ?? value.position;
    return validPosition(position) && position.path === window.location.pathname ? position : null;
  };
  const normalizedPath = (url) => url.pathname.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";
  const destinationKey = (url) => `${url.origin}${normalizedPath(url)}${url.search}${url.hash}`;
  const incomingTransfer = (() => {
    const transfer = readStorage(transferKey);
    if (!transfer) return null;
    if (!Number.isFinite(transfer.expires) || transfer.expires < Date.now()) {
      removeStorage(transferKey);
      return null;
    }
    if (transfer.destination !== destinationKey(new URL(window.location.href)) || transfer.locale !== locale) return null;
    removeStorage(transferKey);
    return validPosition(transfer.position) ? transfer.position : null;
  })();

  let pending = incomingTransfer ? { position: incomingTransfer, semantic: true }
    : historyLoad && entryPosition(entry) ? { position: entryPosition(entry), semantic: false } : null;
  let blocked = Boolean(pending) || historyLoad;
  let generation = 0;
  let saveTimer;
  let historyHash = null;
  let historyHashUntil = 0;
  let initialHashAllowed = !historyLoad && !incomingTransfer;
  let interrupted = false;

  const save = () => {
    if (blocked) return;
    const position = capture();
    if (!position) return;
    replaceEntry({ ...entry, position });
    writeStorage(entryStorageKey(), position);
  };
  const targetY = ({ position, semantic }) => {
    // Mobile browser chrome may change innerHeight during reload. Retain the
    // original image frame before measuring the document or landmarks.
    if (!semantic && Math.abs(position.width - root.clientWidth) < 1 && position.heroViewportHeight > 0) {
      root.style.setProperty("--hero-viewport-height", `${position.heroViewportHeight}px`);
    }
    const maximum = maxScroll();
    if (position.y < 1) return 0;
    if (position.bottom < 2) return maximum;
    if (!semantic && Math.abs(position.width - root.clientWidth) < 1
      && Math.abs(position.totalHeight - documentHeight()) < 2) return clamp(position.y, 0, maximum);
    const container = findContainer(position.container);
    if (!container) return clamp(position.y, 0, maximum);
    const containerTop = layoutTop(container);
    const containerHeight = Math.max(1, container.offsetHeight);
    const inside = position.inside && resolvePath(container, position.inside.path);
    let point;
    if (inside?.offsetHeight > 1) {
      point = layoutTop(inside) + clamp(position.inside.fraction, 0, 1) * inside.offsetHeight;
    } else {
      const above = resolvePath(container, position.above);
      const below = resolvePath(container, position.below);
      const aboveTop = above ? layoutTop(above) : containerTop;
      const belowTop = below ? layoutTop(below) : containerTop + containerHeight;
      point = belowTop > aboveTop ? aboveTop + clamp(position.intervalProgress, 0, 1) * (belowTop - aboveTop)
        : containerTop + clamp(position.containerProgress, 0, 1) * containerHeight;
    }
    return clamp(point - headerInset(position.y), 0, maximum);
  };
  const applyPending = () => {
    if (!pending || interrupted) return;
    window.scrollTo({ top: targetY(pending), left: 0, behavior: "instant" });
  };
  const afterFrames = (callback, token = generation) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (token === generation) callback();
    }));
  };
  const finish = () => {
    applyPending();
    pending = null;
    blocked = false;
    save();
  };
  const interrupt = () => {
    initialHashAllowed = false;
    if (!blocked && !pending) return;
    interrupted = true;
    pending = null;
    blocked = false;
    generation += 1;
  };
  const startEntry = () => {
    pending = null;
    blocked = false;
    interrupted = false;
    initialHashAllowed = false;
    generation += 1;
    clearTimeout(saveTimer);
    replaceEntry(freshEntry());
    save();
  };
  const transferTo = (destination) => {
    const url = new URL(destination, window.location.href);
    if (url.origin !== window.location.origin) return;
    save();
    const position = capture();
    if (!position) return;
    writeStorage(transferKey, {
      destination: destinationKey(url), locale: /\/en$/.test(normalizedPath(url)) ? "en" : "uk",
      expires: Date.now() + 120000, position
    });
  };
  window.SolarCityPosition = {
    save, capture, startEntry, transferTo,
    isHistoryNavigation: () => {
      const match = Date.now() <= historyHashUntil && historyHash === window.location.hash;
      if (match) historyHashUntil = 0;
      return match;
    },
    shouldUseInitialHash: () => initialHashAllowed && !interrupted
  };

  window.addEventListener("scroll", () => {
    clearTimeout(saveTimer);
    if (!blocked) saveTimer = window.setTimeout(save, 150);
  }, { passive: true });
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  ["wheel", "touchstart", "pointerdown"].forEach((event) => window.addEventListener(event, interrupt, { passive: true }));
  document.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)
      && !event.target.closest?.("input, textarea, select, [contenteditable]")) interrupt();
  });
  window.addEventListener("popstate", (event) => {
    clearTimeout(saveTimer);
    historyHash = window.location.hash;
    historyHashUntil = Date.now() + 250;
    initialHashAllowed = false;
    interrupted = false;
    generation += 1;
    const value = event.state?.[stateKey];
    replaceEntry(value?.id && value.path === window.location.pathname ? value : freshEntry());
    const position = entryPosition(entry);
    pending = position ? { position, semantic: false } : null;
    blocked = true;
    afterFrames(finish);
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    generation += 1;
    pending = null;
    blocked = false;
    interrupted = false;
    initialHashAllowed = false;
    clearTimeout(saveTimer);
    // BFCache already contains the exact viewport; do not scroll it again.
  });
  const domReady = () => afterFrames(applyPending);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", domReady, { once: true });
  else domReady();
  const loaded = () => {
    const token = generation;
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    // The site uses system fonts. Bound the wait for an embedded browser whose
    // font-ready promise does not settle, without retaining a correction loop.
    Promise.race([fontsReady, new Promise((resolve) => window.setTimeout(resolve, 1000))])
      .then(() => afterFrames(finish, token));
  };
  if (document.readyState === "complete") loaded();
  else window.addEventListener("load", loaded, { once: true });
})();
