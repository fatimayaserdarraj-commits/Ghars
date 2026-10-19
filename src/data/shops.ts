import { ImageSourcePropType } from 'react-native';

import { Localized } from '@/lib/translations';

export type ShopType = 'nursery' | 'online';

export type Shop = {
  id: string;
  type: ShopType;
  name: Localized;
  area: Localized;
  /** For shops with several branches: the branch areas, shown under the area label. */
  branches?: Localized;
  image: ImageSourcePropType;
  /** 'contain' for logos so they aren't cropped; photos fill the frame. */
  fit?: 'cover' | 'contain';
  /** Fill behind a contained logo, matched to the logo's own background. */
  background?: string;
  instagram?: string;
  /** A specific Google Maps link; otherwise the shop is searched by name. */
  maps?: string;
  // Optional details — fill in when known; anything left out is simply not shown.
  description?: Localized;
  /** International format, e.g. '+97312345678'. Enables the Call and WhatsApp buttons. */
  phone?: string;
  /** Opening hours, e.g. '07:00 – 19:00'. */
  hours?: string;
  /** Google rating out of 5, e.g. 4.6. */
  rating?: number;
  /** Map position; enables "Sort by distance". */
  lat?: number;
  lng?: number;
};

const L = (en: string, ar: string): Localized => ({ en, ar });

/**
 * Plant nurseries and shops in Bahrain.
 *
 * To add details to a shop, add any of these lines inside its { … } block:
 *   phone: '+97312345678',
 *   hours: '07:00 – 19:00',
 *   rating: 4.6,
 *   description: L('Palms, fruit trees and seedlings.', 'نخيل وأشجار مثمرة وشتلات.'),
 *   lat: 26.2186, lng: 50.4567,   // from Google Maps: right-click the place → copy the numbers
 */
export const SHOPS: Shop[] = [
  {
    id: 'abu-saiba',
    type: 'nursery',
    name: L('Abu Saiba Nursery', 'مشتل أبو صيبع'),
    area: L('Abu Saiba', 'أبو صيبع'),
    image: require('../../assets/images/shops/abu-saiba.jpg'),
  },
  {
    id: 'bahrain-branch',
    type: 'nursery',
    name: L('Bahrain Branch Nursery', 'مشتل غصن البحرين'),
    area: L('Karranah', 'كرانة'),
    image: require('../../assets/images/shops/bahrain-branch.jpg'),
  },
  {
    id: 'sanwan',
    type: 'nursery',
    name: L('Sanwan Nursery', 'مشتل سنوان'),
    area: L('Karranah', 'كرانة'),
    image: require('../../assets/images/shops/sanwan.jpg'),
  },
  {
    id: 'bahrain-garden',
    type: 'online',
    name: L('Bahrain Garden Nursery', 'مشتل حدائق البحرين'),
    area: L('Online shop', 'متجر إلكتروني'),
    image: require('../../assets/images/shops/bahrain-garden.jpg'),
    fit: 'contain',
    background: '#38502C',
    instagram: 'https://www.instagram.com/bahraingardennursery/',
  },
  {
    id: 'hujair',
    type: 'nursery',
    name: L('Hujair Nursery for Landscaping', 'مشتل حجير لتنسيق الحدائق'),
    area: L('Manama', 'المنامة'),
    image: require('../../assets/images/shops/hujair.jpg'),
  },
  {
    id: 'al-ahmed',
    type: 'online',
    name: L('Al Ahmed Nursery', 'مشتل الأحمد'),
    area: L('Online shop', 'متجر إلكتروني'),
    image: require('../../assets/images/shops/al-ahmed.jpg'),
    instagram: 'https://www.instagram.com/al_ahmed_nursery_bh/',
  },
  {
    id: 'alwadi',
    type: 'nursery',
    name: L('Alwadi Agroserve', 'الوادي للخدمات الزراعية'),
    area: L('Al-Barahama, Manama', 'البراحة - المنامة'),
    image: require('../../assets/images/shops/alwadi.jpg'),
  },
  {
    id: 'al-amin',
    type: 'nursery',
    name: L('Al Amin Gardens', 'حدائق الأمين'),
    area: L('Manama', 'المنامة'),
    image: require('../../assets/images/shops/al-amin.jpg'),
  },
  {
    id: 'jassim',
    type: 'nursery',
    name: L('Jassim Garden Centre', 'مركز جاسم للحدائق'),
    area: L('Manama', 'المنامة'),
    image: require('../../assets/images/shops/jassim.jpg'),
    fit: 'contain',
  },
  {
    id: 'alkhair',
    type: 'nursery',
    name: L('Alkhair Nursery', 'مشتل الخير'),
    area: L('Several branches in Bahrain', 'عدة فروع في البحرين'),
    branches: L('Diraz, Barbar, Tubli, Damistan, Galali, Isa Town', 'الدراز، باربار، توبلي، دمستان، قلالي، مدينة عيسى'),
    image: require('../../assets/images/shops/alkhair.jpg'),
    maps: 'https://www.google.com/maps/search/%D9%85%D8%B1%D9%83%D8%B2+%D8%A7%D9%84%D8%AE%D9%8A%D8%B1+%D8%A7%D9%84%D8%B2%D8%B1%D8%A7%D8%B9%D9%8A/@26.1849649,50.5967303,13z',
  },
];

/** Google Maps link for a shop: its own link, or a search for its name in Bahrain. */
export function mapsLink(shop: Shop) {
  if (shop.maps) return shop.maps;
  const query = shop.lat != null && shop.lng != null ? `${shop.lat},${shop.lng}` : `${shop.name.en}, Bahrain`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
