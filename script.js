(() => {
  const FRAME_COUNT = 240;
  const FRAME_W = 1280;   // aspect ratio of the source video
  const FRAME_H = 720;
  const VERSION = 7;      // bump to bust browser cache after re-exporting frames
  // Phones never show the frame much wider than ~1100 device px, so they get
  // the 1280px set; everything else gets the full 1920px one.
  const small = Math.min(screen.width, screen.height) <= 500;
  const FRAME_DIR = small ? "frames-m" : "frames";
  const framePath = (i) => `${FRAME_DIR}/f${String(i + 1).padStart(3, "0")}.webp?v=${VERSION}`;

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const track = document.getElementById("track");
  const stage = document.querySelector(".stage");
  const overlay = document.getElementById("overlay");
  const hit = document.getElementById("hit");
  const brand = document.querySelector(".brand");
  const lore = document.getElementById("lore");
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
  // Frames arrive coarse-to-fine: every 8th first, then every 4th, and so on,
  // so the whole scroll is scrubbable early and only gets smoother. The loader
  // only waits for that first coarse pass (plus the last frame, the map);
  // the rest stream in behind it and draw() uses the nearest loaded frame.
  const order = [];
  for (let step = 8; step >= 1; step /= 2) {
    for (let i = 0; i < FRAME_COUNT; i += step) {
      if (!order.includes(i)) order.push(i);
    }
  }
  order.splice(order.indexOf(FRAME_COUNT - 1), 1);
  order.splice(Math.ceil(FRAME_COUNT / 8), 0, FRAME_COUNT - 1);
  const FIRST_PASS = Math.ceil(FRAME_COUNT / 8) + 1;
  const PARALLEL = 6;

  function preload() {
    return new Promise((resolve) => {
      let next = 0;
      const load = () => {
        if (next >= order.length) return;
        const i = order[next++];
        const img = new Image();
        img.decoding = "async";
        img.onload = img.onerror = () => {
          loaded++;
          if (loaded <= FIRST_PASS) {
            const pct = Math.round((loaded / FIRST_PASS) * 100);
            loaderBar.style.width = pct + "%";
            loaderText.textContent = pct + "%";
            if (loaded === FIRST_PASS) resolve();
          }
          load();
        };
        img.src = framePath(i);
        frames[i] = img;
      };
      for (let k = 0; k < PARALLEL; k++) load();
    });
  }

  const ready = (img) => img && img.complete && img.naturalWidth;

  // Closest frame that has already arrived
  function nearestLoaded(index) {
    for (let d = 0; d < FRAME_COUNT; d++) {
      if (ready(frames[index - d])) return index - d;
      if (ready(frames[index + d])) return index + d;
    }
    return -1;
  }

  // ---------- Viewport lock ----------
  // --vh is the tallest viewport we have seen at this width — the largest the
  // page gets once a mobile address bar is out of the way. It only ever grows,
  // so a bar sliding in and out can never resize the stage mid-scroll; a real
  // resize (width change or orientation flip) resets the measurement.
  let lockedH = 0;
  let lockedW = window.innerWidth;

  function lockViewport(reset) {
    lockedH = reset ? window.innerHeight : Math.max(lockedH, window.innerHeight);
    lockedW = window.innerWidth;
    document.documentElement.style.setProperty("--vh", lockedH / 100 + "px");
  }

  lockViewport(true);

  // ---------- Canvas fit ----------
  // Where the vertical crop falls. Centring it cut the top off the compass
  // rose while leaving dead space under the GEORGIA caption, so instead of a
  // fixed split we work out an offset that keeps both in frame: everything
  // from the top of the compass "N" down to the bottom of the caption.
  const SAFE_TOP = 30;      // top of the compass "N"
  const SAFE_BOTTOM = 645;  // bottom of the GEORGIA caption

  // vh = how much of the frame's 720 units the viewport actually shows.
  // Returns the crop split: 0 keeps the top edge, 1 keeps the bottom edge.
  function alignY(vh) {
    const slack = FRAME_H - vh;
    if (slack <= 0.5) return 0.5;               // nothing cropped vertically

    const lowest = Math.max(0, SAFE_BOTTOM - vh);  // any lower loses the caption
    const highest = Math.min(SAFE_TOP, slack);     // any higher loses the compass
    // Sit midway between the two limits for even margins; if the viewport is
    // too short to hold both, fall back to centring the frame.
    const offset = lowest <= highest ? (lowest + highest) / 2 : slack / 2;
    return offset / slack;
  }

  // Bounding box of the Georgia constellation in frame coordinates, plus the
  // breathing room we want around it. Plain "cover" on a 9:19.5 phone zooms so
  // hard that the western tip falls off the left edge, so the zoom is capped at
  // whatever still keeps this box on screen. Anything the frame then leaves
  // uncovered is filled with a blurred blow-up of itself — no black bands.
  const MAP = { w: 777, h: 373 };
  const MAP_MARGIN = 1.18;
  const SAFE_W = MAP.w * MAP_MARGIN;
  const SAFE_H = MAP.h * MAP_MARGIN;

  // Works in CSS px or device px alike.
  function fitScale(w, h) {
    const cover = Math.max(w / FRAME_W, h / FRAME_H);
    return Math.min(cover, w / SAFE_W, h / SAFE_H);
  }

  // Tiny offscreen copy of the frame, blown back up for the backdrop — far
  // cheaper per frame than ctx.filter = "blur(...)" and works everywhere.
  const backdrop = document.createElement("canvas");
  backdrop.width = 48;
  backdrop.height = Math.round(48 * FRAME_H / FRAME_W);
  const bctx = backdrop.getContext("2d");

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
    overlay.setAttribute("viewBox", `${(FRAME_W - vw) / 2} ${(FRAME_H - vh) * alignY(vh)} ${vw} ${vh}`);

    // Cover zooms hard on a phone, so size the wordmark off the stage instead
    // of leaving it at a fixed 68 frame units (~80px on a 390px wide screen).
    const brandPx = Math.max(20, Math.min(sw * 0.08, 68));
    brand.style.fontSize = (brandPx / s).toFixed(2) + "px";
    brand.style.strokeWidth = (brandPx / s * 0.103).toFixed(2) + "px";

    // Map lettering: ~15px on a desktop, never under 10px on a phone
    const lorePx = Math.max(10, Math.min(sw * 0.0105, 15));
    lore.style.fontSize = (lorePx / s).toFixed(2) + "px";

    drawn = -1;
    draw(Math.round(current));
  }

  function draw(wanted) {
    const index = nearestLoaded(wanted);
    if (index < 0 || index === drawn) return;
    const img = frames[index];
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = fitScale(cw, ch);
    const w = FRAME_W * scale;
    const h = FRAME_H * scale;
    const ay = alignY(ch / scale);
    const x = (cw - w) / 2;
    const y = (ch - h) * ay;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);

    // The frame stops short of an edge (portrait screens): bleed a dimmed,
    // blurred copy out to the edges instead of leaving black bands.
    if (x > 0.5 || y > 0.5) {
      bctx.drawImage(img, 0, 0, backdrop.width, backdrop.height);
      const bs = Math.max(cw / FRAME_W, ch / FRAME_H);
      const bw = FRAME_W * bs;
      const bh = FRAME_H * bs;
      ctx.drawImage(backdrop, (cw - bw) / 2, (ch - bh) * ay, bw, bh);
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, cw, ch);
    }

    ctx.drawImage(img, x, y, w, h);
    drawn = index;
  }

  // ---------- Scroll -> frame ----------
  function progress() {
    const max = track.offsetHeight - lockedH;
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
  const pointer = { x: -999, y: -999, active: false, touch: false };
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
  // outline once it has started.
  hit.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    hit.setPointerCapture(e.pointerId);
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    pointer.touch = true;
  });
  hit.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || !pointer.touch) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });
  const endTouch = (e) => {
    if (e.pointerType === "mouse") return;
    pointer.active = false;
    pointer.touch = false;
  };
  hit.addEventListener("pointerup", endTouch);
  hit.addEventListener("pointercancel", endTouch);

  // touch-action on an SVG child is ignored by Chrome and Safari, so the page
  // kept scrolling under the finger. Cancel the scroll here instead — only for
  // the duration of a reveal drag, so ordinary scrolling is untouched.
  document.addEventListener("touchmove", (e) => {
    if (pointer.touch) e.preventDefault();
  }, { passive: false });

  // ---------- Init ----------
  function onResize() {
    const widthChanged = window.innerWidth !== lockedW;
    const touch = window.matchMedia("(hover: none)").matches;

    // On touch, same width and a shorter viewport is browser chrome sliding in,
    // not a resize. Leave everything exactly where it is. A desktop window
    // always gets the exact new height.
    if (touch && !widthChanged && window.innerHeight <= lockedH) return;

    lockViewport(widthChanged || !touch);
    resize();
    onScroll();
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", () => setTimeout(onResize, 120));
  window.addEventListener("scroll", onScroll, { passive: true });

  preload().then(() => {
    loader.classList.add("is-done");
    onScroll();
    current = target;
    resize();
    requestAnimationFrame(tick);
  });
})();
