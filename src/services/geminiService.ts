/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { BusinessData, CuponResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_PROMPT = `Eres el Motor de Generación de Cupones de "Enlace Izcalli". Tu objetivo es procesar datos de un formulario y devolver una estructura técnica perfecta.

### REGLAS ESTRICTAS DE CONTENIDO:
1. NO INVENTAR: Solo usa el texto proporcionado en los campos "Nombre del Negocio", "Oferta Principal" y "Condiciones". No agregues frases genéricas.
2. IDIOMA: Todo el contenido visible debe ser 100% en ESPAÑOL.
3. CAMPOS OBLIGATORIOS EN EL DISEÑO:
   - Logo Patrocinador (Protagonista).
   - Oferta (Texto principal, corto, directo).
   - Condiciones (Legible pero secundario).
   - Cronómetro (Calculado).
   - Logo Enlace Izcalli (Pequeño, watermark).

### REGLAS DE DISEÑO (ESTILO TICKET PREMIUM):
1. COLOR: Extrae el color más oscuro o dominante del logo para el fondo ("color_primario"). Si el logo es muy claro, usa un gris casi negro (#121212) o azul marino muy oscuro (#0f172a). El diseño DEBE ser oscuro y elegante.
2. LOGO PATROCINADOR: Debe mostrarse directamente sobre el fondo oscuro. PROHIBIDO encapsularlo en cajas blancas o grises (debe ser transparente). Si el logo tiene fondo blanco, el frontend intentará manejarlo, pero pide al usuario que prefiera logos con transparencia.
3. LOGO ENLACE IZCALLI (https://cossma.com.mx/enlaceizcallilogo.png): Debe aparecer en el JSON para ser usado como sello de autenticidad.
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
    "branding": { "watermark_url": "https://cossma.com.mx/enlaceizcallilogo.png", "position": "bottom-right" },
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
  try {
    // Robust parsing: search for JSON structure if not directly valid
    let jsonContent = text;
    if (text.includes("```json")) {
      jsonContent = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      jsonContent = text.split("```")[1].split("```")[0].trim();
    }
    
    const result = JSON.parse(jsonContent);
    return { result };
  } catch (error) {
    console.error("Error parsing Gemini response:", text);
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }
}

export interface ContactInfoResponse {
  whatsapp: string | null;
  phone: string | null;
}

export async function extractContactInfoFromFlyer(base64Image: string): Promise<ContactInfoResponse> {
  const contents: any[] = [];
  
  try {
    if (base64Image) {
      const parts = base64Image.split(',');
      if (parts.length > 1) {
        const header = parts[0];
        const base64 = parts[1];
        const mimeType = header.split(':')[1].split(';')[0];
        contents.push({
          inlineData: {
            data: base64,
            mimeType: mimeType
          }
        });
      }
    }
  } catch (e) {
    console.error("Error processing base64 image logo data:", e);
  }

  const promptText = `Analiza detalladamente este flyer publicitario o imagen de anuncio comercial para extraer la información de contacto (WhatsApp y teléfono tradicional).
Busca exhaustivamente en todas las secciones de la imagen (encabezados, textos grandes, textos pequeños, marcas de agua, leyendas al lado de logotipos verdes o iconos de llamada).

Pautas de extracción:
1. "whatsapp": Busca números asociados con palabras clave como "WhatsApp", "Whats", "Wsp", "escríbenos", "mensaje", o junto al ícono verde celular de WhatsApp.
2. "phone": Busca números marcados con "Tel", "Teléfono", "Cel", "Llámanos", "Llamar", o el ícono tradicional de teléfono o auricular. Si hay un único número en toda la imagen que sirve para ambas cosas, colócalo en ambas propiedades.

REGLAS DE SEGURIDAD Y LIMPIEZA:
- Extrae el número completo. Si contiene espacios, guiones, paréntesis o símbolos especiales (ej. "55 1234-5678", "(55)12345678", "52-1-55-1234-5678"), devuélvelo como un texto limpio conteniendo únicamente los dígitos numéricos enteros.
- El resultado ideal de cada campo debe ser un string conteniendo los dígitos numéricos.
- Si no hay ningún WhatsApp o número telefónico presente en la imagen de forma absoluta, escribe null para el campo correspondiente.`;

  contents.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatsapp: {
              type: Type.STRING,
              description: "Dígitos del número de WhatsApp encontrado en el flyer, o null si no se encuentra ninguno."
            },
            phone: {
              type: Type.STRING,
              description: "Dígitos del teléfono de contacto convencional o celular encontrado en el flyer, o null si no se encuentra ninguno."
            }
          },
          required: ["whatsapp", "phone"]
        }
      }
    });

    const text = response.text || "";
    let jsonContent = text.trim();
    if (text.includes("```json")) {
      jsonContent = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      jsonContent = text.split("```")[1].split("```")[0].trim();
    }
    
    const parsed = JSON.parse(jsonContent);

    // Clean up function to securely strip any non-digit remaining characters from the AI output
    const cleanNumber = (val: any) => {
      if (!val) return null;
      const strVal = String(val).trim();
      if (strVal.toLowerCase() === 'null' || strVal === '') return null;
      const digitsOnly = strVal.replace(/\D/g, '');
      // Validate length to ensure it represents a plausible phone line
      return digitsOnly.length >= 7 ? digitsOnly : null;
    };
    
    return {
      whatsapp: cleanNumber(parsed.whatsapp),
      phone: cleanNumber(parsed.phone)
    };
  } catch (error) {
    console.error("Error calling Gemini or parsing contact extraction:", error);
    return { whatsapp: null, phone: null };
  }
}

