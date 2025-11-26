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
        // Mapear campos do banco para o frontend (snake_case para camelCase se necessário)
        // No nosso caso, o banco foi criado compativel, exceto underscore fields
        const formattedProducts: Product[] = data.map(p => ({
          id: p.id,
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
      // Fallback to mock data if connection fails or table empty
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
      // Remover ID gerado no front se for novo, deixar Supabase gerar UUID
      // Mas se já tiver ID (ex: edição), manter.
      // Para inserção, vamos omitir o ID se ele for um placeholder temporário
      const { id, ...rest } = product;
      
      const dbProduct = {
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

  return (
    <DataContext.Provider value={{ products, loading, addProduct, updateProduct, deleteProduct, refreshProducts: fetchProducts }}>
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
