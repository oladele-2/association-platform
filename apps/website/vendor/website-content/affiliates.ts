// Public editorial seed. No member records, internal contacts or private media keys.
import { affiliateLogos, type AffiliateLogo } from './affiliate-logos.ts';
export function doctorDisplayName(value: string): string {
  const name = value
    .trim()
    .replace(/^(?:(?:dr|doctor|prof(?:essor)?)(?:\.\s*|\s+))+/iu, '')
    .trim();
  return name ? `Dr ${name}` : '';
}
export const affiliateCategories = [
  'Professional associations',
  'Consultants',
  'Resident doctors',
  'Institutional groups',
] as const;
export type AffiliateSection = { heading: string; paragraphs: string[] };
export type AffiliateFeaturedMember = { name: string; specialty: string };
export type AffiliateDetails = {
  code: string;
  category: string;
  location: string;
  tagline: string;
  focusAreas: string[];
  sections: AffiliateSection[];
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  featuredMembers?: AffiliateFeaturedMember[];
  memberListingApproved?: boolean;
};
export type AffiliateSeed = {
  slug: string;
  name: string;
  shortName: string;
  summary: string;
  paragraphs: string[];
  details: AffiliateDetails;
  sources: { label: string; url: string }[];
  logo?: AffiliateLogo;
};

const consultants = {
  label: 'MDCAN: national aims and objectives',
  url: 'https://www.mdcan.org.ng/about.php',
};
const residents = {
  label: 'NARD: about resident doctors’ associations',
  url: 'https://nardng.org/about-nard/',
};
const institutions = {
  fmc: { label: 'Federal Medical Centre, Abeokuta', url: 'https://www.fmcabeokuta.net/' },
  oouth: {
    label: 'Olabisi Onabanjo University Teaching Hospital',
    url: 'https://www.oouth.com/index.php',
  },
  aro: {
    label: 'Federal Neuropsychiatric Hospital, Aro',
    url: 'https://main.neuroaro.gov.ng/view.php?s=about-neuropsychiatric-hospital-aro-abeokuta',
  },
  buth: { label: 'Babcock University Teaching Hospital', url: 'https://buth.babcock.edu.ng/' },
};

function seed(
  code: string,
  name: string,
  shortName: string,
  category: string,
  location: string,
  tagline: string,
  summary: string,
  paragraphs: string[],
  focusAreas: string[],
  sources: AffiliateSeed['sources'] = [],
): AffiliateSeed {
  return {
    slug: code.toLowerCase(),
    logo: affiliateLogos[code],
    name,
    shortName,
    summary,
    paragraphs,
    sources,
    details: {
      code,
      category,
      location,
      tagline,
      focusAreas,
      sections: [],
      contactEmail: '',
      contactPhone: '',
      address: '',
      website: '',
    },
  };
}
function chapter(
  code: string,
  institution: string,
  short: string,
  location: string,
  kind: 'consultant' | 'resident',
  context: string,
  source?: AffiliateSeed['sources'][number],
) {
  const consultant = kind === 'consultant';
  return seed(
    code,
    `${consultant ? 'MDCAN' : 'ARD'} ${institution}`,
    `${consultant ? 'MDCAN' : 'ARD'} ${short}`,
    consultant ? 'Consultants' : 'Resident doctors',
    location,
    consultant
      ? 'Experience that strengthens the profession.'
      : 'Growing expertise. A shared professional voice.',
    `${consultant ? 'The medical and dental consultants’' : 'The resident doctors’'} affiliate at ${institution}, within the NMA Ogun family.`,
    [
      `${consultant ? 'MDCAN' : 'ARD'} ${short} connects ${consultant ? 'medical and dental consultants' : 'resident doctors'} at ${institution} with the wider professional community of NMA Ogun. ${context}`,
      consultant
        ? 'Nationally, MDCAN’s objectives include professional ethics, consultants’ welfare, health service standards and professional development. These provide context for understanding the consultants’ place in the medical community.'
        : 'Resident doctors combine clinical service with postgraduate development. Nationally, NARD’s aims include doctors’ training, welfare and engagement with policies affecting medical practice.',
      consultant
        ? `Within the NMA Ogun family, this affiliate brings the perspective of specialist practice at ${short}. It offers a point of connection for conversations about clinical leadership, collaboration across specialties and the next generation of doctors.`
        : `This affiliate gives the NMA Ogun community a connection to the experience of doctors developing their careers at ${short}. Training, working conditions and peer support are useful starting points for engagement with its representatives.`,
    ],
    consultant
      ? ['Specialist practice', 'Professional ethics', 'Consultants’ welfare']
      : ['Postgraduate development', 'Resident doctors’ welfare', 'Peer connection'],
    [consultant ? consultants : residents, ...(source ? [source] : [])],
  );
}

