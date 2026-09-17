/* Shared behaviour for the catalogue pages: the detail sheet, reveal on
   scroll, and the scroll progress line in the header. */
(() => {
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

      // Carry the card's own tint over so the sheet reads as the same piece
      // rather than a generic panel.
      const tint = getComputedStyle(card.querySelector(".card__ph"));
      frame.style.setProperty("--a", tint.getPropertyValue("--a"));
      frame.style.setProperty("--b", tint.getPropertyValue("--b"));
      mark.textContent = card.querySelector(".card__ph").textContent.trim();

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

    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => open(btn.closest(".card")));
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
  }

  // ---------- Reveal on scroll ----------
  const cards = document.querySelectorAll(".card");
  if (!cards.length) return;

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) return;

  cards.forEach((c) => c.classList.add("will-reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove("will-reveal");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  cards.forEach((c) => io.observe(c));
})();
