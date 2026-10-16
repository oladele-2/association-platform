import meeting from '../assets/community-meeting.jpg';
import house from '../assets/doctors-house.jpg';
import table from '../assets/meeting-life.jpg';
import courtyard from '../assets/courtyard.jpg';

export const photos = {
  'community-meeting': {
    image: meeting,
    title: 'Shared purpose',
    alt: 'Participants seated around a meeting table beneath NMA mission and vision signage',
    caption:
      'Participants seated around a meeting table beneath the association’s mission and vision signage.',
  },
  'doctors-house': {
    image: house,
    title: 'Doctors’ House',
    alt: 'Exterior of a green two-storey building bearing the NMA emblem',
    caption: 'Exterior of Doctors’ House, with the association’s emblem visible on the building.',
  },
  'meeting-life': {
    image: table,
    title: 'Coming together',
    alt: 'People meeting around a table beneath NMA signage',
    caption: 'Participants gathered around a meeting table in an NMA-branded room.',
  },
  courtyard: {
    image: courtyard,
    title: 'A shared space',
    alt: 'Courtyard and two wings of a green two-storey building',
    caption: 'Courtyard and two wings of a green two-storey building bearing NMA signage.',
  },
};
export type PhotoName = keyof typeof photos;
export const albums: {
  slug: string;
  title: string;
  description: string;
  cover: PhotoName;
  photos: PhotoName[];
}[] = [
  {
    slug: 'meeting-life',
    title: 'Meeting life',
    description: 'Shared spaces for conversation, connection and professional purpose.',
    cover: 'community-meeting',
    photos: ['community-meeting', 'meeting-life'],
  },
  {
    slug: 'doctors-house',
    title: 'Doctors’ House',
    description: 'A closer look at the building, its courtyard and association signage.',
    cover: 'doctors-house',
    photos: ['doctors-house', 'courtyard'],
  },
];
