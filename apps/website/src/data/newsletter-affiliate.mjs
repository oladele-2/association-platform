const highlights = {
  'sacred-heart': ['Service, training and leadership', 'Read the newsletter interview with Dr Gregory Arifalo and explore Sacred Heart Hospital’s heritage feature.', '/news/newsletter-sacred-heart-hospital-interview'],
  'mdcan-aro': ['Professional life at NPH Aro', 'The 2026 newsletter records MDCAN NPH Aro meetings, professional milestones and association engagement.', '/newsletter/2026-third-edition#affiliate-reports'],
  'ard-aro': ['Mental health awareness and community engagement', 'The newsletter reports ARD NPH Aro’s World Mental Health Day activities and collaboration with Edijalo Health Services.', '/newsletter/2026-third-edition#affiliate-reports'],
  'ard-oouth': ['Meetings, learning and a shared professional voice', 'Explore ARD OOUTH photographs and professional contributions in the biannual newsletter.', '/gallery/newsletter-2026-affiliate-activities'],
  'mwan': ['Advocacy and professional engagement', 'The 2026 newsletter includes MWAN Ogun photographs covering advocacy, awareness and professional activities.', '/gallery/newsletter-2026-affiliate-activities'],
  'ard-fmc-abk': ['Representing colleagues beyond the hospital', 'The newsletter features ARD FMC Abeokuta executives during a visit to the State House of Assembly.', '/gallery/newsletter-2026-affiliate-activities'],
  'buth-ard': ['Scientific exchange and affiliate life', 'The newsletter features ARD BUTH’s 2026 scientific conference and other affiliate activities.', '/gallery/newsletter-2026-affiliate-activities'],
  'mdcan-hmb-moh': ['Advocacy, welfare, professional development and service', 'Read the MDCAN HMB–MOH chapter report and its selected activity photographs in the 2026 newsletter.', '/newsletter/2026-third-edition#affiliate-reports'],
};
export function renderNewsletterAffiliate(path, publication) {
  const item = highlights[path.replace('/affiliates/', '')];
  if (!item || !publication.entries.some(entry => entry.kind === 'resource' && entry.content.slug === 'nma-ogun-newsletter-third-edition-2026')) return '';
  const href = (item[2].startsWith('/news/') || item[2].startsWith('/gallery/')) && !publication.entries.some(entry => '/' + (entry.kind === 'article' ? 'news' : entry.kind) + '/' + entry.content.slug === item[2]) ? '/newsletter/2026-third-edition#affiliate-reports' : item[2];
  return `<section class="container newsletter-link-panel" aria-label="From the biannual newsletter"><p class="eyebrow">From the biannual newsletter · Third Edition, 2026</p><h2>${item[0]}</h2><p>${item[1]}</p><a href="${href}">Explore this affiliate’s newsletter coverage ↗</a></section>`;
}
