import { Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Premium Cattle Feed',
    category: 'Feed',
    description: 'High-quality balanced nutritional feed for dairy cows.',
    price: 1200,
    stock: 50,
    icon: 'Wheat'
  },
  {
    id: '2',
    name: 'Calcium Supplement (5L)',
    category: 'Medicine',
    description: 'Liquid calcium for improving milk yield and bone health.',
    price: 450,
    stock: 20,
    icon: 'FlaskConical'
  },
  {
    id: '3',
    name: 'Appetite Booster Powder',
    category: 'Appetite',
    description: 'Herbal powder to increase feed intake and digestion.',
    price: 250,
    stock: 100,
    icon: 'Leaf'
  },
  {
    id: '4',
    name: 'Deworming Tablets',
    category: 'Medicine',
    description: 'Broad-spectrum dewormer for cattle and buffaloes.',
    price: 120,
    stock: 0,
    icon: 'Pill'
  },
  {
    id: '5',
    name: 'Mineral Mixture (1kg)',
    category: 'Feed',
    description: 'Essential trace minerals for overall health.',
    price: 180,
    stock: 30,
    icon: 'Activity'
  }
];
