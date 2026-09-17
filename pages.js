/* Shared behaviour for the catalogue pages: the "ნახვა" overlay and the
   reveal-on-scroll for the alternating blocks. */
(() => {
  // ---------- Detail overlay ----------
  const detail = document.getElementById("detail");

  if (detail) {
    const stage = detail.querySelector(".detail__stage");
    const mark = stage.querySelector("span");
    const title = detail.querySelector(".detail__cap strong");
    const meta = detail.querySelector(".detail__cap small");
    let lastFocused = null;

    function open(block) {
      const body = block.querySelector(".block__body");
      const media = block.querySelector(".block__media");
      lastFocused = document.activeElement;

      // Carry the block's own placeholder tint over, so the overlay reads as
      // the same piece rather than a generic panel.
      stage.style.setProperty("--a", getComputedStyle(media).getPropertyValue("--a"));
      stage.style.setProperty("--b", getComputedStyle(media).getPropertyValue("--b"));
      mark.textContent = block.querySelector(".block__ph").textContent;

      title.textContent = body.querySelector(".block__name").textContent.trim();
      meta.textContent = [
        body.querySelector(".block__meta")?.textContent.trim(),
        body.querySelector(".block__text")?.textContent.trim(),
      ].filter(Boolean).join(" — ");

      detail.dataset.open = "true";
      document.body.style.overflow = "hidden";
      detail.querySelector(".detail__close").focus();
    }

    function close() {
      detail.dataset.open = "false";
      document.body.style.overflow = "";
      lastFocused?.focus();
    }

    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => open(btn.closest(".block")));
    });

    detail.querySelector(".detail__close").addEventListener("click", close);
    detail.addEventListener("click", (e) => {
      if (e.target === detail) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && detail.dataset.open === "true") close();
    });
  }

  // ---------- Reveal on scroll ----------
  const blocks = document.querySelectorAll(".block");
  if (!blocks.length) return;

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) {
    blocks.forEach((b) => b.classList.add("is-in"));
    return;
  }

  blocks.forEach((b) => b.classList.add("will-reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

  blocks.forEach((b) => io.observe(b));
})();
