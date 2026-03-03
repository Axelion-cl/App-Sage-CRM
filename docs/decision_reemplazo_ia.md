# Decisión Arquitectónica: Reemplazo de IA (Gemini)

Este documento analiza las dos opciones disponibles para reemplazar la API de inteligencia artificial de Google (Gemini) en el motor de clasificación de correos de App Sage CRM.

El objetivo es reducir los costos repentinos de procesamiento manteniendo la utilidad fundamental de la herramienta: ayudar a los vendedores a detectar Órdenes de Compra (OCs).

---

## Opción 1: Motor Heurístico y de Reglas (Local)

Consiste en programar un conjunto de reglas estáticas ("If this, then that") que analicen directamente el texto de los correos mediante expresiones regulares (RegEx) y búsqueda de palabras clave.

### ¿Cómo funcionaría?
El código buscaría coincidencias exactas en el texto. Ejemplos de reglas:
1. SI el ASUNTO o CUERPO contiene: `"OC "`, `"Orden de Compra"`, `"Pedido N°"`.
2. O SI existe un ADJUNTO llamado `"*_OC_*.pdf"`.
3. Y NO CONTIENE palabras excluyentes como: `"Cotización"`, `"Presupuesto"`.
4. ENTONCES -> `Es_OC = TRUE`.

### ✅ Pros
- **Costo Totalmente Cero ($0.0):** El procesamiento ocurre localmente en el servidor, no usa servicios de terceros cobrados por uso.
- **Sin Dependencias:** No hay riesgo de que un proveedor externo corte el servicio, caiga, o cambie sus políticas o precios repentinamente.
- **Lógica Predecible y Auditable:** Se sabe exactamente *por qué* y *cómo* un correo se clasificó de cierta manera. No hay fallos inesperados causados por "alucinaciones" de una IA.
- **Procesamiento Inmediato:** Funciona a la velocidad nativa del lenguaje (TypeScript), sin pausas esperando respuestas HTTP de una API externa.

### ❌ Contras
- **Sin Análisis de Contexto:** Un correo que diga *"Favor considerar la orden de compra que nos enviaron el mes pasado..."* sería interceptado como positivo incorrectamente. Las heurísticas no tienen sentido común.
- **Rígido a Nuevos Escenarios:** Cada caso nuevo o formato distinto enviado por un cliente requeriría que un desarrollador añada/modifique una regla de programación.
- **Pérdida de la Funcionalidad de "Aprendizaje":** Los ejemplos guardados manualmente por los vendedores en la interfaz perderían uso, ya que el sistema dejaría de "evaluar similitudes" mediante un LLM.

---

## Opción 2: Usar Groq + LLaMA 3 8B (IA)

Consiste en migrar la lógica actual (los *prompts*) para cambiar de proveedor. De usar Google a usar Groq (una proveedora famosa por sus chips ultrarrápidos, LPUs, que alojan modelos open source como Meta's LLaMA 3).

### ¿Cómo funcionaría?
El código se conectaría a la API de `api.groq.com`, enviaría exactamente el mismo _prompt_ (instrucciones + texto de correo) y Groq procesaría el LLaMA devolviendo exactamente el JSON (`es_OC: true/false`).

### ✅ Pros
- **Virtualmente Cero Modificaciones en Funcionalidad:** La aplicación operaría exactamente como hoy. Se mantiene la inteligencia contextual de discernir la **intención** de la frase ("me pidió una orden" o "aquí está mi orden").
- **Mantenimiento del Aprendizaje Manual:** Los ejemplos de correcciones (`feedback_examples`) seguirían enviándose como contexto _in-context learning_ enriqueciendo la capacidad de la IA específica para la terminología de BIENEK.
- **Costos Iniciales Gratuitos/Drásticamente Inferiores:** La capa gratuita (`Hobby tier`) de Groq es enorme y permite clasificar miles de correos al mes a velocidad ultrarrápida (modelos como `Llama3-8b-8192`). Incluso en nivel de pago, es órdenes de magnitud más barata que un modelo propietario al cobrarse unos escasos centavos.

### ❌ Contras
- **Limites Diarios (Rate Limits):** La capa grauita protege su red. Tienen límite de Solicitudes Por Minuto (RPM) o Tokens Por Minuto (TPM) estrictos, obligando a usar programación de 'retraso/reintento' si procesas 100 correos de golpe.
- **Aún Sientes a un Tercero (API externa):** Hay un eslabón adicional que puede fallar o cambiar su T&C de capa gratuita a la larga.
- **Creación de Credencial Obligatoria:** Hay que crear una cuenta gratuita en [GroqCloud](https://console.groq.com/) para obtener y reemplazar la variable de entorno actual (`GROQ_API_KEY`).

---

## Recomendación

Si los vendedores **ya contaban con la alta capacidad de contexto de la IA**, bajar a un nivel heurístico podría generar fricción y desconfianza en la herramienta al haber repentinamente muchos falsos positivos o negativos ("*la app ya no los pilla como antes*").
Por ello, **migrar a Groq (Opción 2)** brinda el mismo sabor del producto sin la fatiga de facturas millonarias, siendo el paso técnico más lógico actualmente de corto/mediano plazo.
