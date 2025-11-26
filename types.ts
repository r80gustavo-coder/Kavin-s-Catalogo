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
  reference: string;
  name: string;
  description: string;
  sizes: string[]; // e.g., ["P", "M", "G"] or ["G1", "G2", "G3"]
  colors: ColorVariant[];
  priceRepresentative: number;
  priceSacoleira: number;
  images: string[]; // Array of base64 strings or URLs
  category?: string;
  fabric?: string; // New field for Fabric type
  isHighlight?: boolean; // New field for Highlights
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}