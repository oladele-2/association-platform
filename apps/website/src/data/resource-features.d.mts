import type { PublicEntry, PublicationSnapshot } from '@association/website-content';
export function lagosDay(value?: Date | string | number): string;
export const physiciansWeek: { title: string; start: string; end: string; agenda: { date: string; title: string }[] };
export function physiciansWeekState(now?: Date | string | number): 'upcoming' | 'current' | 'past';
export function selectNewsletterEditions(publication: PublicationSnapshot): PublicEntry[];
export const pastLeadership: { term: string; chairman: string; secretary?: string }[];
export const memberBenefits: { title: string; text: string; href: string; action: string }[];
