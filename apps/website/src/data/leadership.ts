// Committee appointments from the supplied NMA Ogun 2026–2028 resource.
// Executive officers and their portraits live in content/release/snapshot.json.
export const executiveTerm = '2026–2028';
export const committeeAnchor = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Transcribed from resources/commite_charman.jpeg. Retain the published
// short names where the source does not provide a full name.
export const committees = [
  { name: 'Secretariat ICT / Digital Transformation', chairman: 'Dr Olufunso Seye', focus: 'Digital tools and secretariat transformation.' },
  { name: 'Award & Recognition', chairman: 'Dr Enimola Sunday', focus: 'Recognising service and contributions to the profession.' },
  { name: 'AGM / Scientific Conference', chairman: 'Dr Bajomo Grace', focus: 'The annual general meeting and scientific conference.' },
  { name: 'Finance & Fundraising', chairman: 'Dr Kunle Farayibi', focus: 'Financial planning and fundraising for association activities.' },
  { name: 'Health Policy & Doctors Welfare', chairman: 'Dr Omotosho', focus: 'Health policy and the welfare of doctors.' },
  { name: 'Ethics & Discipline', chairman: 'Dr Alayaki Adewunmi', focus: 'Professional ethics and discipline.' },
  { name: 'Training & CME', chairman: 'Dr Kunle Adebanjo', focus: 'Training and continuing medical education.' },
  { name: 'NMA Land', chairman: 'Dr Ayoola Zaheed', focus: 'Matters relating to the association’s land.' },
  { name: 'NMA Remuneration', chairman: 'Dr Monehin Olusola', focus: 'Doctors’ remuneration and related professional interests.' },
  { name: 'Leadership & Young Doctors', chairman: 'Dr Okebalama Victor', focus: 'Leadership development and support for young doctors.' },
  { name: 'Mental Health', chairman: 'Dr Odunbaku Kazeem', focus: 'Mental health awareness and professional wellbeing.' },
  { name: 'Antiquackery', chairman: 'Dr Richard Ajanlekoko', focus: 'Protecting the public and the integrity of medical practice.' },
  { name: 'Spouse Support', chairman: 'Dr Modupe Alonge', focus: 'Support for spouses within the medical community.' },
  { name: 'Sports & Recreation', chairman: 'Dr Adebisi Segun', focus: 'Sport, recreation and connection among members.' },
  { name: 'Disaster Response', chairman: 'Dr Tijani Olatunji', focus: 'Coordination around disaster response.' },
  { name: 'Research and Publications', chairman: 'Dr Yesir Kareem', focus: 'Research and professional publications.' },
  { name: 'Partnership, Sponsorship & External Relations', chairman: 'Dr Oladipupo Kazeem', focus: 'Partnerships, sponsorship and external relationships.' },
  { name: 'Oncology', chairman: 'Dr Salako', focus: 'Professional engagement around oncology.' },
  { name: 'Media, Publicity & Communications', chairman: 'Dr Richard Akintunde', focus: 'Media engagement, publicity and association communications.' },
] as const;
