# App Sage CRM — Guía de la Aplicación

> Documento pensado para quien no conoce la app. Explica **qué hace**, **por qué existe** y **cómo usarla**.

---

## ¿Qué es esta aplicación?

**App Sage CRM** es una herramienta web interna para el equipo de ventas de **BIENEK**. Su función es muy concreta: **mostrar cuántas Órdenes de Compra (OC) recibió cada vendedor durante el día y a qué hora llegaron**.

La app revisa automáticamente los correos entrantes del equipo usando inteligencia artificial, identifica cuáles contienen una orden de compra, y los presenta de forma ordenada en un panel (dashboard) por vendedor.

---

## El problema que resolvió

Antes de esta app no había una forma sencilla de responder preguntas como:

- ¿Cuántas OCs llegaron hoy?
- ¿Qué vendedor recibió más órdenes?
- ¿A qué hora llegó la primera OC de la mañana?
- ¿Llegó alguna OC de un cliente importante?

La única manera de saberlo era revisar manualmente los correos en el CRM (ForceManager), lo que lleva tiempo y es propenso a errores u omisiones.

Con App Sage CRM, esa información aparece automáticamente al abrir la app, sin necesidad de revisar correo por correo.

---

## ¿Cómo funciona? (visión general)

```
Correos en ForceManager
         │
         ▼
  App consulta los correos del día
         │
         ▼
  IA (Gemini) analiza cada correo
  y decide: ¿Es una OC? ¿No es una OC?
         │
         ▼
  Resultados guardados en base de datos
         │
         ▼
  Dashboard muestra resumen por vendedor
```

Todo esto ocurre automáticamente al abrir la app. No hay que hacer nada manualmente (aunque existe un botón de sincronización manual si se necesita actualizar en el momento).

---

## Los cuatro pasos explicados

### 1. Leer los correos del CRM

La app se conecta a **ForceManager** (el CRM que usa BIENEK, también conocido como Sage Sales Management) y obtiene todos los correos recibidos en el día actual.

Solo se leen los correos **recibidos** (no los enviados) y solo del **día de hoy** (aunque también se puede consultar días anteriores, hasta 30 días atrás).

### 2. Clasificar con inteligencia artificial

Cada correo es analizado por **Gemini**, un modelo de inteligencia artificial de Google. La IA lee el asunto del correo, el cuerpo del mensaje y el nombre de los archivos adjuntos para decidir si es o no una Orden de Compra.

La IA busca señales como:
- Asuntos que digan "OC", "Orden de Compra", "Pedido", "Nota de Pedido"
- Archivos adjuntos con nombres como `OC_1234.pdf`
- Texto en el cuerpo que mencione productos, cantidades o precios

La IA también indica su nivel de **confianza** en la decisión:
- **Alta** — muy segura de que es (o no es) una OC
- **Media** — bastante segura, pero con alguna duda
- **Baja** — poca certeza; conviene revisar manualmente

### 3. Guardar los resultados

Las clasificaciones se guardan en una base de datos para no tener que analizar el mismo correo dos veces. Esto hace que la app sea rápida: si ya clasificó un correo esta mañana, no lo vuelve a procesar.

### 4. Mostrar en el dashboard

Con todos los correos clasificados, la app muestra un resumen visual:
- Una tarjeta por cada vendedor
- Cuántos correos recibió ese día
- Cuántas OCs fueron detectadas
- A qué hora llegó la última OC

---

## Las pantallas de la app

### Pantalla de inicio de sesión

Al entrar a la app, se pide un correo y contraseña. Las credenciales son las mismas que usa BIENEK con Supabase (el sistema de autenticación que usa la app).

Una vez autenticado, la app redirige automáticamente al dashboard.

---

### Dashboard principal

Es la pantalla central de la app. Muestra una **grilla de tarjetas**, una por cada vendedor del equipo.

```
┌──────────────────────────────────────────────────┐
│  Tracker Órdenes de Compra                        │
│  ← Hoy — jueves 27 de febrero 2026 →  [Sincronizar Todos]  │
│  ● Clasificación en vivo                          │
├─────────────────┬─────────────────┬──────────────┤
│ 👤 Claudia G.   │ 👤 Roberto M.   │ 👤 Ana P.    │
│ 3 ÓRDENES       │ SIN ÓRDENES     │ 1 ORDEN      │
│ 14 correos · 3 OC│ 7 correos · 0 OC│ 9 correos · 1│
│ Última OC 14:32 │ --:--           │ 10:15        │
└─────────────────┴─────────────────┴──────────────┘
```

**Elementos clave del dashboard:**

| Elemento | Qué hace |
|---|---|
| **Selector de fecha** | Navega entre días (hasta 30 días atrás). Muestra "Hoy" cuando es el día actual |
| **Tarjeta de vendedor** | Muestra resumen de correos y OCs. Se puede hacer clic para ver el detalle |
| **Badge de órdenes** | Verde con número si hay OCs, gris con "SIN ÓRDENES" si no hay |
| **Última OC** | Hora en que llegó la última orden de compra del día |
| **Indicador de estado** | Punto verde parpadeante = datos de hoy en tiempo real. Texto gris = datos históricos |
| **Botón "Sincronizar Todos"** | Re-clasifica todos los correos del día manualmente |

