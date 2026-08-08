import { Shop } from './types';

export const DEFAULT_FALLBACK_SHOPS: Shop[] = [
  {
    id: "fallback-shop-1",
    name: "Mama's Kota Kitchen",
    logo: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300",
    rating: 4.8,
    cash_trust_enabled: true,
    allow_external_riders: true,
    auto_look_for_rider: true,
    reviewCount: 142,
    prepTime: "15-20 min",
    isOpen: true,
    description: "The most legendary Kotas in Tembisa, stacked with fresh chips, cheese, polony, and our secret house sauces.",
    address: "246 Jiyane Street, Tembisa",
    category: "Kota",
    owner_id: "system",
    opening_time: "08:00",
    closing_time: "22:00",
    phone: "+27 71 234 5678",
    latitude: -25.9964,
    longitude: 28.2268,
    images: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1476224484581-5d996cc0750e?auto=format&fit=crop&q=80&w=600"
    ],
    menu: [
      {
        id: "fb-item-1",
        name: "Classic Single Kota",
        price: 35.00,
        displayPrice: "R35.00",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
        description: "Fresh quarter loaf sandwich filled with golden hot chips, polony, and special sauce.",
        category: "Kotas",
        is_available: true,
        customizations: []
      },
      {
        id: "fb-item-2",
        name: "Special Double Cheese Kota",
        price: 55.00,
        displayPrice: "R55.00",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
        description: "Quarter loaf packed with double chips, double cheese, polony, egg, Russian, and sauces.",
        category: "Kotas",
        is_available: true,
        customizations: []
      }
    ]
  },
  {
    id: "fallback-shop-2",
    name: "Tembisa Braai Masters",
    logo: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=300",
    rating: 4.9,
    cash_trust_enabled: true,
    allow_external_riders: true,
    auto_look_for_rider: true,
    reviewCount: 98,
    prepTime: "20-25 min",
    isOpen: true,
    description: "Premium flame-grilled Shisa Nyama, boerewors, chuck beef, and delicious chakalaka side dishes.",
    address: "89 RTJ Makhabela Drive, Tembisa",
    category: "Braai",
    owner_id: "system",
    opening_time: "09:00",
    closing_time: "21:00",
    phone: "+27 82 987 6543",
    latitude: -25.9980,
    longitude: 28.2295,
    images: [
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&q=80&w=600"
    ],
    menu: [
      {
        id: "fb-item-3",
        name: "Chuck Beef Plate (Quarter kg)",
        price: 85.00,
        displayPrice: "R85.00",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600",
        description: "Flame-grilled super juicy chuck beef served with pap, chakalaka, and spicy BBQ sauce.",
        category: "Braai Plates",
        is_available: true,
        customizations: []
      },
      {
        id: "fb-item-4",
        name: "Boerewors Roll Deluxe",
        price: 45.00,
        displayPrice: "R45.00",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
        description: "Traditional local beef sausage grilled to perfection in a fresh roll with caramelized onions.",
        category: "Braai Plates",
        is_available: true,
        customizations: []
      }
    ]
  }
];

export const MY_KOTA_TEST_STORE: Shop = {
  id: "my-kota-test-store",
  name: "My-Kota",
  logo: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300",
  rating: 5.0,
  cash_trust_enabled: true,
  allow_external_riders: true,
  auto_look_for_rider: true,
  reviewCount: 48,
  prepTime: "10-15 min",
  isOpen: true,
  description: "Authentic township Kotas, golden chips, melted cheese, Russian, polony, and special secret house sauces.",
  address: "246 Jiyane Street, Tembisa",
  category: "Kota",
  owner_id: "teejeyunam@gmail.com",
  owner_email: "teejeyunam@gmail.com",
  is_test: true,
  is_test_store: true,
  is_private: true,
  opening_time: "08:00",
  closing_time: "23:00",
  phone: "+27 71 234 5678",
  latitude: -25.9964,
  longitude: 28.2268,
  images: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
  ],
  menu: [
    {
      id: "my-kota-item-1",
      name: "Classic Single Kota",
      price: 35.00,
      displayPrice: "R35.00",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
      description: "Fresh quarter loaf sandwich filled with golden hot chips, polony, atchar, and special house sauce.",
      category: "Kotas",
      is_available: true,
      customizations: [],
    },
    {
      id: "my-kota-item-2",
      name: "Special Double Cheese Kota",
      price: 55.00,
      displayPrice: "R55.00",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
      description: "Quarter loaf loaded with double chips, double melted cheddar cheese, polony, egg, Russian, and house sauces.",
      category: "Kotas",
      is_available: true,
      customizations: [],
    },
    {
      id: "my-kota-item-3",
      name: "Deluxe Dagwood Kota",
      price: 65.00,
      displayPrice: "R65.00",
      image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600",
      description: "Stacked quarter loaf with beef patty, bacon, egg, cheese, chips, polony, and secret relish.",
      category: "Kotas",
      is_available: true,
      customizations: [],
    },
  ],
};
