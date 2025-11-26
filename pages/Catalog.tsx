import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import ProductCard from '../components/ProductCard';
import { Search, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Catalog: React.FC = () => {
  const { products, deleteProduct } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Derive categories
  const categories = Array.from(new Set(products.map(p => p.category || 'Geral')));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (categoryFilter === 'highlights') {
      matchesCategory = !!p.isHighlight;
    } else if (categoryFilter !== 'all') {
      matchesCategory = p.category === categoryFilter;
    }

    return matchesSearch && matchesCategory;
  });

  const handleEdit = (product: any) => {
    navigate(`/admin/products/edit/${product.id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      deleteProduct(id);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Sticky Header Section */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
             {/* Search */}
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm transition-shadow"
                placeholder="Buscar referência ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category Pills */}
            <div className="w-full md:w-auto overflow-x-auto scrollbar-hide">
              <div className="flex space-x-2 py-1">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === 'all' 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>

                 <button
                  onClick={() => setCategoryFilter('highlights')}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center ${
                    categoryFilter === 'highlights' 
                      ? 'bg-yellow-400 text-yellow-900 shadow-md ring-1 ring-yellow-500' 
                      : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                  Destaques
                </button>

                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      categoryFilter === cat 
                        ? 'bg-gray-900 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {categoryFilter === 'all' 
              ? 'Coleção Completa' 
              : categoryFilter === 'highlights' 
                ? 'Destaques da Kavin\'s' 
                : categoryFilter}
          </h2>
          <p className="text-sm text-gray-500">{filteredProducts.length} peças encontradas</p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
              <Search className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Nenhum produto encontrado</h3>
            <p className="mt-1 text-gray-500">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onEdit={user?.role === UserRole.ADMIN ? handleEdit : undefined}
                onDelete={user?.role === UserRole.ADMIN ? handleDelete : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;