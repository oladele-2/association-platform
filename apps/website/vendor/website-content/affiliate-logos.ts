export type AffiliateLogo = {
  src: string;
  alt: string;
  label: string;
  scope: 'affiliate' | 'national' | 'institution' | 'parent';
  source: string;
};

const asset = (
  file: string,
  alt: string,
  label: string,
  scope: AffiliateLogo['scope'],
  source: string,
): AffiliateLogo => ({ src: `/images/affiliates/${file}.webp`, alt, label, scope, source });
const mdcan = asset(
  'mdcan-national',
  'Medical and Dental Consultants’ Association of Nigeria national emblem',
  'MDCAN national emblem',
  'national',
  'https://www.mdcan.org.ng/',
);
const nard = asset(
  'nard-national',
  'Nigerian Association of Resident Doctors national emblem',
  'NARD national emblem',
  'national',
  'https://nardng.org/',
);

export const affiliateLogos: Record<string, AffiliateLogo> = {
  ANPMP: asset(
    'anpmp-national',
    'Association of Nigerian Private Medical Practitioners emblem',
    'ANPMP national emblem',
    'national',
    'https://anpmp.org/',
  ),
  'MDCAN-FMC-ABK': mdcan,
  NAGGMDP: asset(
    'naggmdp-national',
    'National Association of Government General Medical and Dental Practitioners emblem',
    'NAGGMDP association emblem',
    'national',
    'https://www.naggmdp-kogi.com/',
  ),
  'ARD-FMC-ABK': asset(
    'ard-fmc-abeokuta',
    'Association of Resident Doctors, FMC Abeokuta logo',
    'ARD FMC Abeokuta logo',
    'affiliate',
    'resources/fmc-abeokuta.jpeg',
  ),
  'MDCAN-OOUTH': mdcan,
  'ARD-OOUTH': nard,
  'BUTH-ARD': asset(
    'buth-ard',
    'Babcock University Teaching Hospital Association of Resident Doctors logo',
    'BUTH ARD logo',
    'affiliate',
    'resources/babcock-resident-doctors.jpeg',
  ),
  'MDCAN-HMB-MOH': mdcan,
  'MDCAN-ARO': mdcan,
  'BUTH-MDCAN': mdcan,
  'ARD-ARO': nard,
  'LG-DOCTORS': asset(
    'nma-ogun',
    'NMA Ogun parent association logo',
    'NMA Ogun parent association emblem',
    'parent',
    'resources/logo_to_use.png',
  ),
  'SACRED-HEART': asset(
    'sacred-heart',
    'Sacred Heart Hospital, Lantoro Abeokuta logo',
    'Sacred Heart Hospital logo',
    'institution',
    'https://sacredhearthospitallantoro.org/',
  ),
  'NADUHS-FUNAAB': asset(
    'funaab',
    'Federal University of Agriculture, Abeokuta logo',
    'FUNAAB institutional emblem',
    'institution',
    'https://funaab.edu.ng/',
  ),
  MWAN: asset(
    'mwan-national',
    'Medical Women’s Association of Nigeria emblem',
    'MWAN national emblem',
    'national',
    'https://www.mwan.org/',
  ),
  'NADUHS-TASUED': asset(
    'tasued',
    'Tai Solarin University of Education logo',
    'TASUED institutional emblem',
    'institution',
    'https://tasued.edu.ng/university-logo/',
  ),
  'NDA-OGUN': asset(
    'nda-ogun',
    'Nigerian Dental Association, Ogun Chapter logo',
    'NDA Ogun logo',
    'affiliate',
    'resources/nigeria-dental-association.jpeg',
  ),
};
