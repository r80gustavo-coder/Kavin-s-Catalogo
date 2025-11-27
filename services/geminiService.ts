import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
// Note: In a production app, never expose the API key in client-side code like this if possible.
// For this demo structure, we use process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (
  name: string,
  reference: string,
  colors: string[],
  category: string,
  fabric: string
): Promise<string> => {
  try {
    const prompt = `
      Você é um especialista em marketing de moda de alto padrão da marca Kavin's.
      Escreva uma descrição atraente, sofisticada e vendedora para um catálogo de roupas.
      
      Detalhes do produto:
      - Nome: ${name}
      - Referência: ${reference}
      - Categoria: ${category}
      - Tecido/Material: ${fabric}
      - Cores disponíveis: ${colors.join(', ')}
      
      A descrição deve ter no máximo 2 parágrafos curtos. Use emojis moderadamente.
      Foque na qualidade do tecido (${fabric}), conforto e caimento da peça.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Descrição indisponível no momento.";
  } catch (error) {
    console.error("Erro ao gerar descrição com Gemini:", error);
    return "Não foi possível gerar a descrição automática. Por favor, tente novamente.";
  }
};