export const affiliateSeeds: AffiliateSeed[] = [
  seed(
    'ANPMP',
    'Association of Nigerian Private Medical Practitioners',
    'ANPMP Ogun',
    'Professional associations',
    'Ogun State',
    'A stronger voice for private practice.',
    'Connecting the private medical practice community with the wider NMA Ogun family.',
    [
      'ANPMP is the private practice affiliate in the NMA Ogun family. It connects a part of the profession that includes practice owners and employed medical and dental practitioners working in private healthcare.',
      'The national association describes its membership as spanning doctors in private practice, whether owners or employees. Its professional community provides a setting for discussion of practice management, professional standards and the environment in which private healthcare is delivered.',
      'For NMA Ogun, the affiliate provides a connection to the perspectives of private practitioners. Those perspectives are relevant to conversations about access to care, collaboration with public services and the practical needs of independent practices.',
    ],
    ['Private practice', 'Professional standards', 'Practice collaboration'],
    [{ label: 'ANPMP: association background', url: 'https://anpmp.events/about/' }],
  ),
  chapter(
    'MDCAN-FMC-ABK',
    'Federal Medical Centre Abeokuta',
    'FMC Abeokuta',
    'Abeokuta',
    'consultant',
    'FMC Abeokuta describes its work around healthcare delivery, training and research.',
    institutions.fmc,
  ),
  seed(
    'NAGGMDP',
    'National Association of Government General Medical and Dental Practitioners',
    'NAGGMDP Ogun',
    'Professional associations',
    'Ogun State',
    'Connecting doctors in government service.',
    'The government general medical and dental practitioners’ affiliate in the NMA Ogun family.',
    [
      'NAGGMDP connects the government general medical and dental practice community with NMA Ogun. Its place in the family reflects the contribution of doctors working in government health services.',
      'General medical and dental practice is an important part of how people encounter healthcare. The experience of practitioners in government service adds a valuable perspective to professional discussions about service delivery, working environments and continuity of care.',
      'This affiliate offers a route for professional connection with that community. Members and prospective collaborators can use their NMA Ogun channels to ask about the local association, its membership arrangements and opportunities for participation.',
    ],
    ['Government practice', 'General medical and dental practice', 'Professional representation'],
  ),
  chapter(
    'ARD-FMC-ABK',
    'Federal Medical Centre Abeokuta',
    'FMC Abeokuta',
    'Abeokuta',
    'resident',
    'The hospital’s stated remit includes healthcare delivery, training and research.',
    institutions.fmc,
  ),
  chapter(
    'MDCAN-OOUTH',
    'Olabisi Onabanjo University Teaching Hospital',
    'OOUTH',
    'Sagamu',
    'consultant',
    'OOUTH is a teaching hospital in Sagamu with a stated commitment to tertiary healthcare and teaching.',
    institutions.oouth,
  ),
  chapter(
    'ARD-OOUTH',
    'Olabisi Onabanjo University Teaching Hospital',
    'OOUTH',
    'Sagamu',
    'resident',
    'The teaching hospital setting connects clinical work with the development of medical expertise.',
    institutions.oouth,
  ),
  chapter(
    'BUTH-ARD',
    'Babcock University Teaching Hospital',
    'BUTH',
    'Ogun State',
    'resident',
    'Babcock University Teaching Hospital is part of the state’s teaching hospital community.',
    institutions.buth,
  ),
  chapter(
    'MDCAN-HMB-MOH',
    'Hospitals Management Board / Ministry of Health',
    'HMB / MOH',
    'Ogun State',
    'consultant',
    'This recorded affiliate connects the consultants’ community associated with the Hospitals Management Board and Ministry of Health.',
  ),
  chapter(
    'MDCAN-ARO',
    'Neuropsychiatric Hospital Aro',
    'Aro',
    'Abeokuta',
    'consultant',
    'Aro’s institutional background includes mental health care, research and training.',
    institutions.aro,
  ),
  chapter(
    'BUTH-MDCAN',
    'Babcock University Teaching Hospital',
    'BUTH',
    'Ogun State',
    'consultant',
    'The teaching hospital is part of the medical education and healthcare community in Ogun State.',
    institutions.buth,
  ),
  chapter(
    'ARD-ARO',
    'Neuropsychiatric Hospital Aro',
    'Aro',
    'Abeokuta',
    'resident',
    'Aro’s institutional background includes training and research in mental health and related disciplines.',
    institutions.aro,
  ),
  seed(
    'LG-DOCTORS',
    'Local Government Doctors',
    'Local Government Doctors',
    'Institutional groups',
    'Ogun State',
    'A community perspective within the profession.',
    'Connecting doctors in local government settings with NMA Ogun’s statewide professional community.',
    [
      'Local Government Doctors is an affiliate within the NMA Ogun family. It provides a professional connection to doctors working in local government settings across the state.',
      'Local services sit close to the communities they serve. The perspective of doctors working in these settings is relevant to conversations about everyday access to healthcare, prevention and coordination with other levels of care.',
      'Within NMA Ogun, this group adds that local service perspective to a wider professional conversation. Prospective members and partners can begin by asking the association about the group’s current representatives and the appropriate route for engagement.',
    ],
    ['Local government practice', 'Community connection', 'Professional collaboration'],
  ),
  seed(
    'SACRED-HEART',
    'Sacred Heart Hospital',
    'Sacred Heart Hospital',
    'Institutional groups',
    'Ogun State',
    'An institutional community. A shared purpose.',
    'The Sacred Heart Hospital group within the NMA Ogun affiliate family.',
    [
      'Sacred Heart Hospital is recorded as an institutional affiliate group within NMA Ogun. Its profile provides a place for the hospital’s medical community in the association’s wider network.',
      'Institutional groups help connect the experience of doctors in a particular workplace with colleagues across the state. They give professional conversations a local setting while keeping them connected to shared priorities.',
      'For a colleague exploring this group, the useful next step is to ask about its current membership arrangements and representation. For a prospective partner, an introduction through NMA Ogun can help establish the appropriate local contact.',
    ],
    ['Institutional representation', 'Colleague connection', 'Shared professional purpose'],
  ),
  seed(
    'NADUHS-FUNAAB',
    'NADUHS FUNAAB',
    'NADUHS FUNAAB',
    'Institutional groups',
    'Abeokuta',
    'Connecting campus health with the wider profession.',
    'The FUNAAB university health services doctors’ group within the NMA Ogun family.',
    [
      'NADUHS FUNAAB connects the university health services doctors’ community at the Federal University of Agriculture, Abeokuta with NMA Ogun.',
      'FUNAAB describes its Directorate of Health Services as serving students, staff, staff dependants and adjoining communities. This gives the group a university health setting within the broader medical community.',
      'Campus health brings together the needs of a learning community and the practice of medicine. The affiliate offers a point of connection for professional conversations about university healthcare, prevention and collaboration with colleagues elsewhere in Ogun State.',
    ],
    ['University health services', 'Campus wellbeing', 'Professional connection'],
    [
      {
        label: 'FUNAAB: Directorate of Health Services',
        url: 'https://funaab.edu.ng/section/directorate-of-health-services/',
      },
    ],
  ),
  seed(
    'MWAN',
    'Medical Women’s Association of Nigeria',
    'MWAN Ogun',
    'Professional associations',
    'Ogun State',
    'Women in medicine. A stronger community.',
    'Connecting women medical and dental practitioners within the NMA Ogun family.',
    [
      'MWAN is the women doctors’ affiliate within the NMA Ogun family. It creates a connection between women in the medical and dental professions and the wider association community.',
      'The national Medical Women’s Association of Nigeria describes itself as the umbrella body for female medical and dental doctors. Its published discussions include women’s leadership, professional engagement and collaboration around health and wellbeing.',
      'Within Ogun, this affiliate provides a point of connection for women doctors and for people seeking a conversation with their professional community. Mentorship, professional participation and collaborative health education are useful areas to explore with its representatives.',
    ],
    ['Women in medicine', 'Professional connection', 'Leadership and collaboration'],
    [
      {
        label: 'MWAN: women in medicine and collaboration',
        url: 'https://www.mwan.org/communique-issued-at-the-medical-womens-association-of-nigeria-and-focus-africa-maiden-african-women-in-medicine/',
      },
    ],
  ),
  seed(
    'NADUHS-TASUED',
    'NADUHS TASUED',
    'NADUHS TASUED',
    'Institutional groups',
    'Ogun State',
    'A professional connection for university health doctors.',
    'The TASUED university health services doctors’ group in the NMA Ogun family.',
    [
      'NADUHS TASUED is the university health services doctors’ group recorded under TASUED in the NMA Ogun affiliate family.',
      'Doctors in university health settings bring the perspective of a campus community to the wider profession. Their working environment connects healthcare with the everyday needs of students and the people who support university life.',
      'This profile gives that community a place in NMA Ogun’s network. Colleagues can use the association as a starting point for introductions, membership questions and discussion of possible professional collaboration.',
    ],
    ['University health services', 'Campus community', 'Professional collaboration'],
  ),
  seed(
    'NDA-OGUN',
    'Nigerian Dental Association, Ogun Chapter',
    'NDA Ogun',
    'Professional associations',
    'Ogun State',
    'A voice for dentistry. A place in the family.',
    'The dental profession’s affiliate within NMA Ogun, connecting oral health with the wider healthcare conversation.',
    [
      'The Nigerian Dental Association, Ogun Chapter brings the dental profession into the NMA Ogun affiliate family. It connects dental practitioners with colleagues across medicine and dentistry in the state.',
      'Nationally, the Nigerian Dental Association represents and advances dentistry and promotes oral health. Its work includes professional education and dental health awareness.',
      'The Ogun chapter provides a connection to that professional community locally. It is a useful starting point for conversations about dental professional participation, oral health education and collaboration between medical and dental practitioners.',
    ],
    ['Dentistry', 'Oral health education', 'Professional development'],
    [
      {
        label: 'Nigerian Dental Association: about the association',
        url: 'https://nigdentalasso.org/about-us/',
      },
    ],
  ),
];

export const affiliateSeedByCode = (code: string) =>
  affiliateSeeds.find((item) => item.details.code === code);
