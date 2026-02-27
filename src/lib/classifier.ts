import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface ClassificationResult {
    esOC: boolean;
    motivo: string;
    confianza: 'alta' | 'media' | 'baja';
    fuentePrincipal: 'asunto' | 'cuerpo' | 'adjunto' | 'combinacion';
}

interface FeedbackExample {
    subject: string;
    is_oc: boolean;
}

export async function classifyEmail(
    subject: string,
    body: string,
    attachments: any[],
    feedbackExamples: FeedbackExample[] = []
): Promise<ClassificationResult> {
    const attachmentNames = attachments.map(a => a.name || a.fileName || 'sin nombre');
    const hasAttachments = attachmentNames.length > 0;

    // Construir sección de few-shot learning si hay ejemplos
    let feedbackSection = '';
    if (feedbackExamples.length > 0) {
        const examples = feedbackExamples.map((ex, i) =>
            `  ${i + 1}. Asunto: "${ex.subject}" → ${ex.is_oc ? 'ES OC ✅' : 'NO ES OC ❌'}`
        ).join('\n');
        feedbackSection = `
    === EJEMPLOS DE REFERENCIA (correcciones del usuario) ===
    Los siguientes correos fueron clasificados MANUALMENTE por un experto. 
    Usa estos ejemplos como referencia para entender qué patrones son OC en esta empresa:
${examples}

    IMPORTANTE: Aprende de estos patrones. Si un correo nuevo se parece a uno de estos ejemplos, clasifícalo de forma similar.
    `;
    }

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
    ${feedbackSection}
    === CRITERIOS DE CLASIFICACIÓN ===
    
    INDICADORES FUERTES de que ES una Orden de Compra:
    - El asunto contiene "OC", "Orden de Compra", "Purchase Order", "PO", "Pedido", "Orden N°", "Nota de Pedido".
    - El cuerpo menciona productos, cantidades, códigos de producto, precios unitarios, o números de OC.
    - Un adjunto tiene nombre como "OC_*.pdf", "Orden*.pdf", "PurchaseOrder*.pdf", "Pedido*.pdf".
    - El correo es claramente un cliente solicitando o confirmando una compra de productos.
    - El asunto contiene "PEDIDO" seguido de información de despacho (ej: "PEDIDO DESPACHO").
    - El asunto contiene un número de OC o pedido (ej: "OC 1003974", "Pedido N°84832").

    INDICADORES de que NO es una Orden de Compra:
    - Es una solicitud de COTIZACIÓN (están pidiendo precio, no confirmando compra).
    - Es una factura, guía de despacho, nota de crédito, o documento contable YA EMITIDO.
    - Es spam, newsletter, notificación automática del sistema, o correo personal.
    - Es una consulta general sin productos ni cantidades específicas.

    EN CASO DE DUDA, CLASIFICA COMO OC (es preferible un falso positivo a perder una orden real).

    === INSTRUCCIONES ===
    Combina de forma inteligente la información de las 3 fuentes.
    
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
