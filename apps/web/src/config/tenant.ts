/**
 * Demo tenant defaults (first client preview).
 * Override branding fields via env where possible; keep org copy in this config
 * only for local/demo builds with PUBLIC_USE_DEMO_FALLBACK=true.
 */
export const tenant = {
  slug: import.meta.env.PUBLIC_ORG_SLUG ?? 'nma-ogun',
  /** Short brand lockup used in chrome (hero / header / footer). */
  shortName: 'NMA Ogun',
  displayName: 'NMA Ogun State',
  legalName: 'Nigerian Medical Association — Ogun State Branch',
  tagline: 'Advancing healthcare. Protecting members. Serving Ogun State.',
  heroHeadline: 'The professional home of doctors in Ogun State.',
  established: '1960',
  email: 'info@nmaogun.com.ng',
  phone: '+234 803 000 0000',
  address: "Doctors' House, Abeokuta, Ogun State, Nigeria",
  portalUrl: import.meta.env.PUBLIC_PORTAL_URL ?? 'http://localhost:5173',
  apiUrl: import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000',
  /**
   * When true, unreachable/empty public API responses fall back to `src/data/demo.ts`.
   * Production builds should leave this unset/false so empty CMS does not bake demo copy.
   */
  useDemoFallback:
    String(import.meta.env.PUBLIC_USE_DEMO_FALLBACK ?? '')
      .trim()
      .toLowerCase() === 'true',
  social: {
    facebook: '#',
    twitter: '#',
    instagram: '#',
  },
  colors: {
    green: '#0b6b3a',
    greenDeep: '#064528',
    greenSoft: '#e7f3ec',
    red: '#c8102e',
    ink: '#132018',
    mist: '#f4f7f5',
    sand: '#dfe8e2',
  },
  vision:
    'To become a formidable professional body committed to fostering effective and efficient health care delivery with high ethical standards and protecting the interest of its members.',
  mission:
    'To build a sustainable professional association of medical and dental practitioners that will advance the delivery of qualitative health care services through continuing professional development, advocacy and policy development, knowledge management and public education, in collaboration with other collaborating partners in health.',
  values: [
    'High Ethical Standards of Practice',
    'Welfare of Members',
    'Compassionate Service',
    'Integrity',
    'Professionalism and Excellence',
  ],
  images: {
    logo: '/images/logo-lockup.png',
    logoSignage: '/images/logo-signage.jpeg',
    hero: '/images/doctors-house.jpg',
    about: '/images/secretariat-wing.jpg',
    meeting: '/images/meeting.jpg',
    leadership: '/images/leadership-meeting.jpg',
    vision: '/images/vision-plaque.jpeg',
  },
} as const;

export type TenantConfig = typeof tenant;
