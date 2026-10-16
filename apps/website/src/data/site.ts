export const site = {
  name: 'Nigerian Medical Association, Ogun State Branch',
  shortName: 'NMA Ogun',
  origin: 'https://nmaogun.com.ng',
  portal: 'https://portal.nmaogun.com.ng',
  tenant: 'nmaogun',
} as const;

// Review is a build-time choice. A query string cannot enable it.
export const reviewMode = import.meta.env.MODE === 'review';
export const portalLinks = {
  login: `${site.portal}/login`,
  register: `${site.portal}/register`,
  recovery: `${site.portal}/forgot-password`,
};

export const mainLinks = [
  { href: '/about', label: 'About us' },
  ...(reviewMode ? [{ href: '/leadership', label: 'Leadership' }] : []),
  { href: '/programmes', label: 'Programmes' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/membership', label: 'Membership' },
  ...(reviewMode ? [{ href: '/contact', label: 'Contact' }] : []),
];

export const coreRoutes = [
  '/',
  '/about',
  '/programmes',
  '/gallery',
  '/gallery/meeting-life',
  '/gallery/doctors-house',
  '/membership',
  '/privacy',
  '/accessibility',
];
