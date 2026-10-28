import { bookAlbums } from './photobook-content.mjs';
import churchOne from '../assets/church/thanksgiving-congregation.jpeg';
import churchTwo from '../assets/church/thanksgiving-front-row.jpeg';
import churchThree from '../assets/church/thanksgiving-fellowship.jpeg';
import churchFour from '../assets/church/thanksgiving-community.jpeg';
import meeting from '../assets/community-meeting.jpg';
import house from '../assets/doctors-house.jpg';
import table from '../assets/meeting-life.jpg';
import courtyard from '../assets/courtyard.jpg';

export const photos = {
  'thanksgiving-congregation': { image: churchOne, title: 'Together in thanksgiving', alt: 'Doctors and fellow worshippers seated at the thanksgiving church service', caption: 'Physicians’ Week thanksgiving church service · 18 October 2026. Photograph supplied by NMA Ogun.' },
  'thanksgiving-front-row': { image: churchTwo, title: 'A shared spirit', alt: 'Four attendees seated in the front row at the thanksgiving service', caption: 'Physicians’ Week thanksgiving church service · 18 October 2026. Photograph supplied by NMA Ogun.' },
  'thanksgiving-fellowship': { image: churchThree, title: 'Our professional community', alt: 'Rows of attendees gathered for the thanksgiving church service', caption: 'Physicians’ Week thanksgiving church service · 18 October 2026. Photograph supplied by NMA Ogun.' },
  'thanksgiving-community': { image: churchFour, title: 'A week begins with gratitude', alt: 'A wide view of the thanksgiving church congregation', caption: 'Physicians’ Week thanksgiving church service · 18 October 2026. Photograph supplied by NMA Ogun.' },
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
  bookPages?: number[];
  coverPage?: number;
}[] = [
  ...bookAlbums.map(album => ({ slug: album.slug, title: album.title, description: album.description, cover: 'doctors-house' as PhotoName, photos: [] as PhotoName[], bookPages: album.pages, coverPage: album.cover })),
  { slug: 'physicians-week-thanksgiving-2026', title: 'Physicians’ Week: thanksgiving service', description: 'Doctors together at the church service opening Physicians’ Week on 18 October 2026.', cover: 'thanksgiving-congregation', photos: ['thanksgiving-congregation','thanksgiving-front-row','thanksgiving-fellowship','thanksgiving-community'] },
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
