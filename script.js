(() => {
  const FRAME_COUNT = 240;
  const FRAME_W = 1280;   // aspect ratio of the source video
  const FRAME_H = 720;
  const VERSION = 6;      // bump to bust browser cache after re-exporting frames
  const framePath = (i) => `frames1080/f${String(i + 1).padStart(3, "0")}.jpg?v=${VERSION}`;

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const track = document.getElementById("track");
  const stage = document.querySelector(".stage");
  const overlay = document.getElementById("overlay");
  const hit = document.getElementById("hit");
  const brand = document.querySelector(".brand");
  const hintStart = document.getElementById("hintStart");
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loaderBar");
  const loaderText = document.getElementById("loaderText");

  const frames = new Array(FRAME_COUNT);
  let loaded = 0;
  let current = 0;   // smoothed frame position
  let target = 0;    // frame position from scroll
  let drawn = -1;

  // ---------- Preload ----------
  function preload() {
    return new Promise((resolve) => {
      for (let i = 0; i < FRAME_COUNT; i++) {
        const img = new Image();
        img.decoding = "async";
        img.onload = img.onerror = () => {
          loaded++;
          const pct = Math.round((loaded / FRAME_COUNT) * 100);
          loaderBar.style.width = pct + "%";
          loaderText.textContent = pct + "%";
          if (loaded === FRAME_COUNT) resolve();
        };
        img.src = framePath(i);
        frames[i] = img;
      }
    });
  }

  // ---------- Canvas fit (object-fit: cover — always fills the stage) ----------
  // Vertical crop split: 0 = keep the top edge (crop only bottom), 0.5 = center.
  // Low value keeps the compass in the top-left corner visible.
  const ALIGN_Y = 0.5;

  // Works in CSS px or device px alike.
  const fitScale = (w, h) => Math.max(w / FRAME_W, h / FRAME_H);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    canvas.width = Math.round(sw * dpr);
    canvas.height = Math.round(sh * dpr);

    // Make the SVG overlay crop exactly like the canvas
    const s = fitScale(sw, sh);
    const vw = sw / s;
    const vh = sh / s;
    overlay.setAttribute("viewBox", `${(FRAME_W - vw) / 2} ${(FRAME_H - vh) * ALIGN_Y} ${vw} ${vh}`);

    // Cover zooms hard on a phone, so size the wordmark off the stage instead
    // of leaving it at a fixed 68 frame units (~80px on a 390px wide screen).
    const brandPx = Math.max(20, Math.min(sw * 0.08, 68));
    brand.style.fontSize = (brandPx / s).toFixed(2) + "px";
    brand.style.strokeWidth = (brandPx / s * 0.103).toFixed(2) + "px";

    drawn = -1;
    draw(Math.round(current));
  }

  function draw(index) {
    const img = frames[index];
    if (!img || !img.complete || !img.naturalWidth || index === drawn) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = fitScale(cw, ch);
    const w = FRAME_W * scale;
    const h = FRAME_H * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - w) / 2, (ch - h) * ALIGN_Y, w, h);
    drawn = index;
  }

  // ---------- Scroll -> frame ----------
  function progress() {
    const max = track.offsetHeight - window.innerHeight;
    return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
  }

  function onScroll() {
    const p = progress();
    target = p * (FRAME_COUNT - 1);
    hintStart.style.opacity = p > 0.02 ? 0 : 1;
  }

  function tick() {
    current += (target - current) * 0.18;
    if (Math.abs(target - current) < 0.05) current = target;
    const index = Math.round(current);
    draw(index);

    const atEnd = index >= FRAME_COUNT - 3;
    stage.classList.toggle("is-end", atEnd);

    updateSpotlight(atEnd);
    requestAnimationFrame(tick);
  }

  // ---------- Spotlight reveal ----------
  // The fleece only shows inside a soft circle that follows the cursor on
  // desktop and the finger while it stays pressed on touch — same gesture,
  // different input. Screen px, scaled down so it can't swallow a phone screen.
  const spotlightR = () => Math.max(110, Math.min(stage.clientWidth * 0.32, 260));
  const spot = document.getElementById("spot");
  const pointer = { x: -999, y: -999, active: false };
  const smooth = { x: -999, y: -999, r: 0 };

  function toSvgPoint(clientX, clientY) {
    const pt = overlay.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(overlay.getScreenCTM().inverse());
  }

  function updateSpotlight(atEnd) {
    const ctm = overlay.getScreenCTM();
    if (!ctm) return;
    const pxToSvg = 1 / ctm.a;

    const on = atEnd && pointer.active;
    const targetR = on ? spotlightR() * pxToSvg : 0;

    if (pointer.active) {
      const p = toSvgPoint(pointer.x, pointer.y);
      // Jump on first entry so the circle doesn't fly in from off-screen
      if (smooth.r < 1) { smooth.x = p.x; smooth.y = p.y; }
      smooth.x += (p.x - smooth.x) * 0.18;
      smooth.y += (p.y - smooth.y) * 0.18;
    }
    smooth.r += (targetR - smooth.r) * 0.12;
    if (smooth.r < 0.5 && targetR === 0) smooth.r = 0;

    spot.setAttribute("cx", smooth.x.toFixed(1));
    spot.setAttribute("cy", smooth.y.toFixed(1));
    spot.setAttribute("r", smooth.r.toFixed(1));
    stage.classList.toggle("is-revealed", smooth.r > 5);
  }

  // Desktop: plain hover over the stage
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  });
  stage.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.active = false;
  });

  // Touch: press on the map and drag — the fleece follows the finger and fades
  // back out on release. Pointer capture keeps the drag alive outside the
  // outline, and #hit sets touch-action:none so dragging doesn't scroll.
  hit.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    hit.setPointerCapture(e.pointerId);
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    e.preventDefault();
  });
  hit.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || !pointer.active) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    e.preventDefault();
  });
  const endTouch = (e) => {
    if (e.pointerType === "mouse") return;
    pointer.active = false;
  };
  hit.addEventListener("pointerup", endTouch);
  hit.addEventListener("pointercancel", endTouch);

  // ---------- Init ----------
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { passive: true });

  preload().then(() => {
    loader.classList.add("is-done");
    onScroll();
    current = target;
    resize();
    requestAnimationFrame(tick);
  });
})();
