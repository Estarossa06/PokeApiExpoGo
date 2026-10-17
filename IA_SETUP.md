# Integración inicial de IA

## Proveedor

La fase inicial usa Gemini 3.5 Flash-Lite mediante la Gemini Developer API. Se seleccionó porque generó respuesta de prueba con la clave configurada mientras Gemini 3.8 Flash excedía el timeout. La página oficial de precios indica acceso gratuito a entrada y salida de texto en el nivel Free. Los límites RPM, TPM y RPD dependen del modelo y del proyecto, cambian con el tiempo y se consultan en Google AI Studio. El nivel gratuito puede usar los datos enviados para mejorar productos de Google; no se deben enviar datos sensibles.

La aplicación no contiene la clave. El backend la obtiene de `GEMINI_API_KEY` y la envía a Gemini como encabezado `x-goog-api-key`. El modelo está fijado en el backend a `gemini-3.5-flash-lite`; si falla o no está disponible, se devuelve un error y no se prueba otro proveedor ni otro modelo.

El endpoint limita cada IP a 10 solicitudes por minuto. El límite protege la cuota de nuestro servidor; la cuota propia del proyecto de Google sigue aplicando independientemente.

## Arquitectura

`src/app/(tabs)/ia.tsx` permite elegir el dominio por separado y usa `src/services/ai.ts`. El servicio llama a `POST /api/ai/database-chat` en el backend de Pokémon. El router valida el historial, lee solo la fuente seleccionada y entrega a Gemini una única ficha encontrada. No usa herramientas de búsqueda ni las rutas de profesores.

Cada turno vuelve a leer los datos para reflejar cambios recientes. Pokémon se consulta directamente en PostgreSQL con sus campos `id`, `name`, `height`, `weight` e `image`. Dragon Ball usa únicamente el microservicio propio conectado a MongoDB y los campos guardados allí. Si no se encuentra un nombre, Gemini no se consulta; si se pide un dato o atributo no disponible, el backend informa que no está almacenado. Al cambiar de dominio, la pantalla limpia el historial para no mezclar contextos.

## Configuración local

1. Copia `pokemon-backend/.env.example` a `pokemon-backend/.env` y agrega una clave creada en [Google AI Studio](https://aistudio.google.com/apikey) como `GEMINI_API_KEY`. La clave no debe ponerse en el `.env` raíz ni en una variable `EXPO_PUBLIC_*`. `DRAGONBALL_API_URL` solo se cambia si cambia la URL del microservicio propio de Dragon Ball.
2. Desde `pokemon-backend`, instala dependencias si aún no están instaladas y arranca el servicio:

   ```powershell
   npm install
   npm start
   ```

3. Copia `.env.example` a `.env` en la raíz de la aplicación. Para Expo Web y simuladores, `http://localhost:3000` suele funcionar. En un dispositivo físico, usa la IP local del computador, por ejemplo `http://192.168.1.20:3000`.
4. Desde la raíz, inicia Expo:

   ```powershell
   npx expo start
   ```

Para probar el backend sin consumir cuota del modelo:

```powershell
cd pokemon-backend
npm test
```

## Estado de verificación

Las 10 pruebas de `npm test` usan fuentes de datos y proveedor simulados; cubren separación de dominios, exclusión de registros ausentes, atributos no disponibles, límites y ausencia de fallback. El selector y el cambio de dominio se verificaron en Expo Web. La ruta de fase 2 es `/api/ai/database-chat`; si la app llega a un despliegue anterior, recibirá `404` en vez de consultar el chat general de fase 1. La prueba real de la nueva ruta en Render queda pendiente del despliegue de estos cambios.

## Despliegue y prueba real

El backend de Pokémon existente está publicado en Render. Al desplegar estos cambios en ese servicio, configura `GEMINI_API_KEY` como secreto y `DRAGONBALL_API_URL` con el microservicio propio de Dragon Ball si cambia su URL. La app usa por defecto `https://pokemon-backend-rfz3.onrender.com`; la prueba real de fase 2 requiere desplegar la ruta `/api/ai/database-chat`.

Las consultas de fase 2 no acceden a bases de terceros, buscadores ni datos de profesores. Pokémon se consulta directamente en PostgreSQL; Dragon Ball se lee mediante el microservicio propio conectado a MongoDB. La cuota de Gemini puede agotarse y sus límites no son garantía de disponibilidad.

El límite actual es por IP, no por cuenta de usuario. El endpoint tampoco tiene autenticación; antes de anunciarlo públicamente, protégelo con autenticación para evitar consumo no autorizado de la cuota del proyecto.