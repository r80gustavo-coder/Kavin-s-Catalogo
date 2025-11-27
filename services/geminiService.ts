// AI Service is disabled to prevent build errors since @google/genai is not in package.json
// This ensures Vercel builds successfully.

export const generateProductDescription = async (
  name: string,
  reference: string,
  colors: string[],
  category: string,
  fabric: string
): Promise<string> => {
  return "";
};