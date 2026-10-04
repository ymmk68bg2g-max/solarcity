(() => {
  "use strict";

  const body = document.body;
  const header = document.querySelector("[data-header]");
  const progress = document.querySelector(".scroll-progress span");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const language = document.querySelector(".language");
  let languageNoticeTimer;
  language.querySelector("button").addEventListener("click", () => {
    clearTimeout(languageNoticeTimer);
    language.classList.add("is-notifying");
    languageNoticeTimer = setTimeout(() => language.classList.remove("is-notifying"), 3500);
  });
  const timeline = document.querySelector("[data-timeline]");
  const timelineSteps = timeline ? [...timeline.querySelectorAll("li")] : [];
  let timelinePinnedIndex = null;

  const activateTimelineStep = (index) => {
    timelineSteps.forEach((step, stepIndex) => {
      const active = stepIndex === index;
      step.classList.toggle("is-active", active);
      step.classList.toggle("is-passed", stepIndex < index);
      if (active) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  };

  const updateScroll = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    header.classList.toggle("is-scrolled", window.scrollY > 24);

    if (timeline) {
      const rect = timeline.getBoundingClientRect();
      const timelineRatio = (window.innerHeight * 0.65 - rect.top) / Math.max(rect.height, 1);
      const clampedRatio = Math.min(1, Math.max(0, timelineRatio));
      timeline.style.setProperty("--timeline-progress", clampedRatio.toFixed(3));
      if (timelinePinnedIndex === null && timelineSteps.length) {
        activateTimelineStep(Math.min(timelineSteps.length - 1, Math.floor(clampedRatio * timelineSteps.length)));
      }
    }
  };

  updateScroll();
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", updateScroll);

  timelineSteps.forEach((step, index) => {
    const holdStep = () => {
      timelinePinnedIndex = index;
      activateTimelineStep(index);
    };
    const releaseStep = () => {
      timelinePinnedIndex = null;
      updateScroll();
    };
    step.addEventListener("mouseenter", holdStep);
    step.addEventListener("mouseleave", releaseStep);
    step.addEventListener("focus", holdStep);
    step.addEventListener("blur", releaseStep);
  });

  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Відкрити меню");
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    body.classList.remove("menu-open");
  };

  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    if (open) {
      closeMenu();
    } else {
      menuToggle.setAttribute("aria-expanded", "true");
      menuToggle.setAttribute("aria-label", "Закрити меню");
      mobileMenu.classList.add("is-open");
      mobileMenu.setAttribute("aria-hidden", "false");
      body.classList.add("menu-open");
      mobileMenu.querySelector("a")?.focus();
    }
  });

  mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const revealItems = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const holdingMap = document.querySelector("[data-holding-map]");
  if (holdingMap) {
    const holdingMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let holdingVisible = false;
    const updateHoldingMotion = () => {
      holdingMap.classList.toggle("is-animating", holdingVisible && !document.hidden && !holdingMotion.matches);
    };
    if ("IntersectionObserver" in window) {
      const holdingObserver = new IntersectionObserver(([entry]) => {
        holdingVisible = entry.isIntersecting;
        updateHoldingMotion();
      }, { threshold: 0 });
      holdingObserver.observe(holdingMap);
    } else {
      holdingVisible = true;
      updateHoldingMotion();
    }
    document.addEventListener("visibilitychange", updateHoldingMotion);
    holdingMotion.addEventListener("change", updateHoldingMotion);
  }

  const platform = document.querySelector("[data-platform]");
  const platformSteps = [...document.querySelectorAll("[data-step]")];
  const sequenceLine = document.querySelector(".sequence-line span");
  let platformIndex = 0;
  let platformVisible = false;
  let platformTimer;

  const positionPlatformLine = () => {
    const step = platformSteps[platformIndex];
    const vertical = window.matchMedia("(max-width: 768px)").matches;
    sequenceLine.style.width = vertical ? "2px" : `${step.offsetWidth}px`;
    sequenceLine.style.height = vertical ? `${step.offsetHeight}px` : "2px";
    sequenceLine.style.transform = vertical
      ? `translate3d(0, ${step.offsetTop}px, 0)`
      : `translate3d(${step.offsetLeft}px, 0, 0)`;
  };

  const activatePlatform = (index) => {
    platformIndex = index;
    platformSteps.forEach((step, stepIndex) => {
      const active = stepIndex === index;
      step.classList.toggle("is-active", active);
      step.setAttribute("aria-pressed", String(active));
    });
    positionPlatformLine();
  };

  const updatePlatformTimer = () => {
    clearTimeout(platformTimer);
    if (reduceMotion || !platformVisible || document.hidden || platform.matches(":hover, :focus-within")) return;
    platformTimer = setTimeout(() => {
      activatePlatform((platformIndex + 1) % platformSteps.length);
      updatePlatformTimer();
    }, 1500);
  };

  platformSteps.forEach((step, index) => {
    const activate = () => {
      activatePlatform(index);
      updatePlatformTimer();
    };
    step.addEventListener("mouseenter", activate);
    step.addEventListener("focus", activate);
    step.addEventListener("click", activate);
  });
  platform.addEventListener("mouseleave", updatePlatformTimer);
  platform.addEventListener("focusout", () => requestAnimationFrame(updatePlatformTimer));
  document.addEventListener("visibilitychange", updatePlatformTimer);
  if ("IntersectionObserver" in window) {
    const platformObserver = new IntersectionObserver(([entry]) => {
      platformVisible = entry.isIntersecting;
      updatePlatformTimer();
    }, { threshold: 0.15 });
    platformObserver.observe(platform);
  } else {
    platformVisible = true;
    updatePlatformTimer();
  }
  activatePlatform(0);
  if ("ResizeObserver" in window) new ResizeObserver(positionPlatformLine).observe(platform);
  else window.addEventListener("resize", positionPlatformLine);
  document.fonts?.ready.then(positionPlatformLine);

  // Image coordinates are normalized against the original asset, then mapped
  // through object-fit/object-position. Labels and endpoints share one frame.
  const imageMaps = [...document.querySelectorAll("[data-image-map]")];
  imageMaps.forEach((map) => {
    const image = map.querySelector("img");
    const svg = map.querySelector("[data-map-lines]");
    const labels = [...map.querySelectorAll("[data-map-label]")];
    const ns = "http://www.w3.org/2000/svg";
    const leaders = labels.map(() => {
      const group = document.createElementNS(ns, "g");
      const path = document.createElementNS(ns, "path");
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("r", "3.5");
      group.append(path, dot);
      svg.append(group);
      return { group, path, dot };
    });
    const layoutMap = () => {
      if (!image.naturalWidth || !map.clientWidth || !map.clientHeight) return;
      const width = map.clientWidth;
      const height = map.clientHeight;
      const style = getComputedStyle(image);
      const fit = style.objectFit === "contain" ? Math.min : Math.max;
      const scale = fit(width / image.naturalWidth, height / image.naturalHeight);
      const [px, py] = style.objectPosition.split(" ").map((value) => parseFloat(value) / 100);
      const offsetX = (width - image.naturalWidth * scale) * px;
      const offsetY = (height - image.naturalHeight * scale) * py;
      const project = (x, y) => ({
        x: offsetX + x * image.naturalWidth * scale,
        y: offsetY + y * image.naturalHeight * scale
      });
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const occupied = [];
      const title = map.closest(".hero")?.querySelector("h1");
      if (title) {
        const rect = title.getBoundingClientRect();
        const origin = map.getBoundingClientRect();
        occupied.push({ x: rect.left - origin.left - 12, y: rect.top - origin.top - 12, w: rect.width + 24, h: rect.height + 24 });
      }
      const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      labels.forEach((label, index) => {
        const point = project(Number(label.dataset.x), Number(label.dataset.y));
        const leader = leaders[index];
        const visible = point.x > 10 && point.x < width - 10 && point.y > 10 && point.y < height - 10;
        label.hidden = !visible;
        leader.group.style.display = visible ? "" : "none";
        if (!visible) return;
        const preferred = project(Number(label.dataset.labelX), Number(label.dataset.labelY));
        const w = label.offsetWidth;
        const h = label.offsetHeight;
        if (title && width <= 768) {
          preferred.x = point.x - w / 2;
          preferred.y = point.y - 56;
        }
        const clamp = (value, max) => Math.max(16, Math.min(max - 16, value));
        let box = { x: clamp(preferred.x, width - w), y: clamp(preferred.y, height - h), w, h };
        for (const dy of [0, -h - 14, h + 14, -2 * h - 28, 2 * h + 28]) {
          const candidate = { ...box, y: clamp(preferred.y + dy, height - h) };
          if (!occupied.some((other) => overlaps(candidate, other))) { box = candidate; break; }
        }
        if (occupied.some((other) => overlaps(box, other))) {
          label.hidden = true;
          leader.group.style.display = "none";
          return;
        }
        occupied.push({ x: box.x - 5, y: box.y - 5, w: w + 10, h: h + 10 });
        label.style.left = `${box.x}px`;
        label.style.top = `${box.y}px`;
        const startX = Math.max(box.x, Math.min(box.x + w, point.x));
        const startY = Math.max(box.y, Math.min(box.y + h, point.y));
        const midX = (startX + point.x) / 2;
        leader.path.setAttribute("d", `M${startX} ${startY} L${midX} ${startY} L${midX} ${point.y} L${point.x} ${point.y}`);
        leader.dot.setAttribute("cx", point.x);
        leader.dot.setAttribute("cy", point.y);
        leader.group.classList.toggle("is-active", label.classList.contains("is-active"));
      });
      map.classList.add("is-map-ready");
    };
    image.addEventListener("load", layoutMap);
    map.addEventListener("mapchange", layoutMap);
    if ("ResizeObserver" in window) new ResizeObserver(layoutMap).observe(map);
    else window.addEventListener("resize", layoutMap);
    document.fonts?.ready.then(layoutMap);
    layoutMap();
  });

  const nodeContent = {
    pv: {
      label: "01 / СОНЯЧНА ГЕНЕРАЦІЯ",
      title: "Генерація перетворює територію на джерело енергії.",
      text: "Параметри майданчика та профіль споживання стають основою архітектури майбутнього активу.",
      paths: ["path-pv-bess", "path-city-pv"]
    },
    bess: {
      label: "02 / НАКОПИЧЕННЯ ЕНЕРГІЇ",
      title: "Накопичення керує часом і цінністю енергії.",
      text: "Система накопичення заряджається у періоди нижчої вартості та підтримує систему тоді, коли попит зростає.",
      paths: ["path-pv-bess", "path-bess-sub"]
    },
    sub: {
      label: "03 / ПІДСТАНЦІЯ",
      title: "Підстанція зводить потоки у керовану точку.",
      text: "Вона поєднує генерацію, накопичення, навантаження та мережевий контур об’єкта.",
      paths: ["path-bess-sub", "path-sub-grid", "path-sub-industry"]
    },
    grid: {
      label: "04 / МЕРЕЖА",
      title: "Мережа відкриває двосторонній рух енергії.",
      text: "Інфраструктура взаємодіє з енергосистемою, балансуючи видачу, споживання та доступну потужність.",
      paths: ["path-sub-grid", "path-grid-industry"]
    },
    industry: {
      label: "05 / ПРОМИСЛОВІСТЬ",
      title: "Виробництво отримує прогнозований енергетичний контур.",
      text: "Генерація та накопичення працюють разом із реальним профілем навантаження підприємства.",
      paths: ["path-grid-industry", "path-sub-industry", "path-industry-city"]
    },
    city: {
      label: "06 / МІСТО",
      title: "Окремі активи формують енергетичне місто.",
      text: "Комерційні об’єкти, виробництво й інфраструктура об’єднуються в одну керовану екосистему.",
      paths: ["path-industry-city", "path-city-pv"]
    }
  };

  const networkNodes = [...document.querySelectorAll("[data-node]")];
  const nodeLabel = document.querySelector("[data-node-label]");
  const nodeTitle = document.querySelector("[data-node-title]");
  const nodeText = document.querySelector("[data-node-text]");

  const activateNode = (name) => {
    const content = nodeContent[name];
    networkNodes.forEach((node) => node.classList.toggle("is-active", node.dataset.node === name));
    document.querySelectorAll(".network-canvas path").forEach((path) => {
      path.classList.toggle("is-active", content.paths.includes(path.id));
    });
    nodeLabel.textContent = content.label;
    nodeTitle.textContent = content.title;
    nodeText.textContent = content.text;
  };

  networkNodes.forEach((node) => {
    node.addEventListener("mouseenter", () => activateNode(node.dataset.node));
    node.addEventListener("focus", () => activateNode(node.dataset.node));
    node.addEventListener("click", () => activateNode(node.dataset.node));
  });
  activateNode("pv");

  const curveModels = {
    shift: {
      path: "M50 250 C170 290 210 305 315 282 C430 255 470 180 565 195 C655 210 700 330 795 255 C870 196 900 95 950 70",
      title: "Добовий цикл перенесення енергії",
      description: "Система накопичення накопичує енергію в період нижчої вартості та віддає її у години пікового попиту.",
      chargeX: 270,
      sellX: 895,
      chargeLabel: "ЗАРЯДЖАННЯ СНЕ",
      sellLabel: "ПІКОВИЙ ПОПИТ",
      phases: [
        [0.38, "НАКОПИЧЕННЯ", "Система накопичення приймає енергію у період нижчої вартості."],
        [0.72, "БАЛАНСУВАННЯ", "Система узгоджує генерацію, навантаження та доступний резерв."],
        [1, "ВИДАЧА", "Накопичена енергія підтримує актив у години пікового попиту."]
      ]
    },
    arbitrage: {
      path: "M50 225 C145 275 230 326 340 294 C450 262 520 138 620 186 C720 234 742 318 810 244 C875 174 910 104 950 82",
      title: "Добовий цикл мережевого арбітражу",
      description: "Актив реагує на зміну ринкової вартості енергії протягом доби.",
      chargeX: 300,
      sellX: 885,
      chargeLabel: "НИЖЧА ВАРТІСТЬ",
      sellLabel: "ВИЩА ВАРТІСТЬ",
      phases: [
        [0.4, "НИЖЧА ВАРТІСТЬ", "Система накопичує енергію у сприятливий період ринку."],
        [0.7, "ОЧІКУВАННЯ", "Актив утримує доступний резерв до зміни ринкового сигналу."],
        [1, "ВИЩА ВАРТІСТЬ", "Енергія видається у період вищої цінності для системи."]
      ]
    },
    management: {
      path: "M50 255 C150 270 235 238 330 250 C430 265 500 214 590 222 C680 230 758 194 838 181 C892 172 925 151 950 142",
      title: "Керований профіль енергетичного активу",
      description: "Диспетчеризація та моніторинг згладжують профіль і підтримують керовану роботу активу.",
      chargeX: 410,
      sellX: 820,
      chargeLabel: "МОНІТОРИНГ",
      sellLabel: "КЕРУВАННЯ",
      phases: [
        [0.34, "МОНІТОРИНГ", "Система збирає дані про генерацію, накопичення та навантаження."],
        [0.68, "ОПТИМІЗАЦІЯ", "Алгоритм узгоджує роботу компонентів енергетичного активу."],
        [1, "КЕРУВАННЯ", "Диспетчеризація підтримує цільовий режим і доступність активу."]
      ]
    }
  };

  const curveOptions = [...document.querySelectorAll("[data-model]")];
  const curveChart = document.querySelector("[data-curve-chart]");
  const curveSvg = document.querySelector("[data-curve-svg]");
  const curveLine = document.querySelector("[data-curve-line]");
  const curveArea = document.querySelector("[data-curve-area]");
  const markerCharge = document.querySelector("[data-marker-charge]");
  const markerSell = document.querySelector("[data-marker-sell]");
  const pointCharge = document.querySelector("[data-point-charge]");
  const pointSell = document.querySelector("[data-point-sell]");
  const labelCharge = document.querySelector("[data-label-charge]");
  const labelSell = document.querySelector("[data-label-sell]");
  const probeLine = document.querySelector("[data-probe-line]");
  const probeDot = document.querySelector("[data-probe-dot]");
  const readoutTime = document.querySelector("[data-readout-time]");
  const readoutState = document.querySelector("[data-readout-state]");
  const readoutCopy = document.querySelector("[data-readout-copy]");
  const curveTitle = document.querySelector("#curve-title");
  const curveDescription = document.querySelector("#curve-desc");
  const curvePlot = document.querySelector("[data-curve-plot]");
  const mobileLabelCharge = document.querySelector("[data-mobile-label-charge]");
  const mobileLabelSell = document.querySelector("[data-mobile-label-sell]");
  const curveGrid = curveSvg?.querySelector(".chart-grid");
  const mobileCurve = window.matchMedia("(max-width: 768px)");
  let activeCurveModel = "shift";
  let probeRatio = 0.25;

  const pathPointAtX = (path, targetX) => {
    const totalLength = path.getTotalLength();
    let start = 0;
    let end = totalLength;
    let point = path.getPointAtLength(0);
    for (let index = 0; index < 18; index += 1) {
      const middle = (start + end) / 2;
      point = path.getPointAtLength(middle);
      if (point.x < targetX) start = middle;
      else end = middle;
    }
    return point;
  };

  const formatChartTime = (ratio) => {
    const totalMinutes = Math.round(ratio * 24 * 60);
    const hours = Math.min(24, Math.floor(totalMinutes / 60));
    const minutes = hours === 24 ? 0 : totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const displayCurvePoint = (x, y) => {
    if (!mobileCurve.matches || !curvePlot) return { x, y };
    const rect = curvePlot.getBoundingClientRect();
    return { x: (x - 35) / 930 * rect.width, y: (y - 35) / 380 * rect.height };
  };

  const updateCurveProbe = (ratio) => {
    if (!curveLine) return;
    probeRatio = Math.min(1, Math.max(0, ratio));
    const x = 50 + probeRatio * 900;
    const localPoint = pathPointAtX(curveLine, x);
    const point = displayCurvePoint(localPoint.x, localPoint.y);
    const top = displayCurvePoint(x, 70);
    const bottom = displayCurvePoint(x, 350);
    probeLine?.setAttribute("x1", point.x.toFixed(2));
    probeLine?.setAttribute("x2", point.x.toFixed(2));
    probeLine?.setAttribute("y1", top.y.toFixed(2));
    probeLine?.setAttribute("y2", bottom.y.toFixed(2));
    probeDot?.setAttribute("cx", point.x.toFixed(2));
    probeDot?.setAttribute("cy", point.y.toFixed(2));
    if (readoutTime) readoutTime.textContent = formatChartTime(probeRatio);
    const phase = curveModels[activeCurveModel].phases.find(([limit]) => probeRatio <= limit);
    if (phase && readoutState && readoutCopy) {
      readoutState.textContent = phase[1];
      readoutCopy.textContent = phase[2];
    }
  };

  const updateCurveMarker = (marker, point, label, x, labelText, alignRight = false) => {
    if (!curveLine || !marker || !point || !label) return;
    const curvePoint = pathPointAtX(curveLine, x);
    const center = displayCurvePoint(x, curvePoint.y);
    const top = displayCurvePoint(x, alignRight ? 70 : 120);
    const bottom = displayCurvePoint(x, 350);
    marker.setAttribute("x1", String(center.x));
    marker.setAttribute("x2", String(center.x));
    marker.setAttribute("y1", String(top.y));
    marker.setAttribute("y2", String(bottom.y));
    point.setAttribute("cx", String(center.x));
    point.setAttribute("cy", center.y.toFixed(2));
    label.textContent = labelText;
    // Anchor the label away from its vertical marker instead of letting the
    // text straddle the dashed line. SVG units keep the gap on every viewport.
    label.setAttribute("text-anchor", alignRight ? "end" : "start");
    label.setAttribute("x", String(x + (alignRight ? -16 : 16)));
    label.setAttribute("y", String(Math.max(48, curvePoint.y - 48)));
  };

  const updateMobileCurve = () => {
    if (!curveSvg || !curvePlot) return;
    const mobile = mobileCurve.matches;
    const rect = curvePlot.getBoundingClientRect();
    if (!rect.width || !rect.height || !curveLine) return;
    // Only the data series and grid use independent X/Y scales. The root SVG
    // stays in screen-pixel coordinates, so circles, strokes and dashes retain
    // their geometry as the plot fills its mobile frame.
    curveSvg.setAttribute("viewBox", mobile ? `0 0 ${rect.width} ${rect.height}` : "0 0 1000 420");
    curveSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const sx = rect.width / 930;
    const sy = rect.height / 380;
    [curveLine, curveArea, curveGrid].forEach((element) => {
      if (!element) return;
      if (mobile) element.setAttribute("transform", `matrix(${sx} 0 0 ${sy} ${-35 * sx} ${-35 * sy})`);
      else element.removeAttribute("transform");
    });
    [pointCharge, pointSell].forEach((point) => point?.setAttribute("r", mobile ? "4" : "7"));
    probeDot?.setAttribute("r", mobile ? "4" : "6");
    const model = curveModels[activeCurveModel];
    updateCurveMarker(markerCharge, pointCharge, labelCharge, model.chargeX, model.chargeLabel);
    updateCurveMarker(markerSell, pointSell, labelSell, model.sellX, model.sellLabel, true);
    updateCurveProbe(probeRatio);
    if (!mobile) return;
    const place = (label, x, text, alignRight) => {
      if (!label) return;
      const words = text.split(" ");
      label.replaceChildren();
      words.forEach((word, index) => {
        if (index) label.append(document.createElement("br"));
        label.append(document.createTextNode(word));
      });
      const point = pathPointAtX(curveLine, x);
      const positionX = (x - 35) / 930 * rect.width;
      label.style.left = alignRight ? "auto" : `${positionX + 8}px`;
      label.style.right = alignRight ? `${rect.width - positionX + 8}px` : "auto";
      label.style.maxWidth = `${Math.max(0, (alignRight ? positionX : rect.width - positionX) - 16)}px`;
      label.style.top = `${Math.max(8, (point.y - 35) / 380 * rect.height - label.offsetHeight - 16)}px`;
    };
    place(mobileLabelCharge, model.chargeX, model.chargeLabel, false);
    place(mobileLabelSell, model.sellX, model.sellLabel, true);
  };

  mobileCurve.addEventListener("change", updateMobileCurve);
  if (curvePlot && "ResizeObserver" in window) new ResizeObserver(updateMobileCurve).observe(curvePlot);
  else window.addEventListener("resize", updateMobileCurve);
  document.fonts?.ready.then(updateMobileCurve);

  const activateCurveModel = (modelName) => {
    if (!curveModels[modelName] || !curveLine || !curveArea) return;
    const model = curveModels[modelName];
    activeCurveModel = modelName;
    curveOptions.forEach((item) => {
      const active = item.dataset.model === modelName;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    if (!reduceMotion) curveChart?.classList.add("is-switching");
    window.setTimeout(() => {
      if (activeCurveModel !== modelName) return;
      curveLine.setAttribute("d", model.path);
      curveArea.setAttribute("d", `${model.path} L950 350 L50 350 Z`);
      markerCharge?.classList.toggle("is-emphasized", modelName !== "management");
      markerSell?.classList.toggle("is-emphasized", modelName !== "shift");
      updateMobileCurve();
      if (curveTitle) curveTitle.textContent = model.title;
      if (curveDescription) curveDescription.textContent = model.description;
      curveChart?.classList.remove("is-switching");
    }, reduceMotion ? 0 : 120);
  };

  curveOptions.forEach((option) => {
    const activate = () => activateCurveModel(option.dataset.model);
    option.addEventListener("mouseenter", activate);
    option.addEventListener("focus", activate);
    option.addEventListener("click", activate);
  });

  if (curveSvg && curveChart) {
    const probeFromPointer = (event) => {
      const rect = curveSvg.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / Math.max(rect.width, 1);
      updateCurveProbe(mobileCurve.matches ? (35 + ratio * 930 - 50) / 900 : ratio);
    };
    curveSvg.addEventListener("pointerenter", (event) => {
      curveChart.classList.add("is-probing");
      probeFromPointer(event);
    });
    curveSvg.addEventListener("pointermove", probeFromPointer);
    curveSvg.addEventListener("pointerleave", () => curveChart.classList.remove("is-probing"));
    curveSvg.addEventListener("focus", () => {
      curveChart.classList.add("is-probing");
      updateCurveProbe(probeRatio);
    });
    curveSvg.addEventListener("blur", () => curveChart.classList.remove("is-probing"));
    curveSvg.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      updateCurveProbe(probeRatio + (event.key === "ArrowRight" ? 0.04 : -0.04));
    });
  }

  activateCurveModel("shift");

  const assetSteps = [
    { index: "01 / СОНЯЧНІ ПАНЕЛІ", copy: "Сонячна генерація формує базовий потік енергії для гібридної моделі." },
    { index: "02 / НАКОПИЧЕННЯ ЕНЕРГІЇ", copy: "Система накопичення переносить енергію між різними періодами попиту та вартості." },
    { index: "03 / ПІДСТАНЦІЯ", copy: "Підстанція збирає потоки активу та готує їх до мережевої інтеграції." },
    { index: "04 / МЕРЕЖЕВЕ ПРИЄДНАННЯ", copy: "Точка приєднання поєднує комплекс з енергосистемою та ринковою моделлю." }
  ];
  const assetMarkers = [...document.querySelectorAll("[data-asset-step]")];
  const assetIndex = document.querySelector("[data-asset-index]");
  const assetCopy = document.querySelector("[data-asset-copy]");
  assetMarkers.forEach((marker) => {
    const activate = () => {
      const index = Number(marker.dataset.assetStep);
      assetMarkers.forEach((item) => {
        item.classList.toggle("is-active", item === marker);
        item.setAttribute("aria-pressed", String(item === marker));
      });
      assetIndex.textContent = assetSteps[index].index;
      assetCopy.textContent = assetSteps[index].copy;
      marker.closest("[data-image-map]").dispatchEvent(new Event("mapchange"));
    };
    marker.addEventListener("mouseenter", activate);
    marker.addEventListener("focus", activate);
    marker.addEventListener("click", activate);
  });

  const countItems = [...document.querySelectorAll("[data-count]")];
  const countAnimations = new WeakMap();
  const countVisible = new WeakSet();
  const stopCount = (element, reset = false) => {
    const frame = countAnimations.get(element);
    if (frame !== undefined) cancelAnimationFrame(frame);
    countAnimations.delete(element);
    if (reset && !reduceMotion) element.textContent = `0${element.dataset.suffix || ""}`;
  };
  const runCount = (element) => {
    stopCount(element);
    const target = Number(element.dataset.count);
    const suffix = element.dataset.suffix || "";
    if (reduceMotion) {
      element.textContent = `${target}${suffix}`;
      return;
    }
    const start = performance.now();
    const duration = 1250;
    element.textContent = `0${suffix}`;
    const tick = (now) => {
      const progressValue = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progressValue, 3);
      element.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progressValue < 1) countAnimations.set(element, requestAnimationFrame(tick));
      else countAnimations.delete(element);
    };
    countAnimations.set(element, requestAnimationFrame(tick));
  };

  if ("IntersectionObserver" in window) {
    const countObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          stopCount(entry.target, true);
          countVisible.delete(entry.target);
        } else if (entry.intersectionRatio >= 0.5 && !countVisible.has(entry.target)) {
          countVisible.add(entry.target);
          runCount(entry.target);
        }
      }),
      { threshold: [0, 0.5] }
    );
    countItems.forEach((item) => countObserver.observe(item));
  } else {
    countItems.forEach(runCount);
  }

  const video = document.querySelector(".project-media video");
  const videoToggle = document.querySelector(".video-toggle");
  if (video && videoToggle) {
    const setVideoState = (playing) => {
      videoToggle.querySelector("span").textContent = playing ? "Ⅱ" : "▶";
      videoToggle.setAttribute("aria-label", playing ? "Призупинити відео" : "Відтворити відео");
    };
    videoToggle.addEventListener("click", () => {
      if (video.paused) {
        video.play().then(() => setVideoState(true)).catch(() => setVideoState(false));
      } else {
        video.pause();
        setVideoState(false);
      }
    });
    video.pause();
    setVideoState(false);
  }

  const form = document.querySelector("[data-form]");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const required = [...form.querySelectorAll("[required]")];
    let valid = true;
    required.forEach((field) => {
      const invalid = !field.value.trim();
      field.closest("label").classList.toggle("is-invalid", invalid);
      if (invalid) valid = false;
    });

    const status = form.querySelector(".form-status");
    const button = form.querySelector(".submit-button");
    if (!valid) {
      status.textContent = "Перевірте обов’язкові поля.";
      form.querySelector(".is-invalid input, .is-invalid select")?.focus();
      return;
    }

    button.disabled = true;
    button.classList.add("is-loading");
    button.querySelector("i").textContent = "◌";
    status.textContent = "Опрацьовуємо запит…";

    window.setTimeout(() => {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.classList.add("is-success");
      button.querySelector("i").textContent = "✓";
      status.textContent = "Дякуємо. Запит сформовано.";
      form.reset();
      window.setTimeout(() => {
        button.classList.remove("is-success");
        button.querySelector("i").textContent = "↗";
      }, 2500);
    }, reduceMotion ? 10 : 850);
  });

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => field.closest("label").classList.remove("is-invalid"));
    field.addEventListener("change", () => field.closest("label").classList.remove("is-invalid"));
  });
})();
