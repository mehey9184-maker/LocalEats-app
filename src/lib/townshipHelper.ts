/**
 * LocalEats Dynamic Geo-Awareness Township Engine
 * 
 * Automatically maps latitude & longitude coordinates to specific South African townships 
 * in Gauteng (Tembisa, Ivory Park, Kaalfontein, Rabie Ridge, Clayville) using distances
 * and outputs distinct, hyper-local branding, headings, and logistics configurations.
 */

import { calculateDistance } from '../utils';

export interface TownshipConfig {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  greeting: string;
  heroSubtitle: string;
  badgeText: string;
  deliveryRangeMessage: string;
  landmarks: string[];
}

export const TOWNSHIPS: TownshipConfig[] = [
  {
    id: 'tembisa',
    name: 'Tembisa',
    center: { lat: -25.9964, lng: 28.2268 },
    greeting: 'Tembisa On-Demand Deliveries',
    heroSubtitle: 'Order legendary Kotas and fresh plates from top-rated local spazas in Tembisa.',
    badgeText: 'Tembisa Finest',
    deliveryRangeMessage: 'Delivering hot across Sangweni, Hospital View & Oakmoor.',
    landmarks: ['Sangweni Section', 'Hospital View', 'Oakmoor Station', 'Phomolong', 'Sethokga']
  },
  {
    id: 'ivory_park',
    name: 'Ivory Park',
    center: { lat: -26.0125, lng: 28.1950 },
    greeting: 'Welcome to Ivory Park LocalEats',
    heroSubtitle: 'Serving hot Kotas to Ivory Park. Real-time matching with registered community runners.',
    badgeText: 'Ivory Park Local',
    deliveryRangeMessage: 'Fulfilling orders promptly across Kopanong & Busy Corner.',
    landmarks: ['Kopanong Section', 'Busy Corner', 'Ivory Park Hall', 'Ext 2', 'Ext 3']
  },
  {
    id: 'kaalfontein',
    name: 'Kaalfontein',
    center: { lat: -26.0110, lng: 28.2090 },
    greeting: 'Kaalfontein On-Demand Eats',
    heroSubtitle: 'Find legendary local street food, hot kota combos, and traditional meals in Kaalfontein.',
    badgeText: 'Kaalfontein Fresh',
    deliveryRangeMessage: 'Rapid delivery around Kaalfontein Station & Ext 4.',
    landmarks: ['Kaalfontein Station', 'Ext 1', 'Ext 4', 'Lari\'s Cafe', 'Phumulani']
  },
  {
    id: 'rabie_ridge',
    name: 'Rabie Ridge',
    center: { lat: -26.0026, lng: 28.1755 },
    greeting: 'Rabie Ridge Hot Delivery',
    heroSubtitle: 'Authentic local street food delivered safely to Rabie Ridge & Kanana residents.',
    badgeText: 'Rabie Ridge Local',
    deliveryRangeMessage: 'Connecting you with spazas near Rabie Ridge Community Hall.',
    landmarks: ['Rabie Ridge Hall', 'Kanana Section', 'Ext 1', 'Korsten']
  },
  {
    id: 'clayville',
    name: 'Clayville',
    center: { lat: -25.9650, lng: 28.2320 },
    greeting: 'Clayville Premium LocalEats',
    heroSubtitle: 'Order convenience eats, gourmet burgers, and fresh local Kotas right to your Clayville address.',
    badgeText: 'Clayville Trusted',
    deliveryRangeMessage: 'Speedy workplace and home deliveries throughout Clayville.',
    landmarks: ['Clayville East', 'Clayville Industrial', 'Ext 45', 'Mall of Tembisa']
  }
];

/**
 * Detects the closest township config based on coordinate proximity.
 * Falls back to Tembisa (default) if coordinates are invalid or extremely far.
 */
export function detectTownship(lat: number | undefined | null, lng: number | undefined | null): TownshipConfig {
  if (lat == null || lng == null) {
    return TOWNSHIPS[0]; // Tembisa default
  }

  let minDistance = Infinity;
  let detected: TownshipConfig = TOWNSHIPS[0];

  for (const township of TOWNSHIPS) {
    const dist = calculateDistance(lat, lng, township.center.lat, township.center.lng);
    if (dist < minDistance) {
      minDistance = dist;
      detected = township;
    }
  }

  // If closest township is further than 20km, treat as default South Africa/Tembisa
  if (minDistance > 20) {
    return TOWNSHIPS[0];
  }

  return detected;
}
