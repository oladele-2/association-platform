/** Demo content used when the public API is unreachable (local first paint / review). */

export type NewsItem = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  cover: string;
  body: string;
};

export type EventItem = {
  slug: string;
  title: string;
  venue: string;
  startsAt: string;
  excerpt: string;
  cover: string;
};

export type Executive = {
  name: string;
  role: string;
  photo: string;
};

export type Committee = {
  slug: string;
  name: string;
  description: string;
};

export const demoNews: NewsItem[] = [
  {
    slug: 'gateway-2025-welcome',
    title: 'Welcome to Gateway 2025 — NEC Meeting in Abeokuta',
    excerpt:
      'NMA Ogun State Branch welcomes delegates to the National Executive Council meeting under the theme “Beyond Crossroads.”',
    publishedAt: '2025-09-12',
    cover: '/images/leadership-meeting.jpg',
    body: `On behalf of the Nigerian Medical Association, Ogun State Branch, we welcome all delegates to Abeokuta for Gateway 2025.

The theme — Beyond Crossroads: Unlocking Health System Potential Through Partnerships — reflects our commitment to collaboration, innovation, and resilience in healthcare delivery.`,
  },
  {
    slug: 'doctors-house-secretariat',
    title: 'Doctors’ House remains the hub of branch activity',
    excerpt:
      'Meetings, CPD sessions, and member welfare engagements continue at the Ogun State secretariat in Abeokuta.',
    publishedAt: '2025-08-20',
    cover: '/images/doctors-house.jpg',
    body: `Doctors’ House is more than an office — it is where Ogun doctors organise, advocate, and support one another.

From committee sittings to member briefings, the secretariat remains open and active throughout the year.`,
  },
  {
    slug: 'member-welfare-priority',
    title: 'Member welfare remains a core priority',
    excerpt:
      'Continuing professional development, advocacy, and ethical practice guide the branch agenda.',
    publishedAt: '2025-07-04',
    cover: '/images/meeting.jpg',
    body: `Our mission centres on qualitative healthcare delivery through CPD, advocacy, policy engagement, and public education — always alongside partners in health.`,
  },
];

export const demoEvents: EventItem[] = [
  {
    slug: 'gateway-2025',
    title: 'NMA NEC Meeting — Gateway 2025',
    venue: 'Abeokuta, Ogun State',
    startsAt: '2025-11-15T09:00:00+01:00',
    excerpt: 'National gathering of medical leaders: keynotes, panels, workshops, and networking.',
    cover: '/images/leadership-meeting.jpg',
  },
  {
    slug: 'state-general-meeting',
    title: 'State General Meeting',
    venue: "Doctors' House, Abeokuta",
    startsAt: '2026-02-14T10:00:00+01:00',
    excerpt: 'Quarterly state meeting for members — updates, welfare, and branch resolutions.',
    cover: '/images/meeting.jpg',
  },
];

export const demoExecutives: Executive[] = [
  {
    name: 'Dr. Ogunjimi Luqman',
    role: 'Chairman',
    photo: '/images/logo-signage.jpeg',
  },
  {
    name: 'To be updated via CMS',
    role: 'Vice Chairman',
    photo: '/images/gallery-2.jpg',
  },
  {
    name: 'To be updated via CMS',
    role: 'Secretary',
    photo: '/images/gallery-3.jpg',
  },
  {
    name: 'To be updated via CMS',
    role: 'Treasurer',
    photo: '/images/gallery-4.jpg',
  },
];

export const demoPastExecutives: Executive[] = [
  {
    name: 'Past Chairman (CMS)',
    role: 'Chairman — prior tenure',
    photo: '/images/gallery-5.jpg',
  },
  {
    name: 'Past Secretary (CMS)',
    role: 'Secretary — prior tenure',
    photo: '/images/gallery-6.jpg',
  },
];

export const demoCommittees: Committee[] = [
  {
    slug: 'education',
    name: 'Education & CPD Committee',
    description: 'Coordinates continuing professional development and scientific programmes.',
  },
  {
    slug: 'welfare',
    name: 'Welfare Committee',
    description: 'Supports member welfare initiatives and emergency assistance frameworks.',
  },
  {
    slug: 'publicity',
    name: 'Publicity & Publications',
    description: 'Manages branch communications, circulars, and public education.',
  },
];

export const demoGallery = Array.from({ length: 21 }, (_, i) => ({
  id: `g-${i + 1}`,
  src: `/images/gallery-${i + 1}.jpg`,
  alt: `NMA Ogun gallery photo ${i + 1}`,
}));

export const demoDownloads = [
  {
    title: 'Membership information leaflet',
    note: 'PDF — replace with CMS download when published',
  },
  {
    title: 'Gateway 2025 programme synopsis',
    note: 'PDF — replace with CMS download when published',
  },
];
