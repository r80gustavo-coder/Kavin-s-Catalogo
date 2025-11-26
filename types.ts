export enum UserRole {
  ADMIN = 'ADMIN',
  REPRESENTANTE = 'REPRESENTANTE',
  SACOLEIRA = 'SACOLEIRA',
  GUEST = 'GUEST'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // stored for mock auth only
}

export interface ColorVariant {
  hex: string;
  name: string;
}

export interface Product {
  id: string;
  groupId?: string; // ID compartilhado entre variações do mesmo produto (P-GG e Plus Size)
  reference: string;
  name: string;
  description: string;
  sizes: string[]; // e.g., ["P", "M", "G"] or ["G1", "G2", "G3"]
  colors: ColorVariant[];
  priceRepresentative: number;
  priceSacoleira: number;
  images: string[]; // Array of URLs
  category?: string;
  fabric?: string;
  isHighlight?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}