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
          priceRepresentative: p.price_representative,
          priceSacoleira: p.price_sacoleira,
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
      
      const dbProduct = {
        group_id: groupId,
        reference: rest.reference,
        name: rest.name,
        description: rest.description,
        sizes: rest.sizes,
        colors: rest.colors,
        price_representative: rest.priceRepresentative,
        price_sacoleira: rest.priceSacoleira,
        images: rest.images,
        category: rest.category,
        fabric: rest.fabric,
        is_highlight: rest.isHighlight
      };

      const { error } = await supabase.from('products').insert([dbProduct]);
      
      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      alert("Erro ao salvar no banco de dados.");
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
        price_representative: product.priceRepresentative,
        price_sacoleira: product.priceSacoleira,
        images: product.images,
        category: product.category,
        fabric: product.fabric,
        is_highlight: product.isHighlight
      };

      const { error } = await supabase
        .from('products')
        .update(dbProduct)
        .eq('id', product.id);

      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      alert("Erro ao excluir.");
    }
  };

  // Deleta todas as variações de um grupo
  const deleteGroup = async (groupId: string) => {
     try {
      const { error } = await supabase.from('products').delete().eq('group_id', groupId);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.groupId !== groupId));
    } catch (error) {
      console.error("Erro ao deletar grupo:", error);
      alert("Erro ao excluir grupo.");
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