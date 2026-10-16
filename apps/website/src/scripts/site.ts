const menu = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const navigation = document.querySelector<HTMLElement>('#site-navigation');
// CSS leaves the navigation visible when JavaScript is unavailable.
document.documentElement.classList.add('js');
function closeMenu() {
  menu?.setAttribute('aria-expanded', 'false');
  navigation?.classList.remove('is-open');
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  navigation?.classList.toggle('is-open', open);
});
navigation?.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});
window.matchMedia('(min-width: 1101px)').addEventListener('change', closeMenu);

const viewer = document.querySelector<HTMLDialogElement>('#photo-viewer');
const viewerImage = viewer?.querySelector('img');
const viewerCaption = viewer?.querySelector('figcaption');
let photoOpener: HTMLElement | null = null;
document.querySelectorAll<HTMLAnchorElement>('[data-photo]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (!viewer || !viewerImage || !viewerCaption || !link.dataset.photo) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    photoOpener = link;
    viewerImage.src = link.dataset.photo;
    viewerImage.alt = link.querySelector('img')?.alt ?? '';
    viewerCaption.textContent = link.dataset.caption ?? '';
    viewer.showModal();
  });
});
viewer?.querySelector('[data-close-viewer]')?.addEventListener('click', () => viewer.close());
// Close is the viewer's only interactive control; keep keyboard navigation in it.
viewer?.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && viewer.open) {
    event.preventDefault();
    viewer.querySelector<HTMLButtonElement>('[data-close-viewer]')?.focus();
  }
});
viewer?.addEventListener('close', () => photoOpener?.focus());
viewer?.addEventListener('click', (event) => {
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

document.querySelectorAll<HTMLFormElement>('[data-directory-search]').forEach((form) => {
  const input = form.querySelector<HTMLInputElement>('input');
  const count = form.querySelector<HTMLElement>('[data-result-count]');
  const target = document.getElementById(form.dataset.directorySearch ?? '');
  const rows = [...(target?.querySelectorAll<HTMLElement>('[data-search-text]') ?? [])];
  form.addEventListener('submit', (event) => event.preventDefault());
  input?.addEventListener('input', () => {
    const query = input.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const row of rows) {
      row.hidden = !(row.dataset.searchText ?? '').toLocaleLowerCase().includes(query);
      if (!row.hidden) visible++;
    }
    if (count)
      count.textContent = visible
        ? `${visible} ${visible === 1 ? 'entry' : 'entries'}`
        : 'No matching entries. Try another name or term.';
  });
});