---

### Detalle por vendedor

Al hacer clic en la tarjeta de un vendedor, se abre la pantalla de detalle con la **lista de todos sus correos del día**.

```
← Volver al Dashboard

Claudia García
jueves, 27 de febrero de 2026
Correos totales: 14  |  Órdenes detectadas: 3

┌────────────────────────────────────────────────┐
│ 08:15  ✓ OC    OC 1003974 – Despacho lunes     │
│               "Asunto contiene 'OC 1003974'..." │
│                                          [alta] │
├────────────────────────────────────────────────┤
│ 09:30  ✗ No OC Consulta precio producto X       │
│               "Solicitud de cotización, no OC" │
│                                          [alta] │
├────────────────────────────────────────────────┤
│ 14:32  ✓ OC    Pedido urgente – 50 unidades     │
│               "Cuerpo menciona cantidades..."   │
│                                          [media]│
└────────────────────────────────────────────────┘
```

**Por cada correo se muestra:**

| Dato | Descripción |
|---|---|
| **Hora** | A qué hora llegó el correo (HH:MM) |
| **Badge OC / No OC** | Verde con ✓ si es OC, gris con ✗ si no lo es |
| **Asunto** | Línea de asunto del correo |
| **Motivo** | Explicación de por qué la IA tomó esa decisión |
| **Confianza** | Alta / Media / Baja |
| **Corrección manual** | Si alguien ya corrigió este correo, aparece indicado |

#### Ver el contenido completo del correo

Hay un pequeño ícono de sobre junto al asunto. Al hacer clic, se abre una ventana emergente con el contenido completo del correo.

---

### Corregir una clasificación (feedback)

Si la IA se equivocó (marcó un correo como OC cuando no lo era, o viceversa), cualquier usuario puede corregirlo.

**Cómo hacerlo:**
1. En la lista de correos del vendedor, buscar el correo mal clasificado
2. Hacer clic en el ícono ✓ (para marcarlo como OC) o ✗ (para marcarlo como No OC)
3. Aparece un recuadro pidiendo explicar el motivo del cambio
4. Escribir una breve nota y confirmar

El correo quedará marcado como **"Corrección manual"** y esa corrección no será sobreescrita en futuras sincronizaciones. Además, las correcciones sirven como ejemplos para que la IA mejore sus decisiones futuras.

---

### Log de clasificación

Accesible desde el encabezado del dashboard con el enlace "Ver Log de Correos".

Muestra una **tabla con todos los correos clasificados en el día**, con información detallada:

| Hora | Decisión | Confianza | Vendedor | Asunto | Motivo de la IA |
|---|---|---|---|---|---|
| 08:15 | Es OC | Alta | Claudia G. | OC 1003974... | Asunto contiene código OC... |
| 09:30 | No es OC | Alta | Claudia G. | Consulta precio... | Solicitud de cotización... |

Esta pantalla sirve para **auditar** el trabajo de la IA: ver por qué tomó cada decisión y detectar patrones de error.

---

## Glosario de términos

| Término | Significado |
|---|---|
| **OC** | Orden de Compra (también llamada Pedido). Es cuando un cliente confirma que quiere comprar algo |
| **ForceManager / Sage** | El CRM (sistema de gestión de clientes) que usa BIENEK. Los correos del equipo están ahí |
| **Gemini** | Modelo de inteligencia artificial de Google que analiza los correos |
| **Supabase** | Base de datos donde se guardan los resultados de la clasificación |
| **Confianza alta/media/baja** | Qué tan segura está la IA de su decisión |
| **Corrección manual** | Cuando un usuario humano cambia la decisión de la IA |
| **Sincronizar** | Pedirle a la app que vuelva a leer y clasificar los correos del día |
| **Dashboard** | Panel principal con la vista resumida de todos los vendedores |
| **PWA** | Progressive Web App. Significa que la app se puede instalar en el celular como si fuera una app nativa |

---

## Servicios externos que usa la app

| Servicio | Para qué se usa |
|---|---|
| **ForceManager** | Fuente de los correos. La app lee los emails desde aquí |
| **Google Gemini** | Motor de IA que clasifica si un correo es OC o no |
| **Supabase** | Base de datos y sistema de autenticación (login) |

---

## ¿Quién puede usar la app?

Cualquier persona con credenciales válidas de BIENEK. El acceso se gestiona a través del sistema de autenticación de Supabase. No hay roles diferenciados dentro de la app: todos los usuarios autenticados ven la misma información y pueden hacer correcciones manuales.

---

## Información técnica básica

- La app funciona en el navegador web (Chrome, Edge, Safari, Firefox)
- También se puede instalar como app en el celular (es una PWA)
- El idioma es español, con formatos de fecha y hora para Chile (zona horaria America/Santiago)
- Los datos históricos están disponibles hasta **30 días atrás**
- URL de acceso: definida en el ambiente de producción (consultar al equipo técnico)
