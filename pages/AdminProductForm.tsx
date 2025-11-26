import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Product, ColorVariant } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { Wand2, Plus, X, Save, ArrowLeft, Loader2, Upload, Copy, AlertTriangle, Star, Check } from 'lucide-react';

const AdminProductForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { products, addProduct, updateProduct } = useData();

  const isEditing = !!id;

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    reference: '',
    name: '',
    description: '',
    sizes: [],
    colors: [],
    priceRepresentative: 0,
    priceSacoleira: 0,
    images: [], // Pode conter URLs (http) ou Base64 (data:image) temporário
    category: 'Geral',
    fabric: '',
    isHighlight: false
  });

  const [loadingAI, setLoadingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState<ColorVariant>({ hex: '#000000', name: '' });
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      const product = products.find(p => p.id === id);
      if (product) {
        const { id: _, ...rest } = product;
        setFormData(rest);
      }
    }
  }, [id, products, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.startsWith('price') ? parseFloat(value) || 0 : value
    }));
  };

  const handleToggleHighlight = () => {
    setFormData(prev => ({ ...prev, isHighlight: !prev.isHighlight }));
  };

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
    const filesList = e.target.files;
    if (filesList && filesList.length > 0) {
      setIsProcessingImg(true);
      try {
        const files = Array.from(filesList);
        // Apenas redimensiona para preview local (Base64). 
        // O upload real para o Supabase acontece no Save.
        const resizedImages = await Promise.all(files.map(f => resizeImage(f)));
        
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...resizedImages]
        }));
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const setMainImage = (index: number) => {
    if (index === 0) return;
    setFormData(prev => {
      const newImages = [...prev.images];
      const [selectedImage] = newImages.splice(index, 1);
      newImages.unshift(selectedImage);
      return { ...prev, images: newImages };
    });
  };

  // Size & Color Logic...
  const addSize = (sizeToAdd?: string) => {
    const s = sizeToAdd || sizeInput.trim();
    if (s && !formData.sizes.includes(s)) {
      setFormData(prev => ({ ...prev, sizes: [...prev.sizes, s] }));
      setSizeInput('');
    }
  };

  const toggleSizeGroup = (group: 'STANDARD' | 'PLUS') => {
    const standardSizes = ['P', 'M', 'G', 'GG'];
    const plusSizes = ['G1', 'G2', 'G3'];
    const targetSizes = group === 'STANDARD' ? standardSizes : plusSizes;
    const currentSizes = formData.sizes || [];
    const allExist = targetSizes.every(s => currentSizes.includes(s));

    if (allExist) {
      setFormData(prev => ({ ...prev, sizes: prev.sizes.filter(s => !targetSizes.includes(s)) }));
    } else {
      setFormData(prev => ({ ...prev, sizes: Array.from(new Set([...prev.sizes, ...targetSizes])) }));
    }
  };

  const removeSize = (idx: number) => setFormData(prev => ({ ...prev, sizes: prev.sizes.filter((_, i) => i !== idx) }));

  const addColor = () => {
    if (colorInput.name.trim() && colorInput.hex) {
      setFormData(prev => ({ ...prev, colors: [...(prev.colors || []), colorInput] }));
      setColorInput({ hex: '#000000', name: '' });
    }
  };

  const removeColor = (idx: number) => setFormData(prev => ({ ...prev, colors: prev.colors.filter((_, i) => i !== idx) }));

  const handleGenerateDescription = async () => {
    if (!formData.name || !formData.reference) {
      alert("Preencha Nome e Referência.");
      return;
    }
    setLoadingAI(true);
    const desc = await generateProductDescription(
      formData.name,
      formData.reference,
      formData.colors?.map(c => c.name) || [],
      formData.category || 'Moda',
      formData.fabric || ''
    );
    setFormData(prev => ({ ...prev, description: desc }));
    setLoadingAI(false);
  };

  // Helper para converter Base64 em Blob para upload
  const base64ToBlob = async (url: string) => {
    const res = await fetch(url);
    return await res.blob();
  };

  const uploadImagesToSupabase = async (images: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const img of images) {
      // Se já for URL do Supabase ou link externo, mantém
      if (img.startsWith('http')) {
        uploadedUrls.push(img);
        continue;
      }

      // Se for Base64, faz upload
      try {
        const blob = await base64ToBlob(img);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (error) throw error;

        // Pega URL publica
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.error("Erro ao subir imagem", err);
        alert("Erro ao subir uma das imagens. Verifique se o bucket 'product-images' está criado e público.");
      }
    }
    return uploadedUrls;
  };

  const handleSave = async (action: 'EXIT' | 'CONTINUE') => {
    if (!formData.images || formData.images.length === 0) {
      alert("Adicione pelo menos uma foto.");
      return;
    }
    if (!formData.reference) {
      alert("Adicione uma referência.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Upload Images
      const finalImageUrls = await uploadImagesToSupabase(formData.images);

      // 2. Prepare Product Data
      const productToSave: Product = {
        id: isEditing && id ? id : '', // ID vazio para criar novo
        ...formData,
        images: finalImageUrls
      };

      // 3. Save to DB
      if (isEditing && id) {
        await updateProduct(productToSave);
      } else {
        await addProduct(productToSave);
      }

      if (action === 'EXIT') {
        navigate('/');
      } else {
        alert(`Produto ${formData.reference} salvo!`);
        // Setup for variation: Mantém imagens (agora URLs), zera Ref/Sizes/Colors
        setFormData(prev => ({
          ...prev,
          reference: '',
          sizes: [],
          colors: [],
          images: finalImageUrls // Mantém as URLs já enviadas para não reenviar
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* ... (Layout visual mantido igual, apenas botões desabilitados durante save) ... */}
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center text-gray-500 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </button>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-gray-900 border-b border-gray-800 flex justify-between">
            <h2 className="text-xl font-bold text-white">{isEditing ? 'Editar' : 'Novo Produto'}</h2>
          </div>

          <div className="p-8 space-y-8">
            {/* Image Section */}
            <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {formData.images.map((img, idx) => (
                   <div key={idx} className={`relative aspect-[3/4] group rounded-lg overflow-hidden border-2 ${idx === 0 ? 'border-primary-500' : 'border-gray-200'}`}>
                     <img src={img} className="w-full h-full object-cover" alt="prod" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-2 transition-opacity">
                        {idx !== 0 && (
                          <button onClick={() => setMainImage(idx)} className="bg-white text-xs px-2 py-1 rounded">Capa</button>
                        )}
                        <button onClick={() => removeImage(idx)} className="bg-red-600 text-white text-xs px-2 py-1 rounded">Remover</button>
                     </div>
                   </div>
                 ))}
                 <label className="flex flex-col items-center justify-center aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 bg-white">
                    {isProcessingImg ? <Loader2 className="animate-spin" /> : <Upload />}
                    <span className="text-xs mt-2">Adicionar Fotos</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={isProcessingImg} />
                 </label>
               </div>
            </div>

            {/* Form Fields (Mantidos os mesmos do anterior, apenas resumido aqui visualmente) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">Referência</label>
                  <input name="reference" value={formData.reference} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
               </div>
            </div>

             {/* Highlight */}
             <div className="flex items-center space-x-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200 cursor-pointer" onClick={handleToggleHighlight}>
              <div className={`w-6 h-6 rounded border flex items-center justify-center ${formData.isHighlight ? 'bg-yellow-500' : 'bg-white'}`}>
                {formData.isHighlight && <Check className="w-4 h-4 text-white" />}
              </div>
              <span className="text-sm font-bold text-gray-800">Produto em Destaque</span>
            </div>

            {/* Sizes & Colors (Simplificado visualmente, lógica acima) */}
            <div className="bg-white p-5 rounded-lg border border-gray-200">
               <label className="block text-sm font-medium mb-3">Tamanhos</label>
               <div className="flex gap-2 mb-2">
                 <button onClick={() => toggleSizeGroup('STANDARD')} className="px-3 py-1 bg-gray-100 rounded text-sm">P ao GG</button>
                 <button onClick={() => toggleSizeGroup('PLUS')} className="px-3 py-1 bg-gray-100 rounded text-sm">G1 ao G3</button>
               </div>
               <div className="flex flex-wrap gap-2 mb-2">
                 {formData.sizes.map((s, i) => <span key={i} className="bg-gray-800 text-white px-2 py-1 rounded text-xs flex items-center">{s} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeSize(i)}/></span>)}
               </div>
               <div className="flex gap-2">
                  <input value={sizeInput} onChange={e => setSizeInput(e.target.value)} placeholder="Outro" className="border rounded px-2 py-1 text-sm"/>
                  <button onClick={() => addSize()} className="bg-gray-200 px-2 rounded"><Plus className="w-4 h-4"/></button>
               </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium mb-3">Cores</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-1 bg-gray-50 p-1 rounded border">
                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: c.hex}}/>
                    <span className="text-xs">{c.name}</span>
                    <X className="w-3 h-3 cursor-pointer text-red-500" onClick={() => removeColor(i)}/>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <input type="color" value={colorInput.hex} onChange={e => setColorInput({...colorInput, hex: e.target.value})} className="h-9 w-10 p-0 border rounded"/>
                <input value={colorInput.name} onChange={e => setColorInput({...colorInput, name: e.target.value})} placeholder="Nome da Cor" className="border rounded px-2 py-2 text-sm flex-1"/>
                <button onClick={addColor} className="bg-gray-900 text-white px-3 py-2 rounded text-sm">Adicionar</button>
              </div>
            </div>

            {/* Price & Cat & Fabric */}
            <div className="grid grid-cols-2 gap-4">
               <input type="number" name="priceRepresentative" placeholder="Preço Rep." value={formData.priceRepresentative} onChange={handleChange} className="border p-2 rounded"/>
               <input type="number" name="priceSacoleira" placeholder="Preço Sacoleira" value={formData.priceSacoleira} onChange={handleChange} className="border p-2 rounded"/>
               <input name="category" placeholder="Categoria" value={formData.category} onChange={handleChange} className="border p-2 rounded"/>
               <input name="fabric" placeholder="Tecido" value={formData.fabric} onChange={handleChange} className="border p-2 rounded"/>
            </div>

            {/* AI Desc */}
            <div>
               <button onClick={handleGenerateDescription} disabled={loadingAI} className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded mb-2 flex items-center">
                 {loadingAI ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3 mr-1"/>} Gerar Descrição IA
               </button>
               <textarea name="description" value={formData.description} onChange={handleChange} className="w-full border p-2 rounded h-24"/>
            </div>

            {/* Footer Actions */}
            <div className="pt-6 border-t flex justify-end gap-3">
               <button onClick={() => handleSave('CONTINUE')} disabled={isSaving} className="px-4 py-2 border rounded flex items-center hover:bg-gray-50">
                  {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Copy className="w-4 h-4 mr-2"/>} Salvar e Variação
               </button>
               <button onClick={() => handleSave('EXIT')} disabled={isSaving} className="px-6 py-2 bg-gray-900 text-white rounded hover:bg-black flex items-center">
                  {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} Salvar
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductForm;
