import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ClassificationResult {
    esOC: boolean;
    motivo: string;
    confianza: 'alta' | 'media' | 'baja';
    fuentePrincipal: 'asunto' | 'cuerpo' | 'adjunto' | 'combinacion';
}

export async function classifyEmail(
    subject: string,
    body: string,
    attachments: any[]
): Promise<ClassificationResult> {
    const attachmentNames = attachments.map(a => a.name || a.fileName || 'sin nombre');
    const hasAttachments = attachmentNames.length > 0;



    const prompt = `
    Eres un experto en logística y administración de empresas de distribución.
    Tu tarea es determinar si un correo electrónico contiene o hace referencia a una ORDEN DE COMPRA (OC).

    ANALIZA LAS SIGUIENTES 3 FUENTE DE INFORMACIÓN DE FORMA INTEGRADA:

    === FUENTE 1: ASUNTO DEL CORREO ===
    "${subject}"

    === FUENTE 2: CUERPO DEL CORREO ===
    "${body.substring(0, 4000)}"

    === FUENTE 3: ARCHIVOS ADJUNTOS (${attachmentNames.length} archivo/s) ===
    ${hasAttachments
            ? attachmentNames.map((name, i) => `  ${i + 1}. ${name}`).join('\n')
            : '  (Sin adjuntos)'}

    === CRITERIOS DE CLASIFICACIÓN ===
    
    INDICADORES FUERTES de que ES una Orden de Compra:
    - El asunto contiene "OC", "Orden de Compra", "Purchase Order", "PO", "Pedido", "Orden N°", "Nota de Pedido".
    - El cuerpo menciona productos, cantidades, códigos de producto, precios unitarios, o números de OC.
    - Un adjunto tiene nombre como "OC_*.pdf", "Orden*.pdf", "PurchaseOrder*.pdf", "Pedido*.pdf".
    - El correo es claramente un cliente solicitando o confirmando una compra de productos.
    - El asunto contiene "PEDIDO" seguido de información de despacho (ej: "PEDIDO DESPACHO").
    - El asunto contiene un número de OC o pedido (ej: "OC 1003974", "Pedido N°84832").

    INDICADORES de que NO es una Orden de Compra:
    - El asunto contiene "Orden de compra atrasada" o similares (Están pidiendo que se les entregue una orden de compra que ya se les envió).
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
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Eres un clasificador de correos experto que responde estrictamente en formato JSON."
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile", // Modelo configurable via .env
            temperature: 0.1,
            max_tokens: 1024,
            top_p: 1,
            stream: false,
            response_format: { type: "json_object" } // Groq soporta modo JSON
        });

        const text = chatCompletion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(text);

        return {
            esOC: parsed.esOC ?? false,
            motivo: parsed.motivo || 'Sin motivo',
            confianza: parsed.confianza || 'media',
            fuentePrincipal: parsed.fuentePrincipal || 'combinacion',
        };

    } catch (error) {
        console.error("Error clasificando correo con Groq:", error);
        return {
            esOC: false,
            motivo: "Error en clasificación",
            confianza: 'baja',
            fuentePrincipal: 'combinacion'
        };
    }
}
