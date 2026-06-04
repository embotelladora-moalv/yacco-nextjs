import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializamos el SDK con la llave de tu .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // Recibimos los datos desde tu formulario web
    const { products, truckCapacity, destinationZone } = await req.json();

    // Seleccionamos el modelo más rápido y económico
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Armamos el "Prompt" (Las instrucciones para la IA)
    const prompt = `
      Eres el Jefe de Logística experto de una embotelladora de agua.
      
      Datos de la ruta actual:
      - Destino principal: ${destinationZone || "Ruta general"}
      - Capacidad máxima del camión: ${truckCapacity} unidades.
      - Inventario disponible en planta: ${JSON.stringify(products)}

      Tarea:
      Sugiere exactamente qué cantidades de cada producto debe cargar el chofer para optimizar las ventas y no exceder la capacidad del camión de ${truckCapacity} unidades.
      
      Reglas:
      1. Sé directo y profesional.
      2. No uses introducciones largas.
      3. Dame la respuesta en formato de viñetas claras.
      4. Justifica brevemente por qué sugieres esa mezcla.
    `;

    // Ejecutamos la consulta a Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Devolvemos el texto a tu pantalla web
    return NextResponse.json({ success: true, suggestion: response.text() });
  } catch (error: any) {
    console.error("Error en Gemini API:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo conectar con la IA." },
      { status: 500 },
    );
  }
}
