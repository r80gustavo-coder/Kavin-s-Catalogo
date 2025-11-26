import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { INITIAL_PRODUCTS } from '../constants';

interface DataContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') console.warn("Tabela products não encontrada.");
        throw error;
      }

      if (data) {
        const formattedProducts: Product[] = data.map(p => ({
          id: p.id,
          groupId: p.group_id,
          reference: p.reference,
          name: p.name,
          description: p.description,
          sizes: p.sizes || [],
          colors: p.colors || [],
          priceRepresentative: Number(p.price_representative),
          priceSacoleira: Number(p.price_sacoleira),
          images: p.images || [],
          category: p.category,
          fabric: p.fabric,
          isHighlight: p.is_highlight
        }));
        setProducts(formattedProducts);
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      if (products.length === 0) setProducts(INITIAL_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (product: Product) => {
    try {
      // CHECK AUTH FIRST
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
         throw new Error("SESSÃO EXPIRADA OU MODO OFFLINE.\n\nVocê não está conectado ao servidor do Supabase. Verifique se você confirmou seu email e fez login corretamente. O modo offline não permite salvar alterações.");
      }

      const { id, groupId, ...rest } = product;
      
      const validGroupId = groupId && groupId.length > 10 ? groupId : null;
      
      // Sanitize Numbers
      const pRep = isNaN(Number(rest.priceRepresentative)) ? 0 : Number(rest.priceRepresentative);
      const pSac = isNaN(Number(rest.priceSacoleira)) ? 0 : Number(rest.priceSacoleira);

      const dbProduct = {
        group_id: validGroupId,
        reference: rest.reference,
        name: rest.name,
        description: rest.description,
        sizes: rest.sizes,
        colors: rest.colors, 
        price_representative: pRep,
        price_sacoleira: pSac,
        images: rest.images,
        category: rest.category,
        fabric: rest.fabric,
        is_highlight: rest.isHighlight
      };

      const { error } = await supabase.from('products').insert([dbProduct]);
      
      if (error) {
          console.error("Supabase Insert Error:", error);
          // Translate common errors
          if (error.message.includes("row-level security")) {
              throw new Error("PERMISSÃO NEGADA (RLS).\n\nSeu usuário não tem permissão de ADMIN no banco de dados. Tente sair e entrar novamente.");
          }
          throw new Error(error.message || JSON.stringify(error));
      }
      
      await fetchProducts();
    } catch (error: any) {
      console.error("Erro detalhado ao adicionar produto:", error);
      throw error; // Re-throw to be caught by the form
    }
  };

  const updateProduct = async (product: Product) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Você está em modo offline. Não é possível salvar.");

      const pRep = isNaN(Number(product.priceRepresentative)) ? 0 : Number(product.priceRepresentative);
      const pSac = isNaN(Number(product.priceSacoleira)) ? 0 : Number(product.priceSacoleira);

      const dbProduct = {
        group_id: product.groupId,
        reference: product.reference,
        name: product.name,
        description: product.description,
        sizes: product.sizes,
        colors: product.colors,
        price_representative: pRep,
        price_sacoleira: pSac,
        images: product.images,
        category: product.category,
        fabric: product.fabric,
        is_highlight: product.isHighlight
      };

      const { error } = await supabase
        .from('products')
        .update(dbProduct)
        .eq('id', product.id);

      if (error) throw new Error(error.message);
      await fetchProducts();
    } catch (error: any) {
      console.error("Erro ao atualizar produto:", error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Modo Offline");

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error("Erro ao deletar produto:", error);
      alert("Erro ao excluir: " + error.message);
    }
  };

  const deleteGroup = async (groupId: string) => {
     try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Modo Offline");

      const { error } = await supabase.from('products').delete().eq('group_id', groupId);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.groupId !== groupId));
    } catch (error: any) {
      console.error("Erro ao deletar grupo:", error);
      alert("Erro ao excluir grupo: " + error.message);
    }
  }

  return (
    <DataContext.Provider value={{ products, loading, addProduct, updateProduct, deleteProduct, deleteGroup, refreshProducts: fetchProducts }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};