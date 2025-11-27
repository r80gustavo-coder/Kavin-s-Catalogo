import { GoogleGenAI } from "@google/genai";

// Serviço de IA para geração de descrições de produtos
export const generateProductDescription = async (
  name: string,
  reference: string,
  colors: string[],
  category: string,
  fabric: string
): Promise<string> => {
  try {
    // API Key must be obtained exclusively from process.env.API_KEY
    if (!process.env.API_KEY) {
      console.warn("API_KEY not found in environment variables.");
      return "";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Crie uma descrição comercial e elegante para um produto de moda.
    
    Detalhes do Produto:
    - Nome: ${name}
    - Referência: ${reference}
    - Categoria: ${category}
    - Tecido: ${fabric}
    - Cores: ${colors.join(', ')}
    
    A descrição deve enfatizar a qualidade do tecido e ser adequada para um catálogo online. Mantenha o texto conciso (aprox. 300 caracteres).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro ao gerar descrição com Gemini:", error);
    return "";
  }
};