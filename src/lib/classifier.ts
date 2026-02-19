import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export interface ClassificationResult {
    esOC: boolean;
    motivo: string;
}

export async function classifyEmail(subject: string, body: string, attachments: any[]): Promise<ClassificationResult> {
    const prompt = `
    Eres un experto en logística y administración de empresas.
    Analiza el siguiente correo de una empresa de distribución y determina si es una ORDEN DE COMPRA (OC).
    
    CRITERIOS DE ÉXITO:
    - El cliente está enviando un pedido formal confirmando una compra.
    - Se mencionan productos, cantidades o números de OC.
    - Adjuntos con nombres como "OC", "Orden", "Purchase Order", etc. son fuertes indicadores.

    Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
    {
      "esOC": boolean,
      "motivo": "Explicación breve de por qué se clasificó así"
    }

    DATOS DEL CORREO:
    Asunto: ${subject}
    Cuerpo: ${body.substring(0, 5000)} // Truncado para evitar límites de tokens
    Adjuntos: ${JSON.stringify(attachments.map(a => a.name))}
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extraer JSON de la respuesta (Gemini a veces envuelve en markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error("No se pudo parsear la respuesta del LLM");
    } catch (error) {
        console.error("Error clasificando correo:", error);
        return { esOC: false, motivo: "Error en clasificación" };
    }
}
