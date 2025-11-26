import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (
  name: string,
  reference: string,
  colors: string[],
  category: string,
  fabric: string
): Promise<string> => {
  try {
    const prompt = `Crie uma descrição comercial atraente e curta (máximo 2 parágrafos) para o seguinte produto de moda feminina:
    
    Nome: ${name}
    Referência: ${reference}
    Categoria: ${category}
    Tecido: ${fabric}
    Cores Disponíveis: ${colors.join(', ')}
    
    A descrição deve destacar a elegância, conforto e versatilidade da peça. Use tom profissional mas convidativo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro ao gerar descrição com IA:", error);
    return "";
  }
};