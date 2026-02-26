# Uso de la API de Gemini en la Aplicación

Este documento detalla cómo se está utilizando y cómo se debe utilizar la API de Gemini dentro de esta aplicación.

## 1. Dependencias
La aplicación utiliza el SDK oficial de Google para JavaScript/TypeScript.
Para instalarlo (si no estuviera instalado):
```bash
npm install @google/generative-ai
```

## 2. Configuración del Entorno
Es necesario configurar la clave de la API en las variables de entorno. Asegúrate de tener un archivo `.env` o `.env.local` en la raíz del proyecto con la siguiente variable:
```env
GEMINI_API_KEY=tu_clave_de_api_aqui
```

## 3. Instanciación del Cliente
El cliente de Gemini se inicializa utilizando la clave de la API del entorno. Ejemplo extraído de [src/lib/classifier.ts](file:///c:/Github/App%20Sage%20CRM/App-Sage-CRM/src/lib/classifier.ts):

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
```
> [!NOTE] 
> Actualmente se usa el modelo `gemini-1.5-flash-latest`, ideal para tareas rápidas como la clasificación de texto.

## 4. Generación de Contenido (Ejemplo Práctico)
Para interactuar con el modelo y pedirle que realice una tarea (como analizar un correo), se define un prompt claro con instrucciones y se solicita la generación de contenido.

Ejemplo de uso en la función [classifyEmail](file:///c:/Github/App%20Sage%20CRM/App-Sage-CRM/src/lib/classifier.ts#11-50):

```typescript
export async function classifyEmail(subject: string, body: string, attachments: any[]) {
    const prompt = `
    Eres un experto...
    Responde ÚNICAMENTE en formato JSON con la estructura: { "esOC": boolean, "motivo": string }
    ...
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Si se pide JSON, es buena práctica hacer un regex o parseo seguro:
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error("Error consultando a Gemini:", error);
    }
}
```

## 5. Buenas Prácticas y Consejos
*   **Manejo de Errores**: Siempre envuelve las llamadas a `generateContent` en bloques `try...catch` ya que las peticiones de red pueden fallar o la API puede devolver errores de límite de cuota.
*   **Límites de Tokens**: Al enviar contenido muy largo (como el cuerpo de un correo), es recomendable truncar el texto (ej. `body.substring(0, 5000)`) para no superar el límite de contexto del modelo.
*   **Extracción de JSON**: Como se observa en el código, Gemini a veces envuelve las respuestas JSON en bloques de código markdown (` ```json ... ``` `). El uso de expresiones regulares como `text.match(/\{[\s\S]*\}/)` ayuda a extraer solo el objeto JSON útil.
