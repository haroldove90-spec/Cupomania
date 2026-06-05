import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generateCoupon, extractContactInfoFromFlyer } from "./src/services/geminiService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON and URLencoded parsers with large limits for flyer images
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ limit: '30mb', extended: true }));

  // API endpoints for AI Coupon Generation
  app.post("/api/generate-coupon", async (req, res) => {
    try {
      const formData = req.body;
      if (!formData || !formData.nombre_negocio || !formData.oferta_principal) {
        return res.status(400).json({ error: "Datos incompletos. Faltan campos obligatorios." });
      }
      
      const response = await generateCoupon(formData);
      return res.json(response);
    } catch (error: any) {
      console.error("Error in /api/generate-coupon:", error);
      return res.status(500).json({ error: error.message || "Error interno al generar el cupón con la IA" });
    }
  });

  // API endpoint for AI Contact Info Extraction from Flyers
  app.post("/api/extract-contacts", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Falta la imagen en formato base64." });
      }

      const result = await extractContactInfoFromFlyer(image);
      return res.json(result);
    } catch (error: any) {
      console.error("Error in /api/extract-contacts:", error);
      return res.status(500).json({ error: error.message || "Error interno al extraer los contactos de la imagen" });
    }
  });

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Setup Vite middleware for dev or serve static bundle for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
