import { User, UserRole, Product } from './types';

export const MOCK_ADMIN: User = {
  id: 'admin-001',
  name: 'Gustavo Benvindo',
  email: 'gustavo_benvindo80@hotmail.com',
  role: UserRole.ADMIN,
  password: 'Gustavor80'
};

export const INITIAL_USERS: User[] = [
  MOCK_ADMIN,
  {
    id: 'user-repre',
    name: 'Representante Kavin',
    email: 'repre@kavins.com.br',
    role: UserRole.REPRESENTANTE,
    password: 'repre2026'
  },
  {
    id: 'user-sacoleira',
    name: 'Sacoleira Kavin',
    email: 'sacoleira@kavins.com',
    role: UserRole.SACOLEIRA,
    password: 'sacoleira2026'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    reference: 'REF-2024-A',
    name: 'Vestido Longo Floral',
    description: 'Vestido elegante com estampa floral, perfeito para eventos de verão. Tecido leve e respirável.',
    sizes: ['P', 'M', 'G'],
    colors: [
      { hex: '#FF5733', name: 'Coral Vivo' },
      { hex: '#C70039', name: 'Vermelho Intenso' }
    ],
    priceRepresentative: 89.90,
    priceSacoleira: 110.00,
    images: ['https://picsum.photos/400/600?random=1'],
    category: 'Vestidos',
    fabric: 'Viscose Premium',
    isHighlight: true
  }
];