/* Shared behaviour for the catalogue pages: the "ნახვა" overlay and the
   reveal-on-scroll for the works on the wall. */
(() => {
  // ---------- Detail overlay ----------
  const detail = document.getElementById("detail");

  if (detail) {
    const frame = detail.querySelector(".detail__frame");
    const mark = frame.querySelector("span");
    const title = detail.querySelector(".detail__label strong");
    const note = detail.querySelector(".detail__label small");
    const close = detail.querySelector(".detail__close");
    let lastFocused = null;

    function open(work) {
      lastFocused = document.activeElement;

      // Carry the work's own tint over so the overlay reads as the same piece
      // rather than a generic panel.
      const tint = getComputedStyle(work.querySelector(".work__frame"));
      frame.style.setProperty("--a", tint.getPropertyValue("--a"));
      frame.style.setProperty("--b", tint.getPropertyValue("--b"));
      mark.textContent = work.querySelector(".work__ph").textContent;

      title.textContent = work.querySelector(".work__name").textContent.trim();
      note.textContent = [
        work.querySelector(".work__medium")?.textContent.trim(),
        work.querySelector(".work__note")?.textContent.trim(),
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
      btn.addEventListener("click", () => open(btn.closest(".work")));
    });

    close.addEventListener("click", hide);
    detail.addEventListener("click", (e) => {
      if (e.target === detail) hide();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && detail.dataset.open === "true") hide();
    });
  }

  // ---------- Reveal on scroll ----------
  const works = document.querySelectorAll(".work");
  if (!works.length) return;

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) {
    works.forEach((w) => w.classList.add("is-in"));
    return;
  }

  works.forEach((w) => w.classList.add("will-reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });

  works.forEach((w) => io.observe(w));
})();
