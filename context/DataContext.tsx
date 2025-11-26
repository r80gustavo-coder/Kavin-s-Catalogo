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
        // Se a tabela não existir, ignora erro silenciosamente em dev
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
      const { id, groupId, ...rest } = product;
      
      // Ensure groupId is valid UUID or null (but for grouping we need it)
      const validGroupId = groupId && groupId.length > 10 ? groupId : null;

      const dbProduct = {
        group_id: validGroupId,
        reference: rest.reference,
        name: rest.name,
        description: rest.description,
        sizes: rest.sizes,
        colors: rest.colors, // Supabase handles JSONB automatically
        price_representative: Number(rest.priceRepresentative),
        price_sacoleira: Number(rest.priceSacoleira),
        images: rest.images,
        category: rest.category,
        fabric: rest.fabric,
        is_highlight: rest.isHighlight
      };

      const { error } = await supabase.from('products').insert([dbProduct]);
      
      if (error) {
          console.error("Supabase Insert Error:", error);
          throw new Error(error.message || JSON.stringify(error));
      }
      
      await fetchProducts();
    } catch (error: any) {
      console.error("Erro detalhado ao adicionar produto:", error);
      alert(`Erro ao salvar no banco de dados: ${error.message || "Erro desconhecido"}`);
      throw error;
    }
  };

  const updateProduct = async (product: Product) => {
    try {
      const dbProduct = {
        group_id: product.groupId,
        reference: product.reference,
        name: product.name,
        description: product.description,
        sizes: product.sizes,
        colors: product.colors,
        price_representative: Number(product.priceRepresentative),
        price_sacoleira: Number(product.priceSacoleira),
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
      alert(`Erro ao atualizar: ${error.message}`);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
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