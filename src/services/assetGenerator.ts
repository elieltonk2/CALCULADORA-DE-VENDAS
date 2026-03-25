import { GoogleGenAI } from "@google/genai";

async function generateAppAssets() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  console.log("Gerando o Ícone do App...");
  const iconResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A modern, minimalist app icon for a sales management app called "VendaPro". The icon features a stylized shopping bag combined with a rising bar chart, symbolizing growth and profit. Professional emerald green and white color palette. Clean lines, flat design, high quality. If there is any text, it must be in Portuguese.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      },
    },
  });

  let iconUrl = "";
  for (const part of iconResponse.candidates[0].content.parts) {
    if (part.inlineData) {
      iconUrl = `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  console.log("Gerando a Imagem de Destaque...");
  const featureResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A professional feature graphic for a Google Play Store listing of an app called "VendaPro". The background is a clean, modern gradient of emerald green. In the center, the text "VendaPro" is written in a bold, elegant sans-serif font. Include the subtitle "Gestão e Lucro" in Portuguese. Surrounding the text are subtle icons representing sales, inventory, and growth. High quality, professional aesthetic.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      },
    },
  });

  let featureUrl = "";
  for (const part of featureResponse.candidates[0].content.parts) {
    if (part.inlineData) {
      featureUrl = `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  return { iconUrl, featureUrl };
}

export async function generateScreenshots() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const screenshots: string[] = [];

  const prompts = [
    'A high-quality mobile app screenshot of "VendaPro" showing a clean dashboard with sales charts and profit summaries. Emerald green theme, modern UI, professional look. All UI text must be in Portuguese, such as "Vendas", "Lucro", "Resumo".',
    'A high-quality mobile app screenshot of "VendaPro" showing a product list with prices and stock levels. Emerald green theme, modern UI, professional look. All UI text must be in Portuguese, such as "Estoque", "Produtos", "Preço".',
    'A high-quality mobile app screenshot of "VendaPro" showing a "Nova Venda" screen with a calculator and product selection. Emerald green theme, modern UI, professional look. All UI text must be in Portuguese, such as "Nova Venda", "Quantidade", "Total".'
  ];

  console.log("Gerando Screenshots de Marketing...");
  for (const prompt of prompts) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "9:16" } },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        screenshots.push(`data:image/png;base64,${part.inlineData.data}`);
      }
    }
  }

  return screenshots;
}

export default generateAppAssets;
