const menu = document.querySelector('[data-menu-toggle]');
const navigation = document.querySelector('#site-navigation');
function closeMenu() {
  menu?.setAttribute('aria-expanded', 'false');
  navigation?.classList.remove('is-open');
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});
navigation?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    closeMenu(); menu.focus();
  }
});
window.matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);

const viewer = document.querySelector('#photo-viewer');
const viewerImage = viewer?.querySelector('img');
const viewerCaption = viewer?.querySelector('figcaption');
for (const button of document.querySelectorAll('[data-photo]')) {
  button.addEventListener('click', () => {
    viewerImage.src = button.dataset.photo;
    viewerImage.alt = button.querySelector('img').alt;
    viewerCaption.textContent = button.dataset.caption;
    viewer.showModal();
  });
}
viewer?.querySelector('[data-close-viewer]').addEventListener('click', () => viewer.close());
viewer?.addEventListener('click', (event) => {
  if (event.target === viewer) {
    const rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  }
});
