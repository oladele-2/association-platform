const menu = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const navigation = document.querySelector<HTMLElement>("#site-navigation");
// CSS leaves the navigation visible when JavaScript is unavailable.
document.documentElement.classList.add("js");
function closeMenu() {
  menu?.setAttribute("aria-expanded", "false");
  navigation?.classList.remove("is-open");
}
menu?.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  navigation?.classList.toggle("is-open", open);
});
navigation?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menu?.getAttribute("aria-expanded") === "true"
  ) {
    closeMenu();
    menu.focus();
  }
});
window.matchMedia("(min-width: 1201px)").addEventListener("change", closeMenu);

const viewer = document.querySelector<HTMLDialogElement>("#photo-viewer");
const viewerImage = viewer?.querySelector("img");
const viewerCaption = viewer?.querySelector("figcaption");
let photoOpener: HTMLElement | null = null;
document.querySelectorAll<HTMLAnchorElement>("[data-photo]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!viewer || !viewerImage || !viewerCaption || !link.dataset.photo)
      return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    photoOpener = link;
    viewerImage.src = link.dataset.photo;
    viewerImage.alt = link.querySelector("img")?.alt ?? "";
    viewerCaption.textContent = link.dataset.caption ?? "";
    viewer.showModal();
  });
});
viewer
  ?.querySelector("[data-close-viewer]")
  ?.addEventListener("click", () => viewer.close());
// Close is the viewer's only interactive control; keep keyboard navigation in it.
viewer?.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && viewer.open) {
    event.preventDefault();
    viewer.querySelector<HTMLButtonElement>("[data-close-viewer]")?.focus();
  }
});
viewer?.addEventListener("close", () => photoOpener?.focus());
viewer?.addEventListener("click", (event) => {
  if (event.target !== viewer) return;
  const rect = viewer.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    viewer.close();
});

document
  .querySelectorAll<HTMLFormElement>("[data-directory-search]")
  .forEach((form) => {
    const input = form.querySelector<HTMLInputElement>("input");
    const count = form.querySelector<HTMLElement>("[data-result-count]");
    const target = document.getElementById(form.dataset.directorySearch ?? "");
    const rows = [
      ...(target?.querySelectorAll<HTMLElement>("[data-search-text]") ?? []),
    ];
    form.addEventListener("submit", (event) => event.preventDefault());
    const category = form.querySelector("[data-category-filter]") as
      (HTMLElement & { value: string }) | null;
    const filter = () => {
      const query = (input?.value ?? "").trim().toLocaleLowerCase();
      let visible = 0;
      for (const row of rows) {
        row.hidden =
          !(row.dataset.searchText ?? "").toLocaleLowerCase().includes(query) ||
          Boolean(category?.value && row.dataset.category !== category.value);
        if (!row.hidden) visible++;
      }
      const empty = form.parentElement?.querySelector<HTMLElement>(
        "[data-directory-empty]",
      );
      if (empty) empty.hidden = visible > 0;
      if (count)
        count.textContent = visible
          ? `${visible} ${form.dataset.resultLabel ? form.dataset.resultLabel + (visible === 1 ? "" : "s") : category ? (visible === 1 ? "affiliate" : "affiliates") : visible === 1 ? "entry" : "entries"}`
          : form.dataset.resultLabel === "article"
            ? "No matching articles. Try another title or topic."
            : "No matching entries. Try another name or term.";
    };
    input?.addEventListener("input", filter);
    category?.addEventListener("change", filter);
    form.querySelector("[data-clear-search]")?.addEventListener("click", () => {
      if (input) input.value = "";
      if (category) category.value = "";
      filter();
      input?.focus();
    });
    if (form.dataset.resultLabel === "article" && input) {
      input.value = (new URLSearchParams(window.location.search).get("q") ?? "").slice(0, 160);
      filter();
    }
  });

document.querySelectorAll<HTMLElement>("[data-slideshow]").forEach((carousel) => {
  const slides = [...carousel.querySelectorAll<HTMLElement>("[data-slide]")];
  const dots = [...carousel.querySelectorAll<HTMLButtonElement>("[data-slide-index]")];
  const controls = carousel.querySelector<HTMLElement>("[data-slide-controls]");
  const pause = carousel.querySelector<HTMLButtonElement>("[data-slide-pause]");
  const status = carousel.querySelector<HTMLElement>("[data-slide-status]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (slides.length < 2 || !controls || !pause) return;
  controls.hidden = false;
  let current = 0;
  let paused = reducedMotion.matches;
  let hovered = false;
  let focused = false;
  let visible = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const show = (index: number, announce = false) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    dots.forEach((dot, i) => {
      if (i === current) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    if (announce && status) status.textContent = `Slide ${current + 1} of ${slides.length}: ${slides[current]?.querySelector('.slide-title')?.textContent}`;
  };
  const schedule = () => {
    clearTimeout(timer);
    pause.textContent = paused ? "Play" : "Pause";
    pause.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
    if (!paused && !hovered && !focused && visible && !document.hidden)
      timer = setTimeout(() => { show(current + 1); schedule(); }, 8000);
  };
  const select = (index: number) => { paused = true; show(index, true); schedule(); };
  carousel.querySelector("[data-slide-prev]")?.addEventListener("click", () => select(current - 1));
  carousel.querySelector("[data-slide-next]")?.addEventListener("click", () => select(current + 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => select(i)));
  pause.addEventListener("click", () => { paused = !paused; schedule(); });
  carousel.addEventListener("pointerenter", () => { hovered = true; schedule(); });
  carousel.addEventListener("pointerleave", () => { hovered = false; schedule(); });
  carousel.addEventListener("focusin", () => { focused = true; schedule(); });
  carousel.addEventListener("focusout", (event) => { focused = event.relatedTarget instanceof Node && carousel.contains(event.relatedTarget); schedule(); });
  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); select(current + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  document.addEventListener("visibilitychange", schedule);
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) paused = true; schedule(); });
  new IntersectionObserver(([entry]) => { visible = Boolean(entry?.isIntersecting); schedule(); }).observe(carousel);
  schedule();
});
