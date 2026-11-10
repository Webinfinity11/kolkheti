/* Shared behaviour for the catalogue pages: content from /admin, the detail
   sheet, reveal on scroll, and the scroll progress line in the header. */
(() => {
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Content ----------
  // The HTML ships with the original copy, so the page reads fine before (or
  // without) this; once /api/content answers, the admin's version replaces it.
  const page = document.body.dataset.page;
  const slot = (name) => document.querySelector(`[data-c="${name}"]`);

  function card(it, i) {
    const no = String(i + 1).padStart(2, "0");
    const mark = ROMAN[i] || String(i + 1);
    const pic = it.image
      ? `<img class="card__img" src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy">`
      : `<div class="card__ph">${mark}</div>`;
    return `
      <article class="card" style="--a:${esc(it.a)}; --b:${esc(it.b)}">
        <div class="card__frame">
          ${pic}
          <span class="tag card__no">${no}</span>
        </div>
        <div class="card__body">
          <h2 class="card__name">${esc(it.name)}</h2>
          <div class="card__rule"></div>
          ${it.medium ? `<p class="tag card__medium">${esc(it.medium)}</p>` : ""}
          ${it.note ? `<p class="card__note">${esc(it.note)}</p>` : ""}
          <button class="card__cta" type="button" data-view data-mark="${mark}">View</button>
        </div>
      </article>`;
  }

  function render(c) {
    const s = c[page];
    if (!s) return;
    const set = (name, text) => { const el = slot(name); if (el) el.textContent = text; };
    set("tag", s.tag);
    set("title", s.title);
    set("intro", s.intro);
    set("closingTitle", s.closingTitle);
    set("closingText", s.closingText);
    const meta = slot("meta");
    if (meta) meta.innerHTML = s.meta.map((m) => `<span><b>${esc(m.value)}</b>${esc(m.label)}</span>`).join("");
    const items = slot("items");
    if (items) items.innerHTML = s.items.map(card).join("");
    const mail = slot("email");
    if (mail && c.contact?.email) mail.href = "mailto:" + c.contact.email;
    document.title = `${s.title} — MAISON KOLKHETI`;
  }

  const ready = page
    ? fetch("/api/content").then((r) => (r.ok ? r.json() : null)).then((c) => c && render(c)).catch(() => {})
    : Promise.resolve();

  // ---------- Detail sheet ----------
  const detail = document.getElementById("detail");

  if (detail) {
    const frame = detail.querySelector(".detail__frame");
    const mark = frame.querySelector("span");
    const title = detail.querySelector(".detail__body strong");
    const note = detail.querySelector(".detail__body small");
    const close = detail.querySelector(".detail__close");
    let lastFocused = null;

    function open(card) {
      lastFocused = document.activeElement;

      // Carry the card's own tint (or photo) over so the sheet reads as the
      // same piece rather than a generic panel.
      const tint = getComputedStyle(card);
      frame.style.setProperty("--a", tint.getPropertyValue("--a"));
      frame.style.setProperty("--b", tint.getPropertyValue("--b"));
      frame.querySelector("img")?.remove();
      const img = card.querySelector(".card__img");
      if (img) {
        const big = document.createElement("img");
        big.src = img.src;
        big.alt = img.alt;
        frame.prepend(big);
        mark.textContent = "";
      } else {
        mark.textContent = card.querySelector(".card__ph")?.textContent.trim() || "";
      }

      title.textContent = card.querySelector(".card__name").textContent.trim();
      note.textContent = [
        card.querySelector(".card__medium")?.textContent.trim(),
        card.querySelector(".card__note")?.textContent.trim(),
      ].filter(Boolean).join(" · ");

      detail.dataset.open = "true";
      document.body.style.overflow = "hidden";
      close.focus();
    }

    function hide() {
      detail.dataset.open = "false";
      document.body.style.overflow = "";
      lastFocused?.focus();
    }

    // Delegated, because the cards are re-rendered once content arrives
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (btn) open(btn.closest(".card"));
    });

    close.addEventListener("click", hide);
    detail.addEventListener("click", (e) => {
      if (e.target === detail) hide();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && detail.dataset.open === "true") hide();
    });
  }

  // ---------- Scroll progress ----------
  const progress = document.querySelector(".progress");
  if (progress) {
    let ticking = false;
    const paint = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      progress.style.setProperty("--p", (p * 100).toFixed(2) + "%");
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });
    paint();
    ready.then(paint);
  }

  // ---------- Reveal on scroll ----------
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove("will-reveal");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  // Start after the content swap so the new cards are the ones that reveal
  ready.then(() => {
    document.querySelectorAll(".card").forEach((c) => {
      c.classList.add("will-reveal");
      io.observe(c);
    });
  });
})();
