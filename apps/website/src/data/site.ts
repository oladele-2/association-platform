export const site = {
  name: 'Nigerian Medical Association, Ogun State Branch',
  shortName: 'NMA Ogun',
  origin: 'https://nmaogun.com.ng',
  portal: 'https://portal.nmaogun.com.ng',
  tenant: 'nmaogun',
} as const;

// Review is a build-time choice. A query string cannot enable it.
export const reviewMode = false;
export const portalLinks = {
  login: `${site.portal}/login`,
  register: `${site.portal}/register`,
  recovery: `${site.portal}/forgot-password`,
};

export const mainLinks = [
  { href: '/about', label: 'About us' },
  { href: '/news', label: 'News & articles' },
  { href: '/executives', label: 'Executives' },
  { href: '/programmes', label: 'Programmes' },
  { href: '/affiliates', label: 'Our affiliates' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/membership', label: 'Membership' },
  { href: '/contact', label: 'Contact' },
];

export const coreRoutes = [
  '/',
  '/about',
  '/executives',
  '/committees',
  '/affiliates',
  '/programmes',
  '/programmes/year-ahead',
  '/physicians-week-2026',
  '/history',
  '/newsletter',
  '/newsletter/2026-third-edition',
  '/research',
  '/facilities',
  '/contact',
  '/gallery',
  '/photobook',
  '/gallery/physicians-week-thanksgiving-2026',
  '/gallery/meeting-life',
  '/gallery/doctors-house',
  '/membership',
  '/privacy',
  '/accessibility',
];
