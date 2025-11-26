import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Product, ColorVariant } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { Wand2, Plus, X, Save, ArrowLeft, Loader2, Upload, Check, Star, Trash2, Package } from 'lucide-react';

interface Variation {
  id?: string; // Existing ID if editing
  tempId: string; // To track in UI
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

  const isEditing = !!id;

  // --- GLOBAL DATA (Shared by all variants) ---
  const [generalData, setGeneralData] = useState({
    name: '',
    description: '',
    category: 'Geral',
    fabric: '',
    isHighlight: false,
    images: [] as string[]
  });

  // --- VARIATIONS (List of Ref/Size/Color/Price) ---
  const [variations, setVariations] = useState<Variation[]>([
    { tempId: '1', reference: '', sizes: [], colors: [], priceRepresentative: 0, priceSacoleira: 0 }
  ]);
  const [activeVariationIndex, setActiveVariationIndex] = useState(0);

  // --- UI STATE ---
  const [loadingAI, setLoadingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // --- INPUT HELPERS ---
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState<ColorVariant>({ hex: '#000000', name: '' });

  // LOAD DATA FOR EDITING
  useEffect(() => {
    if (isEditing && id) {
      // Find the product and ALL its group siblings
      const product = products.find(p => p.id === id);
      if (product) {
        // Find other products with same group_id
        const groupVariants = product.groupId 
          ? products.filter(p => p.groupId === product.groupId)
          : [product];

        // Set General Data from the first one
        setGeneralData({
          name: product.name,
          description: product.description,
          category: product.category || 'Geral',
          fabric: product.fabric || '',
          isHighlight: !!product.isHighlight,
          images: product.images || []
        });

        // Set Variations
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

  // --- HANDLERS FOR GENERAL DATA ---
  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setGeneralData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- HANDLERS FOR IMAGES ---
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1600;

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
            reject(new Error('Canvas context not available'));
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

  // --- HANDLERS FOR VARIATIONS ---
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
    setActiveVariationIndex(variations.length); // Switch to new tab
  };

  const removeVariation = (index: number) => {
    if (variations.length === 1) {
      alert("Você precisa ter pelo menos uma variação.");
      return;
    }
    const variationToRemove = variations[index];
    
    // If we are editing and this variation exists in DB, we should technically delete it from DB upon save
    // For simplicity here, we will just remove from list. 
    // Ideally, we'd track 'deletedIds' and process them on Save.
    if (variationToRemove.id) {
       if (confirm("Esta variação já existe. Ela será removida ao salvar. Continuar?")) {
           // We will handle deletion logic in handleSave by comparing IDs
       } else {
           return;
       }
    }

    setVariations(prev => prev.filter((_, i) => i !== index));
    if (activeVariationIndex >= index && activeVariationIndex > 0) {
      setActiveVariationIndex(activeVariationIndex - 1);
    }
  };

  // --- SIZES & COLORS (Apply to Current Variation) ---
  const toggleSizeGroup = (group: 'STANDARD' | 'PLUS') => {
    const standardSizes = ['P', 'M', 'G', 'GG'];
    const plusSizes = ['G1', 'G2', 'G3'];
    const targetSizes = group === 'STANDARD' ? standardSizes : plusSizes;
    const currentSizes = getCurrentVariation().sizes;
    
    const allExist = targetSizes.every(s => currentSizes.includes(s));
    
    let newSizes;
    if (allExist) {
      newSizes = currentSizes.filter(s => !targetSizes.includes(s));
    } else {
      newSizes = Array.from(new Set([...currentSizes, ...targetSizes]));
    }
    updateCurrentVariation('sizes', newSizes);
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

  // --- AI GENERATION ---
  const handleGenerateDescription = async () => {
    if (!generalData.name) { alert("Preencha o Nome."); return; }
    setLoadingAI(true);
    // Use data from first variation for context
    const firstVar = variations[0];
    const desc = await generateProductDescription(
      generalData.name,
      firstVar.reference,
      firstVar.colors.map(c => c.name),
      generalData.category,
      generalData.fabric
    );
    setGeneralData(prev => ({ ...prev, description: desc }));
    setLoadingAI(false);
  };

  // --- SAVE LOGIC ---
  const base64ToBlob = async (url: string) => {
    const res = await fetch(url);
    return await res.blob();
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const img of generalData.images) {
      if (img.startsWith('http')) {
        uploadedUrls.push(img);
      } else {
        const blob = await base64ToBlob(img);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const { error } = await supabase.storage.from('product-images').upload(fileName, blob);
        if (!error) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          uploadedUrls.push(data.publicUrl);
        }
      }
    }
    return uploadedUrls;
  };

  const handleSave = async () => {
    // Validations
    if (generalData.images.length === 0) return alert("Adicione fotos.");
    if (!generalData.name) return alert("Adicione um nome.");
    for (const v of variations) {
      if (!v.reference) return alert(`Referência faltando na variação ${v.reference || '(sem ref)'}`);
      if (v.sizes.length === 0) return alert(`Tamanhos faltando na variação ${v.reference}`);
    }

    setIsSaving(true);
    try {
      const finalImages = await uploadImages();
      
      // Determine Group ID
      // If editing and product has group, use it. Else generate new.
      let groupId = isEditing && products.find(p => p.id === id)?.groupId;
      if (!groupId) {
         // Generate a new UUID if we don't have one (simple random for now, or let DB handle if we inserted one parent)
         // Since we are inserting multiple rows, we need a shared ID.
         groupId = crypto.randomUUID(); 
      }

      // Process Variations
      for (const v of variations) {
        const productPayload: Product = {
          id: v.id || '', // Empty for new
          groupId: groupId,
          name: generalData.name,
          description: generalData.description,
          category: generalData.category,
          fabric: generalData.fabric,
          isHighlight: generalData.isHighlight,
          images: finalImages,
          // Variation Specifics
          reference: v.reference,
          sizes: v.sizes,
          colors: v.colors,
          priceRepresentative: v.priceRepresentative,
          priceSacoleira: v.priceSacoleira
        };

        if (v.id) {
          await updateProduct(productPayload);
        } else {
          await addProduct(productPayload);
        }
      }

      // Handle Deleted Variations (if editing)
      if (isEditing) {
         const originalProduct = products.find(p => p.id === id);
         if (originalProduct && originalProduct.groupId) {
             const allGroupProducts = products.filter(p => p.groupId === originalProduct.groupId);
             const keptIds = variations.map(v => v.id).filter(Boolean);
             for (const p of allGroupProducts) {
                 if (!keptIds.includes(p.id)) {
                     await deleteProduct(p.id);
                 }
             }
         }
      }

      alert("Produto salvo com sucesso!");
      navigate('/');
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar.");
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
              {isEditing ? 'Editar Produto e Variações' : 'Novo Produto'}
            </h1>
            <button onClick={handleSave} disabled={isSaving} className="bg-white text-gray-900 px-4 py-2 rounded font-bold hover:bg-gray-100 flex items-center">
              {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Tudo
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: GLOBAL IMAGES & INFO */}
            <div className="lg:col-span-1 space-y-6">
               {/* Images */}
               <div className="space-y-2">
                 <label className="font-bold text-gray-700">Fotos (Compartilhadas)</label>
                 <div className="grid grid-cols-2 gap-2">
                   {generalData.images.map((img, i) => (
                     <div key={i} className="relative aspect-[3/4] rounded overflow-hidden group border">
                        <img src={img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-1 transition-opacity">
                           {i !== 0 && <button onClick={() => setMainImage(i)} className="text-[10px] bg-white px-2 rounded">Capa</button>}
                           <button onClick={() => removeImage(i)} className="text-[10px] bg-red-500 text-white px-2 rounded">Excluir</button>
                        </div>
                     </div>
                   ))}
                   <label className="aspect-[3/4] border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                      {isProcessingImg ? <Loader2 className="animate-spin" /> : <Upload className="text-gray-400" />}
                      <span className="text-xs text-gray-500 mt-1">Adicionar</span>
                      <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                   </label>
                 </div>
               </div>

               {/* Global Fields */}
               <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Nome do Modelo</label>
                    <input name="name" value={generalData.name} onChange={handleGeneralChange} className="w-full border rounded p-2" placeholder="Ex: Vestido Floral" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Categoria</label>
                    <input name="category" value={generalData.category} onChange={handleGeneralChange} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tecido</label>
                    <input name="fabric" value={generalData.fabric} onChange={handleGeneralChange} className="w-full border rounded p-2" />
                  </div>
                   <div 
                    className={`flex items-center p-3 rounded border cursor-pointer ${generalData.isHighlight ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'}`}
                    onClick={() => setGeneralData(p => ({...p, isHighlight: !p.isHighlight}))}
                  >
                    <Star className={`w-5 h-5 mr-2 ${generalData.isHighlight ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">Destaque na Home</span>
                  </div>
               </div>
            </div>

            {/* RIGHT COLUMN: VARIATIONS & DESCRIPTION */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Variations Tabs */}
              <div className="border rounded-xl p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-lg flex items-center"><Package className="w-5 h-5 mr-2"/> Variações / Grades</h3>
                   <button onClick={addVariation} className="text-sm bg-gray-900 text-white px-3 py-1 rounded flex items-center hover:bg-black">
                     <Plus className="w-3 h-3 mr-1"/> Nova Grade
                   </button>
                </div>

                {/* Tabs Header */}
                <div className="flex space-x-1 border-b mb-4 overflow-x-auto">
                   {variations.map((v, idx) => (
                     <button
                       key={v.tempId}
                       onClick={() => setActiveVariationIndex(idx)}
                       className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                         activeVariationIndex === idx ? 'bg-white border border-b-0 text-primary-600' : 'bg-transparent text-gray-500 hover:text-gray-700'
                       }`}
                     >
                       {v.reference || `Grade ${idx + 1}`}
                     </button>
                   ))}
                </div>

                {/* Active Variation Content */}
                <div className="bg-white p-4 rounded-b-lg rounded-tr-lg border border-t-0 -mt-4 pt-6">
                   <div className="flex justify-end mb-2">
                      <button onClick={() => removeVariation(activeVariationIndex)} className="text-red-500 text-xs flex items-center hover:underline">
                        <Trash2 className="w-3 h-3 mr-1"/> Remover esta variação
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Referência da Grade</label>
                        <input 
                          value={getCurrentVariation().reference} 
                          onChange={(e) => updateCurrentVariation('reference', e.target.value)}
                          className="w-full border-b-2 border-gray-200 focus:border-primary-500 outline-none py-1 text-lg font-mono"
                          placeholder="Ex: REF-001-P"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase">Preço Rep.</label>
                          <input type="number" value={getCurrentVariation().priceRepresentative} onChange={(e) => updateCurrentVariation('priceRepresentative', parseFloat(e.target.value))} className="w-full border rounded p-1"/>
                        </div>
                         <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase">Preço Sacoleira</label>
                          <input type="number" value={getCurrentVariation().priceSacoleira} onChange={(e) => updateCurrentVariation('priceSacoleira', parseFloat(e.target.value))} className="w-full border rounded p-1"/>
                        </div>
                      </div>
                   </div>

                   {/* Sizes */}
                   <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tamanhos</label>
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => toggleSizeGroup('STANDARD')} className="px-2 py-1 bg-gray-100 text-xs rounded border hover:bg-gray-200">P ao GG</button>
                        <button onClick={() => toggleSizeGroup('PLUS')} className="px-2 py-1 bg-gray-100 text-xs rounded border hover:bg-gray-200">G1 ao G3</button>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {getCurrentVariation().sizes.map((s, i) => (
                           <span key={i} className="bg-gray-800 text-white px-2 py-1 rounded text-xs flex items-center">
                             {s} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => updateCurrentVariation('sizes', getCurrentVariation().sizes.filter((_, idx) => idx !== i))}/>
                           </span>
                        ))}
                        <input value={sizeInput} onChange={e => setSizeInput(e.target.value)} className="border rounded px-2 py-1 w-20 text-sm" placeholder="Add..." />
                        <button onClick={addSize} className="bg-gray-200 p-1 rounded"><Plus className="w-4 h-4"/></button>
                      </div>
                   </div>

                   {/* Colors */}
                   <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cores</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                         {getCurrentVariation().colors.map((c, i) => (
                           <div key={i} className="flex items-center bg-gray-50 border rounded px-2 py-1">
                             <div className="w-4 h-4 rounded-full mr-2 border" style={{backgroundColor: c.hex}} />
                             <span className="text-xs mr-2">{c.name}</span>
                             <X className="w-3 h-3 cursor-pointer text-red-500" onClick={() => updateCurrentVariation('colors', getCurrentVariation().colors.filter((_, idx) => idx !== i))}/>
                           </div>
                         ))}
                      </div>
                      <div className="flex gap-2 items-center">
                         <input type="color" value={colorInput.hex} onChange={e => setColorInput({...colorInput, hex: e.target.value})} className="h-8 w-8 rounded cursor-pointer border-0" />
                         <input value={colorInput.name} onChange={e => setColorInput({...colorInput, name: e.target.value})} placeholder="Nome da Cor" className="border rounded px-2 py-1 text-sm"/>
                         <button onClick={addColor} className="bg-gray-900 text-white px-3 py-1 rounded text-sm">Add</button>
                      </div>
                   </div>

                </div>
              </div>

              {/* Description */}
              <div className="border rounded-xl p-4">
                 <div className="flex justify-between mb-2">
                   <label className="font-bold text-gray-700">Descrição</label>
                   <button onClick={handleGenerateDescription} disabled={loadingAI} className="text-purple-600 text-xs flex items-center hover:bg-purple-50 px-2 rounded">
                     {loadingAI ? <Loader2 className="animate-spin mr-1"/> : <Wand2 className="w-3 h-3 mr-1"/>} Gerar com IA
                   </button>
                 </div>
                 <textarea 
                    name="description" 
                    value={generalData.description} 
                    onChange={handleGeneralChange} 
                    className="w-full border rounded p-3 h-32 text-sm"
                    placeholder="Descrição detalhada do produto..."
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