/* Social links pinned to the bottom-left corner of every page. The addresses
   come from /admin; an icon without one is shown but does not link anywhere. */
(() => {
  const TIKTOK = "M14.2 3h2.7c.2 2.2 1.6 3.8 3.8 4v2.8c-1.4 0-2.7-.4-3.8-1.2v6.3a5.7 5.7 0 1 1-5.7-5.7h.6v2.9a2.9 2.9 0 1 0 2.4 2.8z";
  const ICONS = {
    facebook: ["Facebook", '<path d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21z"/>'],
    instagram: ["Instagram", '<g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.8"/></g><circle cx="16.8" cy="7.2" r="1.2"/>'],
    tiktok: ["TikTok", `<path d="${TIKTOK}" fill="#25f4ee" transform="translate(-.9 -.6)"/><path d="${TIKTOK}" fill="#fe2c55" transform="translate(.9 .6)"/><path d="${TIKTOK}" fill="#fff"/>`],
    x: ["X", '<path d="M17.8 3.5h3l-6.6 7.5 7.7 9.5h-6l-4.7-5.9-5.4 5.9h-3l7-7.7L2.4 3.5h6.2l4.2 5.4zm-1 15.3h1.7L7.7 5.1H5.9z"/>'],
  };

  const nav = document.createElement("nav");
  nav.className = "social";
  nav.setAttribute("aria-label", "Social media");
  nav.innerHTML = Object.entries(ICONS)
    .map(([key, [name, svg]]) =>
      `<a class="social__${key}" data-s="${key}" aria-label="${name}" title="${name}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${svg}</svg></a>`)
    .join("");
  document.body.append(nav);

  fetch("/api/content")
    .then((r) => (r.ok ? r.json() : null))
    .then((c) => {
      nav.querySelectorAll("[data-s]").forEach((a) => {
        const link = c?.social?.[a.dataset.s];
        if (!link) return;
        a.href = link;
        a.target = "_blank";
        a.rel = "noopener";
      });
    })
    .catch(() => {});
})();
