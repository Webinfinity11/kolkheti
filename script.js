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

  // ---------- Canvas (object-fit: cover) ----------
  // Vertical crop split: 0 = keep the top edge (crop only bottom), 0.5 = center.
  // Low value keeps the compass in the top-left corner visible.
  const ALIGN_Y = 0.5;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    canvas.width = Math.round(sw * dpr);
    canvas.height = Math.round(sh * dpr);

    // Make the SVG overlay crop exactly like the canvas
    const s = Math.max(sw / FRAME_W, sh / FRAME_H);
    const vw = sw / s;
    const vh = sh / s;
    overlay.setAttribute("viewBox", `${(FRAME_W - vw) / 2} ${(FRAME_H - vh) * ALIGN_Y} ${vw} ${vh}`);

    drawn = -1;
    draw(Math.round(current));
  }

  function draw(index) {
    const img = frames[index];
    if (!img || !img.complete || !img.naturalWidth || index === drawn) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / FRAME_W, ch / FRAME_H);
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
    if (!atEnd) tapRevealed = false;

    updateSpotlight(atEnd);
    requestAnimationFrame(tick);
  }

  // ---------- Cursor spotlight reveal ----------
  const SPOTLIGHT_R = 260;   // screen px
  const spot = document.getElementById("spot");
  const mouse = { x: -999, y: -999, inside: false };
  const smooth = { x: -999, y: -999, r: 0 };
  let tapRevealed = false;

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

    let targetR = 0;
    if (atEnd && tapRevealed) targetR = 2000;
    else if (atEnd && mouse.inside) targetR = SPOTLIGHT_R * pxToSvg;

    if (mouse.inside) {
      const p = toSvgPoint(mouse.x, mouse.y);
      // Jump on first entry so the circle doesn't fly in from off-screen
      if (smooth.r < 1) { smooth.x = p.x; smooth.y = p.y; }
      smooth.x += (p.x - smooth.x) * 0.1;
      smooth.y += (p.y - smooth.y) * 0.1;
    }
    smooth.r += (targetR - smooth.r) * (tapRevealed ? 0.06 : 0.12);
    if (smooth.r < 0.5 && targetR === 0) smooth.r = 0;

    spot.setAttribute("cx", smooth.x.toFixed(1));
    spot.setAttribute("cy", smooth.y.toFixed(1));
    spot.setAttribute("r", smooth.r.toFixed(1));
    stage.classList.toggle("is-revealed", smooth.r > 5);
  }

  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.inside = true;
  });
  stage.addEventListener("pointerleave", () => { mouse.inside = false; });

  // Touch: tap the map to reveal the whole fleece
  hit.addEventListener("pointerup", (e) => {
    if (e.pointerType === "mouse") return;
    const p = toSvgPoint(e.clientX, e.clientY);
    smooth.x = p.x;
    smooth.y = p.y;
    tapRevealed = !tapRevealed;
  });

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
