import { validateSnapshot } from '../../vendor/website-content/index.ts';
import release from '../../content/release/snapshot.json';

export const publication = validateSnapshot(release);
export const homeArticles = publication.entries.filter(entry => entry.kind === 'article')
  .sort((a, b) => b.content.date.localeCompare(a.content.date) || a.content.sortOrder - b.content.sortOrder || b.publishedAt.localeCompare(a.publishedAt));
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const upcomingEvents = publication.entries.filter(entry => entry.kind === 'event' && entry.content.date >= today)
  .sort((a, b) => a.content.date.localeCompare(b.content.date));
export const chairman = publication.entries.find(entry => entry.kind === 'officer' && entry.content.group === 'current' && entry.content.office.trim().toLowerCase() === 'chairman');
export const chairmanPhoto = chairman?.content.mediaIds.map(id => publication.media.find(media => media.id === id)).find(media => media?.mime.startsWith('image/'));
export const secretariatEmail = 'nmaogunstate@gmail.com';
export const programme = [
  { month: 'October', year: 2026, category: 'Clinical practice', title: 'Consent, documentation and avoidable medico-legal errors', format: 'Webinar', slug: 'consent-documentation-safer-practice' },
  { month: 'November', year: 2026, category: 'Research & education', title: 'Research methods for busy clinicians', format: 'Practical workshop', slug: 'research-methods-busy-clinicians' },
  { month: 'December', year: 2026, category: 'Doctors’ wellbeing', title: 'Burnout, mental health and healthy living for doctors', format: 'Webinar', slug: 'doctors-wellbeing-burnout-mental-health' },
  { month: 'January', year: 2027, category: 'Practice & leadership', title: 'Personal finance and current tax obligations for doctors', format: 'Webinar', slug: 'personal-finance-tax-planning-doctors' },
  { month: 'February', year: 2027, category: 'Practice & leadership', title: 'Leadership, teamwork and managing clinical services', format: 'Hybrid seminar', slug: 'leadership-teamwork-clinical-services' },
  { month: 'March', year: 2027, category: 'Clinical practice', title: 'First response to emergencies: resuscitation and trauma triage', format: 'Hands-on workshop', slug: 'first-response-emergencies-trauma-triage' },
  { month: 'April', year: 2027, category: 'Practice & leadership', title: 'Managing a medical practice: quality, billing, HR and patient experience', format: 'Hybrid workshop', slug: 'managing-medical-practice' },
  { month: 'May', year: 2027, category: 'Clinical practice', title: 'Digital health, EMRs, privacy and safe clinical AI use', format: 'Webinar', slug: 'digital-health-emrs-privacy-clinical-ai' },
  { month: 'June', year: 2027, category: 'Clinical practice', title: 'Cross-specialty updates: common urgent presentations', format: 'Hybrid mini-symposium', slug: 'cross-specialty-urgent-presentations' },
  { month: 'July', year: 2027, category: 'Clinical practice', title: 'Medical ethics, professional discipline and expert testimony', format: 'Webinar', slug: 'medical-ethics-discipline-expert-testimony' },
  { month: 'August', year: 2027, category: 'Practice & leadership', title: 'Health insurance, health economics and sustainable care', format: 'Webinar', slug: 'health-insurance-sustainable-care' },
  { month: 'September', year: 2027, category: 'Research & education', title: 'Scientific writing, peer review and grant applications', format: 'Hybrid workshop', slug: 'scientific-writing-peer-review-grants' },
];
