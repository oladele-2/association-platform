export const lagosDay = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));

export const physiciansWeek = {
  title: 'Physicians’ Week 2026', start: '2026-10-18', end: '2026-10-24',
  agenda: [
    { date: '2026-10-18', title: 'Thanksgiving' },
    { date: '2026-10-19', title: 'Press conference' },
    { date: '2026-10-20', title: 'Courtesy visits' },
    { date: '2026-10-21', title: 'Medical outreach' },
    { date: '2026-10-22', title: 'Scientific conference / Ordinary General Meeting' },
    { date: '2026-10-23', title: 'Thanksgiving Jumaat' },
    { date: '2026-10-24', title: 'Run and Rhythm — breast cancer awareness' },
  ],
};
export function physiciansWeekState(now = new Date()) {
  const day = lagosDay(now);
  return day < physiciansWeek.start ? 'upcoming' : day > physiciansWeek.end ? 'past' : 'current';
}
// Input is the validated, approved public release, never a portal member feed.
export function selectNewsletterEditions(publication) {
  return publication.entries.filter(entry => entry.kind === 'resource' && /\b(newsletter|bulletin)\b/i.test(entry.content.title))
    .filter(entry => publication.media.some(media => entry.content.mediaIds.includes(media.id) && media.mime === 'application/pdf'))
    .sort((a, b) => b.content.date.localeCompare(a.content.date) || b.publishedAt.localeCompare(a.publishedAt));
}

// Public names and recorded terms only. Transcribed from the existing checked
// leadership.md extract of PAST EXECUTIVES - Sheet1.pdf; no phone columns.
// Incomplete 1985 and ambiguous 2008–2010 rows await reconciliation and are omitted.
export const pastLeadership = [
  { term: '1979–1980', chairman: 'Late Dr A.A. Adeoye' },
  { term: '1980–1982', chairman: 'Dr Akin Majekodunmi' },
  { term: '1982–1984', chairman: 'Dr Kola Sobanjo' },
  { term: '1988–1990', chairman: 'Dr Abiodun Akinola', secretary: 'Dr Korede Alabi' },
  { term: '1990–1992', chairman: 'Dr Sola Sonubi' },
  { term: '1992–1994', chairman: 'Dr (Mrs.) Akindele' },
  { term: '1994–1995', chairman: 'Dr Oluwole', secretary: 'Dr Fadiji Paul Abiodun' },
  { term: '1996–1998', chairman: 'Dr J.O. Shobanjo' },
  { term: '1999–2002', chairman: 'Dr Soremekun Ibikunle Bankole', secretary: 'Dr Soji Akinleye' },
  { term: '2002–2004', chairman: 'Dr Adewoye Rotimi', secretary: 'Dr Oladimeji A.O.' },
  { term: '2004–2006', chairman: 'Dr Akindele Nurud-din Oladipupo', secretary: 'Dr Agboola Deji' },
  { term: '2006–2008', chairman: 'Dr Oladimeji A.O.' },
  { term: '2010–2012', chairman: 'Dr Alayaki Adewunmi', secretary: 'Dr Yusuff Quddus Adegboyega' },
  { term: '2012–2014', chairman: 'Dr Jagun Olusoji Edward', secretary: 'Dr Anjorin Oluseyi' },
  { term: '2014–2016', chairman: 'Dr Odewabi Adenike', secretary: 'Dr Ayoola Zaheed' },
  { term: '2016–2018', chairman: 'Dr Olajide Abayomi', secretary: 'Dr Akinsanya Gaffar' },
  { term: '2018–2020', chairman: 'Dr Lawal Ismail', secretary: 'Dr Jimoh Ahmed' },
  { term: '2020–2022', chairman: 'Dr Ogunlaja Dayo', secretary: 'Dr Aderinwale Oluseyi' },
  { term: '2022–2024', chairman: 'Dr Ashimi Azim Adekunle', secretary: 'Dr Adetonwa Festus' },
  { term: '2024–2026', chairman: 'Dr Ogunjimi Luqman', secretary: 'Dr Osikoya Dotun' },
];

export const memberBenefits = [
  { title: 'Keep your profile current', text: 'Maintain your professional details and photograph in one place.', href: '/portal/profile', action: 'Manage your profile' },
  { title: 'Understand your dues', text: 'Review fee schedules and your statement, upload payment evidence and follow its review status.', href: '/portal/dues', action: 'View dues & payments' },
  { title: 'Make room for learning', text: 'Explore the proposed CME calendar and available activities. View issued certificates when available.', href: '/portal/cme', action: 'Explore member CME' },
  { title: 'Your membership ID', text: 'Access the ID-card service and follow the requirements shown for your account.', href: '/portal/id-card', action: 'Open ID-card service' },
];
