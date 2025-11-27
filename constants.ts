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
    email: 'representante@kavins.com', // LOGIN VIP
    role: UserRole.REPRESENTANTE,
    password: 'repre2026'
  },
  {
    id: 'user-sacoleira',
    name: 'Sacoleira Kavin',
    email: 'sacoleira@kavins.com', // LOGIN VIP
    role: UserRole.SACOLEIRA,
    password: 'sacoleira2026'
  }
];

export const INITIAL_PRODUCTS: Product[] = [];