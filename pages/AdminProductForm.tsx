import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Product, ColorVariant } from '../types';
import { supabase } from '../services/supabaseClient';
import { Plus, X, Save, ArrowLeft, Loader2, Upload, Star, Trash2, Package } from 'lucide-react';

interface Variation {
  id?: string;
  tempId: string;
  reference: string;
  sizes: string[];
  colors: ColorVariant[];
  priceRepresentative: number;
  priceSacoleira: number;
}

const AdminProductForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const { isOfflineMode } = useAuth();

  const isEditing = !!id;

  // --- DADOS GERAIS (Compartilhados entre variações) ---
  const [generalData, setGeneralData] = useState({
    name: '',
    description: '',
    category: 'Geral',
    fabric: '',
    isHighlight: false,
    images: [] as string[]
  });

  // --- VARIAÇÕES (Grades diferentes, ex: P-GG e G1-G3) ---
  const [variations, setVariations] = useState<Variation[]>([
    { tempId: '1', reference: '', sizes: [], colors: [], priceRepresentative: 0, priceSacoleira: 0 }
  ]);
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState<ColorVariant>({ hex: '#000000', name: '' });

  // Verificar modo offline
  useEffect(() => {
    if (isOfflineMode) {
      alert("AVISO: Modo Offline. Você não conseguirá salvar alterações.");
    }
  }, [isOfflineMode]);

  // Carregar dados na edição
  useEffect(() => {
    if (isEditing && id) {
      const product = products.find(p => p.id === id);
      if (product) {
        // Encontra todos os produtos que compartilham o mesmo GroupID
        const groupVariants = product.groupId 
          ? products.filter(p => p.groupId === product.groupId)
          : [product];

        setGeneralData({
          name: product.name,
          description: product.description,
          category: product.category || 'Geral',
          fabric: product.fabric || '',
          isHighlight: !!product.isHighlight,
          images: product.images || []
        });

        const vars: Variation[] = groupVariants.map(p => ({
          id: p.id,
          tempId: p.id,
          reference: p.reference,
          sizes: p.sizes,
          colors: p.colors,
          priceRepresentative: p.priceRepresentative,
          priceSacoleira: p.priceSacoleira
        }));
        setVariations(vars);
      }
    }
  }, [id, products, isEditing]);

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setGeneralData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Redimensionar imagem antes de enviar (Evita travar o navegador)
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1000; // Limite razoável para catálogo web
          const MAX_HEIGHT = 1333; // Proporção 3:4

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            reject(new Error('Canvas context error'));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsProcessingImg(true);
      const files = Array.from(e.target.files);
      const resized = await Promise.all(files.map(resizeImage));
      setGeneralData(prev => ({ ...prev, images: [...prev.images, ...resized] }));
      setIsProcessingImg(false);
    }
  };

  const removeImage = (idx: number) => {
    setGeneralData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const setMainImage = (index: number) => {
    if (index === 0) return;
    setGeneralData(prev => {
      const newImages = [...prev.images];
      const [selected] = newImages.splice(index, 1);
      newImages.unshift(selected);
      return { ...prev, images: newImages };
    });
  };

  // Funções de Variação
  const getCurrentVariation = () => variations[activeVariationIndex];

  const updateCurrentVariation = (field: keyof Variation, value: any) => {
    setVariations(prev => {
      const newVars = [...prev];
      newVars[activeVariationIndex] = { ...newVars[activeVariationIndex], [field]: value };
      return newVars;
    });
  };

  const addVariation = () => {
    setVariations(prev => [
      ...prev, 
      { 
        tempId: Date.now().toString(), 
        reference: '', 
        sizes: [], 
        colors: [], 
        priceRepresentative: 0, 
        priceSacoleira: 0 
      }
    ]);
    setActiveVariationIndex(variations.length); 
  };

  const removeVariation = (index: number) => {
    if (variations.length === 1) {
      alert("Você precisa ter pelo menos uma variação.");
      return;
    }
    setVariations(prev => prev.filter((_, i) => i !== index));
    if (activeVariationIndex >= index && activeVariationIndex > 0) {
      setActiveVariationIndex(activeVariationIndex - 1);
    }
  };

  // Botões Rápidos de Tamanho
  const toggleSizeGroup = (group: 'STANDARD' | 'PLUS') => {
    const standardSizes = ['P', 'M', 'G', 'GG'];
    const plusSizes = ['G1', 'G2', 'G3'];
    const targetSizes = group === 'STANDARD' ? standardSizes : plusSizes;
    
    updateCurrentVariation('sizes', targetSizes);
  };

  const addSize = () => {
    if (sizeInput && !getCurrentVariation().sizes.includes(sizeInput)) {
      updateCurrentVariation('sizes', [...getCurrentVariation().sizes, sizeInput]);
      setSizeInput('');
    }
  };

  const addColor = () => {
    if (colorInput.name && colorInput.hex) {
      updateCurrentVariation('colors', [...getCurrentVariation().colors, colorInput]);
      setColorInput({ hex: '#000000', name: '' });
    }
  };

  const base64ToBlob = async (url: string) => {
    const res = await fetch(url);
    return await res.blob();
  };

  // Upload para Supabase Storage
  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const img of generalData.images) {
      if (img.startsWith('http')) {
        uploadedUrls.push(img);
      } else {
        try {
          const blob = await base64ToBlob(img);
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          const { error } = await supabase.storage.from('product-images').upload(fileName, blob);
          
          if (!error) {
            const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
            uploadedUrls.push(data.publicUrl);
          } else {
            console.error("Erro upload Supabase:", error);
            // Fallback: Se falhar upload (ex: permissão), tenta salvar base64 direto (não recomendado mas evita perda)
            // Mas idealmente, alertamos o usuário
            throw new Error("Falha no upload da imagem: " + error.message);
          }
        } catch (e) {
          console.error(e);
          throw e;
        }
      }
    }
    return uploadedUrls;
  };

  const handleSave = async () => {
    if (isOfflineMode) {
      alert("ERRO: Você está offline. Faça login novamente para salvar.");
      navigate('/login');
      return;
    }

    if (generalData.images.length === 0) return alert("Adicione pelo menos uma foto.");
    if (!generalData.name) return alert("Adicione o Nome do produto.");
    
    // Validação
    for (const v of variations) {
      if (!v.reference) return alert("Todas as variações precisam de um Código/Referência.");
      if (v.sizes.length === 0) return alert(`A referência ${v.reference} está sem tamanhos.`);
    }

    setIsSaving(true);
    try {
      // 1. Upload Imagens
      const finalImages = await uploadImages();
      
      // 2. Definir Group ID
      let groupId = isEditing && products.find(p => p.id === id)?.groupId;
      if (!groupId) {
         groupId = crypto.randomUUID(); // Gera ID único para o grupo
      }

      // 3. Salvar cada variação como um produto no banco
      const keptIds: string[] = [];

      for (const v of variations) {
        const productPayload: Product = {
          id: v.id || '',
          groupId: groupId,
          name: generalData.name,
          description: generalData.description,
          category: generalData.category,
          fabric: generalData.fabric,
          isHighlight: generalData.isHighlight,
          images: finalImages, // Mesmas imagens para todos
          reference: v.reference,
          sizes: v.sizes,
          colors: v.colors,
          priceRepresentative: v.priceRepresentative,
          priceSacoleira: v.priceSacoleira
        };

        if (v.id) {
          await updateProduct(productPayload);
          keptIds.push(v.id);
        } else {
          // Adiciona e espera o ID gerado (não capturamos aqui fácil no insert void, mas o refresh resolve)
          await addProduct(productPayload);
        }
      }

      // 4. Se editando, remover variações que foram excluídas da lista
      if (isEditing) {
         const originalProduct = products.find(p => p.id === id);
         if (originalProduct && originalProduct.groupId) {
             const allGroupProducts = products.filter(p => p.groupId === originalProduct.groupId);
             for (const p of allGroupProducts) {
                 // Se o produto existia no grupo mas não está na lista atual de variações com ID
                 // E se ele não foi recém adicionado (recém adicionados não tem ID no variations state inicial)
                 const stillExists = variations.some(v => v.id === p.id);
                 if (!stillExists) {
                     await deleteProduct(p.id);
                 }
             }
         }
      }

      alert("Produto salvo com sucesso!");
      navigate('/');
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center text-gray-500 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Catálogo
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
            <h1 className="text-white font-bold text-xl">
              {isEditing ? 'Editar Produto' : 'Novo Produto Kavin\'s'}
            </h1>
            <button 
                onClick={handleSave} 
                disabled={isSaving || isOfflineMode} 
                className="bg-white text-gray-900 px-4 py-2 rounded font-bold flex items-center hover:bg-gray-100 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* COLUNA ESQUERDA: FOTOS E DADOS GERAIS */}
            <div className="lg:col-span-1 space-y-6">
               <div className="space-y-2">
                 <label className="font-bold text-gray-700">Fotos (Para todas as variações)</label>
                 <div className="grid grid-cols-2 gap-2">
                   {generalData.images.map((img, i) => (
                     <div key={i} className="relative aspect-[3/4] rounded overflow-hidden group border">
                        <img src={img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-1 transition-opacity">
                           {i !== 0 && <button onClick={() => setMainImage(i)} className="text-[10px] bg-white px-2 rounded hover:bg-gray-200">Definir Capa</button>}
                           <button onClick={() => removeImage(i)} className="text-[10px] bg-red-500 text-white px-2 rounded hover:bg-red-600">Excluir</button>
                        </div>
                     </div>
                   ))}
                   <label className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                      {isProcessingImg ? <Loader2 className="animate-spin text-gray-400" /> : <Upload className="text-gray-400 mb-2" />}
                      <span className="text-xs text-gray-500 text-center px-2">Clique para<br/>enviar fotos</span>
                      <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                   </label>
                 </div>
               </div>

               <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Nome do Modelo</label>
                    <input name="name" value={generalData.name} onChange={handleGeneralChange} className="w-full border rounded p-2 focus:ring-1 focus:ring-gray-900" placeholder="Ex: Vestido Longo" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Categoria</label>
                    <input name="category" value={generalData.category} onChange={handleGeneralChange} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tecido</label>
                    <input name="fabric" value={generalData.fabric} onChange={handleGeneralChange} className="w-full border rounded p-2" placeholder="Ex: Viscose" />
                  </div>
                   <div 
                    className={`flex items-center p-3 rounded border cursor-pointer select-none transition-colors ${generalData.isHighlight ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}
                    onClick={() => setGeneralData(p => ({...p, isHighlight: !p.isHighlight}))}
                  >
                    <Star className={`w-5 h-5 mr-2 ${generalData.isHighlight ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-700">Destacar na Home</span>
                  </div>
               </div>
            </div>

            {/* COLUNA DIREITA: VARIAÇÕES E DESCRIÇÃO */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* PAINEL DE VARIAÇÕES (ABAS) */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-lg flex items-center text-gray-800"><Package className="w-5 h-5 mr-2"/> Grades / Variações</h3>
                   <button onClick={addVariation} className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded flex items-center hover:bg-black transition-colors shadow-sm">
                     <Plus className="w-3 h-3 mr-1"/> Adicionar Nova Grade
                   </button>
                </div>

                {/* Abas das variações */}
                <div className="flex space-x-1 border-b border-gray-300 mb-4 overflow-x-auto">
                   {variations.map((v, idx) => (
                     <button
                       key={v.tempId}
                       onClick={() => setActiveVariationIndex(idx)}
                       className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-t border-l border-r ${
                         activeVariationIndex === idx 
                            ? 'bg-white border-b-0 border-gray-300 text-primary-700' 
                            : 'bg-gray-100 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                       }`}
                     >
                       {v.reference || `Grade ${idx + 1}`}
                     </button>
                   ))}
                </div>

                {/* Conteúdo da Variação Ativa */}
                <div className="bg-white p-5 rounded-b-lg rounded-tr-lg border border-gray-200 border-t-0 -mt-4 shadow-sm">
                   <div className="flex justify-end mb-2">
                      <button onClick={() => removeVariation(activeVariationIndex)} className="text-red-500 text-xs flex items-center hover:underline hover:text-red-700">
                        <Trash2 className="w-3 h-3 mr-1"/> Excluir esta grade
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código / Referência</label>
                        <input 
                          value={getCurrentVariation().reference} 
                          onChange={(e) => updateCurrentVariation('reference', e.target.value)}
                          className="w-full border-b-2 border-gray-300 focus:border-primary-600 outline-none py-2 text-xl font-mono text-gray-800 bg-transparent transition-colors"
                          placeholder="Ex: REF-001"
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Representante</label>
                          <div className="relative">
                            <span className="absolute left-2 top-2 text-gray-500 text-sm">R$</span>
                            <input type="number" value={getCurrentVariation().priceRepresentative} onChange={(e) => updateCurrentVariation('priceRepresentative', parseFloat(e.target.value))} className="w-full border rounded pl-8 py-1.5" />
                          </div>
                        </div>
                         <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Sacoleira</label>
                          <div className="relative">
                            <span className="absolute left-2 top-2 text-gray-500 text-sm">R$</span>
                            <input type="number" value={getCurrentVariation().priceSacoleira} onChange={(e) => updateCurrentVariation('priceSacoleira', parseFloat(e.target.value))} className="w-full border rounded pl-8 py-1.5"/>
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tamanhos</label>
                      <div className="flex gap-2 mb-3">
                        <button onClick={() => toggleSizeGroup('STANDARD')} className="px-3 py-1 bg-white text-xs font-medium rounded border shadow-sm hover:bg-gray-100 transition-colors">P ao GG</button>
                        <button onClick={() => toggleSizeGroup('PLUS')} className="px-3 py-1 bg-white text-xs font-medium rounded border shadow-sm hover:bg-gray-100 transition-colors">G1 ao G3</button>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {getCurrentVariation().sizes.map((s, i) => (
                           <span key={i} className="bg-gray-800 text-white px-2.5 py-1 rounded text-sm flex items-center shadow-sm">
                             {s} <X className="w-3 h-3 ml-1.5 cursor-pointer hover:text-gray-300" onClick={() => updateCurrentVariation('sizes', getCurrentVariation().sizes.filter((_, idx) => idx !== i))}/>
                           </span>
                        ))}
                        <div className="flex items-center ml-2">
                            <input value={sizeInput} onChange={e => setSizeInput(e.target.value)} className="border border-gray-300 rounded-l px-2 py-1 w-16 text-sm focus:outline-none focus:border-gray-500" placeholder="Tam" />
                            <button onClick={addSize} className="bg-gray-200 border border-gray-300 border-l-0 rounded-r p-1 hover:bg-gray-300"><Plus className="w-4 h-4 text-gray-600"/></button>
                        </div>
                      </div>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cores Disponíveis</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                         {getCurrentVariation().colors.map((c, i) => (
                           <div key={i} className="flex items-center bg-white border rounded-full pl-1 pr-2 py-1 shadow-sm">
                             <div className="w-5 h-5 rounded-full mr-2 border border-gray-200" style={{backgroundColor: c.hex}} />
                             <span className="text-xs mr-2 font-medium">{c.name}</span>
                             <X className="w-3.5 h-3.5 cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => updateCurrentVariation('colors', getCurrentVariation().colors.filter((_, idx) => idx !== i))}/>
                           </div>
                         ))}
                      </div>
                      <div className="flex gap-2 items-center p-2 bg-gray-50 rounded border border-gray-100">
                         <input type="color" value={colorInput.hex} onChange={e => setColorInput({...colorInput, hex: e.target.value})} className="h-9 w-9 rounded cursor-pointer border-0 bg-transparent" />
                         <input value={colorInput.name} onChange={e => setColorInput({...colorInput, name: e.target.value})} placeholder="Nome da Cor (ex: Azul)" className="border rounded px-3 py-1.5 text-sm flex-1"/>
                         <button onClick={addColor} className="bg-gray-900 text-white px-4 py-1.5 rounded text-sm hover:bg-black transition-colors">Adicionar Cor</button>
                      </div>
                   </div>

                </div>
              </div>

              {/* DESCRIÇÃO MANUAL */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                 <div className="mb-2">
                   <label className="font-bold text-gray-700">Descrição do Produto</label>
                   <p className="text-xs text-gray-500">Escreva detalhes sobre o tecido, caimento e ocasiões de uso.</p>
                 </div>
                 <textarea 
                    name="description" 
                    value={generalData.description} 
                    onChange={handleGeneralChange} 
                    className="w-full border border-gray-300 rounded-lg p-3 h-32 text-sm focus:ring-1 focus:ring-gray-900 outline-none resize-y"
                    placeholder="Ex: Vestido confeccionado em viscose premium, toque macio, ideal para festas..."
                 />
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductForm;