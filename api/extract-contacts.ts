import { extractContactInfoFromFlyer } from "../src/services/geminiService";

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: "Falta la imagen en formato base64." });
    }

    const result = await extractContactInfoFromFlyer(image);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in serverless api/extract-contacts handler:", error);
    return res.status(500).json({ error: error.message || "Error interno al procesar e identificar la imagen" });
  }
}
