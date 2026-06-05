import { generateCoupon } from "../src/services/geminiService";

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
    const formData = req.body || {};
    if (!formData || !formData.nombre_negocio || !formData.oferta_principal) {
      return res.status(400).json({ error: "Datos incompletos. Faltan campos obligatorios." });
    }

    const response = await generateCoupon(formData);
    return res.status(200).json(response);
  } catch (error: any) {
    console.error("Error in serverless api/generate-coupon handler:", error);
    return res.status(500).json({ error: error.message || "Error interno al generar el cupón con la IA" });
  }
}
