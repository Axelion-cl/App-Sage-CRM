import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface ClassificationResult {
    esOC: boolean;
    motivo: string;
    confianza: 'alta' | 'media' | 'baja';
    fuentePrincipal: 'asunto' | 'cuerpo' | 'adjunto' | 'combinacion';
}

export async function classifyEmail(subject: string, body: string, attachments: any[]): Promise<ClassificationResult> {
    const attachmentNames = attachments.map(a => a.name || a.fileName || 'sin nombre');
    const hasAttachments = attachmentNames.length > 0;

    const prompt = `
    Eres un experto en logística y administración de empresas de distribución.
    Tu tarea es determinar si un correo electrónico contiene o hace referencia a una ORDEN DE COMPRA (OC).

    ANALIZA LAS SIGUIENTES 3 FUENTES DE INFORMACIÓN DE FORMA INTEGRADA:

    === FUENTE 1: ASUNTO DEL CORREO ===
    "${subject}"

    === FUENTE 2: CUERPO DEL CORREO ===
    "${body.substring(0, 5000)}"

    === FUENTE 3: ARCHIVOS ADJUNTOS (${attachmentNames.length} archivo/s) ===
    ${hasAttachments
            ? attachmentNames.map((name, i) => `  ${i + 1}. ${name}`).join('\n')
            : '  (Sin adjuntos)'}

    === CRITERIOS DE CLASIFICACIÓN ===
    
    INDICADORES FUERTES de que ES una Orden de Compra:
    - El asunto contiene "OC", "Orden de Compra", "Purchase Order", "PO", "Pedido", "Orden N°".
    - El cuerpo menciona productos, cantidades, códigos de producto, precios unitarios, o números de OC.
    - Un adjunto tiene nombre como "OC_*.pdf", "Orden*.pdf", "PurchaseOrder*.pdf", "Pedido*.pdf".
    - El correo es claramente un cliente solicitando o confirmando una compra de productos.

    INDICADORES de que NO es una Orden de Compra:
    - Es una cotización (presupuesto), consulta general, correo interno, o envío de documentos tributarios.
    - Es una factura, guía de despacho, nota de crédito, o documento contable (NO son OCs).
    - Es spam, newsletter, notificación automática del sistema, o correo personal.
    - Es una solicitud de cotización (están pidiendo precio, no confirmando compra).

    === INSTRUCCIONES ===
    Combina de forma inteligente la información de las 3 fuentes. No tomes una decisión basándote solo en una fuente. 
    Por ejemplo: si el asunto dice "OC" pero el cuerpo y los adjuntos indican una cotización, NO es una OC.
    
    Responde ÚNICAMENTE con el siguiente JSON (sin markdown, sin backticks):
    {
      "esOC": boolean,
      "motivo": "Explicación breve y concisa de tu razonamiento",
      "confianza": "alta" | "media" | "baja",
      "fuentePrincipal": "asunto" | "cuerpo" | "adjunto" | "combinacion"
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extraer JSON de la respuesta (Gemini a veces envuelve en markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                esOC: parsed.esOC ?? false,
                motivo: parsed.motivo || 'Sin motivo',
                confianza: parsed.confianza || 'media',
                fuentePrincipal: parsed.fuentePrincipal || 'combinacion',
            };
        }

        throw new Error("No se pudo parsear la respuesta del LLM");
    } catch (error) {
        console.error("Error clasificando correo:", error);
        return { esOC: false, motivo: "Error en clasificación", confianza: 'baja', fuentePrincipal: 'combinacion' };
    }
}
