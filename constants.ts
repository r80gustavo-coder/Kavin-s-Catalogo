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
    id: 'user-002',
    name: 'Maria Representante',
    email: 'maria@rep.com',
    role: UserRole.REPRESENTANTE,
    password: '123'
  },
  {
    id: 'user-003',
    name: 'Ana Sacoleira',
    email: 'ana@sacola.com',
    role: UserRole.SACOLEIRA,
    password: '123'
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
  },
  {
    id: 'prod-002',
    reference: 'REF-2024-B',
    name: 'Blusa Básica Premium',
    description: 'Blusa básica essencial para o dia a dia, confeccionada em algodão egípcio.',
    sizes: ['G1', 'G2', 'G3'],
    colors: [
      { hex: '#000000', name: 'Preto' },
      { hex: '#FFFFFF', name: 'Branco' },
      { hex: '#2C3E50', name: 'Azul Marinho' }
    ],
    priceRepresentative: 29.90,
    priceSacoleira: 39.90,
    images: ['https://picsum.photos/400/600?random=2'],
    category: 'Blusas',
    fabric: 'Algodão Egípcio',
    isHighlight: false
  }
];