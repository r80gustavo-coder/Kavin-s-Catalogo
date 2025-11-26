import React, { useState } from 'react';
import { Product, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { Tag, Edit, Trash2, ShoppingBag, ChevronLeft, ChevronRight, Star, Layers } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isRep = user?.role === UserRole.REPRESENTANTE;
  const isSacoleira = user?.role === UserRole.SACOLEIRA;
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const showPrice = isAdmin || isRep || isSacoleira;

  const images = product.images || [];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full group/card">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        {images.length > 0 ? (
          <img 
            src={images[currentImageIndex]} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Sem Imagem
          </div>
        )}
        
        {/* Navigation Arrows for Multiple Images */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity z-10 shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity z-10 shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-1.5 h-1.5 rounded-full shadow-sm ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
           <div className="bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm shadow-sm font-medium">
            {product.reference}
          </div>
          {product.isHighlight && (
            <div className="bg-yellow-400 text-yellow-900 text-[10px] px-2 py-1 rounded shadow-sm font-bold flex items-center">
              <Star className="w-3 h-3 mr-0.5 fill-current" /> Destaque
            </div>
          )}
        </div>

        
        {isAdmin && (
          <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-20">
            <button 
              onClick={() => onEdit && onEdit(product)}
              className="p-2 bg-white text-blue-600 rounded-full shadow hover:bg-blue-50"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onDelete && onDelete(product.id)}
              className="p-2 bg-white text-red-600 rounded-full shadow hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2">
           <h3 className="text-lg font-bold text-gray-900 leading-tight">{product.name}</h3>
           <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{product.category || 'Geral'}</span>
              {product.fabric && (
                <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  <Layers className="w-3 h-3 mr-1" />
                  {product.fabric}
                </span>
              )}
           </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">{product.description}</p>

        <div className="space-y-4 mt-auto">
          {/* Colors - Large circles for good visibility */}
          <div>
            <div className="flex flex-wrap gap-2">
              {product.colors && product.colors.map((color, idx) => (
                <div key={idx} className="group relative">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-md ring-1 ring-gray-100 cursor-help transition-transform hover:scale-110" 
                    style={{ backgroundColor: color.hex }}
                  />
                  {/* Tooltip for Color Name */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                    {color.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="flex flex-wrap gap-1">
             {product.sizes && product.sizes.map((size, idx) => (
               <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded border border-gray-200">
                 {size}
               </span>
             ))}
          </div>

          {/* Pricing Logic */}
          <div className="pt-3 border-t border-gray-100">
            {!showPrice ? (
              <div className="text-center p-2 bg-gray-50 rounded border border-dashed border-gray-300">
                <p className="text-xs text-gray-500 font-medium">Faça login para ver preços</p>
              </div>
            ) : (
              <div className="space-y-1">
                {(isAdmin || isRep) && (
                   <div className="flex justify-between items-center bg-purple-50 p-2 rounded">
                      <span className="text-xs text-purple-800 font-medium flex items-center">
                        <Tag className="w-3 h-3 mr-1" /> Rep.
                      </span>
                      <span className="text-base font-bold text-purple-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.priceRepresentative)}
                      </span>
                   </div>
                )}
                {(isAdmin || isSacoleira) && (
                   <div className="flex justify-between items-center bg-emerald-50 p-2 rounded">
                      <span className="text-xs text-emerald-800 font-medium flex items-center">
                         <ShoppingBag className="w-3 h-3 mr-1" /> Sacoleira
                      </span>
                      <span className="text-base font-bold text-emerald-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.priceSacoleira)}
                      </span>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;