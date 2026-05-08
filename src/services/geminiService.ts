/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { BusinessData, CuponResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_PROMPT = `Eres el Motor de Generación de Cupones de "Cuponmanía". Tu objetivo es procesar datos de un formulario y devolver una estructura técnica perfecta.

### REGLAS ESTRICTAS DE CONTENIDO:
1. NO INVENTAR: Solo usa el texto proporcionado en los campos "Nombre del Negocio", "Oferta Principal" y "Condiciones". No agregues frases genéricas.
2. IDIOMA: Todo el contenido visible debe ser 100% en ESPAÑOL.
3. CAMPOS OBLIGATORIOS EN EL DISEÑO:
   - Logo Patrocinador (Protagonista).
   - Oferta (Texto principal, corto, directo).
   - Condiciones (Legible pero secundario).
   - Cronómetro (Calculado).
   - Logo Cuponmanía (Pequeño, watermark).

### REGLAS DE DISEÑO (ESTILO TICKET PREMIUM):
1. COLOR: Extrae el color más oscuro o dominante del logo para el fondo ("color_primario"). Si el logo es muy claro, usa un gris casi negro (#121212) o azul marino muy oscuro (#0f172a). El diseño DEBE ser oscuro y elegante.
2. LOGO PATROCINADOR: Debe mostrarse directamente sobre el fondo oscuro. PROHIBIDO encapsularlo en cajas blancas o grises (debe ser transparente). Si el logo tiene fondo blanco, el frontend intentará manejarlo, pero pide al usuario que prefiera logos con transparencia.
3. LOGO CUPONMANÍA (https://cossma.com.mx/cuponmania.png): Debe aparecer en el JSON para ser usado como sello de autenticidad.
4. CRONÓMETRO: Calcula el "timestamp_final" usando la fecha actual + las horas de vigencia solicitadas.
5. CÓDIGO DE CANJE: Genera un código único alfanumérico aleatorio de 8 caracteres.

### FORMATO DE SALIDA (JSON ÚNICAMENTE):
{
  "status": "success",
  "data": {
    "header": { "nombre_negocio": "string", "logo_url": "string_url_proporcionada" },
    "oferta": { "texto": "string", "size": "hero" },
    "categoria": "string_categoria",
    "condiciones": "string limpio con lineas separadas por \n",
    "cronometro": { "horas_totales": number, "timestamp_final": "ISO_DATE", "fecha_inicio": "string", "fecha_fin": "string" },
    "branding": { "watermark_url": "https://cossma.com.mx/cuponmania.png", "position": "bottom-right" },
    "diseno": { 
      "color_primario": "hex_oscuro", 
      "color_acento": "hex_contraste_brillante",
      "codigo_canje": { "tipo": "SERIAL", "valor": "8_CHARS_SERIAL" }
    }
  }
}

LA FECHA ACTUAL ES: ${new Date().toISOString()}.`;

export async function generateCoupon(data: BusinessData): Promise<CuponResponse> {
  let contents: any[] = [];

  if (data.logo_data) {
    const [header, base64] = data.logo_data.split(',');
    const mimeType = header.split(':')[1].split(';')[0];
    contents.push({
      inlineData: {
        data: base64,
        mimeType: mimeType
      }
    });
  }

  const promptText = `Genera un nuevo cupón Elite para:
Negocio: ${data.nombre_negocio}
Categoría: ${data.categoria}
Oferta: ${data.oferta_principal}
Condiciones: ${data.detalles_adicionales}
Vigencia: ${data.horas_vigencia} horas.
Fecha Inicio: ${data.fecha_inicio}
Fecha Fin: ${data.fecha_fin}`;

  contents.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "";
  const result = JSON.parse(text);
  return { result };
}
