# Guía Técnica: API de ForceManager (Sage Sales Management)

Esta documentación resume los hallazgos sobre la integración con la API de ForceManager para la gestión de clientes y ventas.

## 1. Autenticación y Seguridad

La API utiliza un sistema de autenticación basado en **Service Keys** y **Session Tokens**.

### Credenciales (Service Keys)
Se obtienen desde la aplicación web de ForceManager:
- **Ruta**: `Configuración > Integraciones > Gestión de claves API`
- **Campos**:
  - `publicKey`: Identificador público de la cuenta.
  - `privateKey`: Clave privada secreta (debe tratarse como una contraseña).

### Proceso de Login
Para obtener un token válido, se debe realizar una petición `POST` al endpoint de login.

- **Endpoint**: `https://api.forcemanager.com/api/v4/login`
- **Body (JSON)**:
  ```json
  {
    "publicKey": "TU_CLAVE_PUBLICA",
    "privateKey": "TU_CLAVE_PRIVADA"
  }
  ```
- **Respuesta**: Se devuelve un objeto JSON con un `token`.
- **Validez**: El token es válido por **24 horas**.

### Uso del Token
Todas las peticiones a la API deben incluir el token en la cabecera HTTP:
- **Header**: `X-Session-Key: <TOKEN>`

## 2. Endpoints Principales

La mayoría de los recursos están disponibles bajo la versión `/v4/` de la API.

| Recurso | Endpoint | Descripción |
| :--- | :--- | :--- |
| **Cuentas** | `GET /api/v4/accounts` | Obtiene la lista de clientes/empresas. |
| **Contactos** | `GET /api/v4/contacts` | Obtiene las personas de contacto de las cuentas. |
| **Oportunidades** | `GET /api/v4/opportunities` | Gestión del pipeline de ventas. |
| **Actividades** | `GET /api/v4/activities` | Registro de llamadas, visitas y tareas. |

## 3. Consideraciones Técnicas

- **Formato**: La API espera y devuelve datos en formato `application/json`.
- **Paginación**: Los resultados suelen estar paginados. Se pueden usar parámetros como `rowoffset` y `rowcount`.
- **Límites**: Consultar la documentación oficial para conocer los límites de tasa (rate limits) aplicables a la cuenta.

---
*Documentación generada el 18 de febrero de 2026 para el equipo de BIenek.*
