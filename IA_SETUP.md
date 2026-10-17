# Integración inicial de IA

## Proveedor

La fase inicial usa Gemini 3.8 Flash mediante la Gemini Developer API. A la fecha de implementación, la página oficial de precios indica acceso gratuito a entrada y salida de texto en el nivel Free. Los límites RPM, TPM y RPD dependen del modelo y del proyecto, cambian con el tiempo y se consultan en Google AI Studio. El nivel gratuito puede usar los datos enviados para mejorar productos de Google; no se deben enviar datos sensibles.

La aplicación no contiene la clave. El backend la obtiene de `GEMINI_API_KEY` y la envía a Gemini como encabezado `x-goog-api-key`. El modelo está fijado en el backend a `gemini-3.8-flash`; si falla o no está disponible, se devuelve un error y no se prueba otro proveedor ni otro modelo.

El endpoint limita cada IP a 10 solicitudes por minuto. El límite protege la cuota de nuestro servidor; la cuota propia del proyecto de Google sigue aplicando independientemente.

## Arquitectura

`src/app/(tabs)/ia.tsx` mantiene los mensajes de la sesión y usa `src/services/ai.ts`. El servicio llama a `POST /api/ai/chat` en el backend de Pokémon. El router aislado `pokemon-backend/ai-chat.js` valida el historial y consulta `models.generateContent` de Gemini. Esta ruta no accede a PostgreSQL ni modifica las rutas de profesores.

## Configuración local

1. Copia `pokemon-backend/.env.example` a `pokemon-backend/.env` y agrega una clave creada en [Google AI Studio](https://aistudio.google.com/apikey) como `GEMINI_API_KEY`. La clave no debe ponerse en el `.env` raíz ni en una variable `EXPO_PUBLIC_*`.
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

Las siete pruebas de `npm test` usan un `fetch` simulado; validan formato, mapeo de errores, límites y que no haya fallback, pero no se conectan a Google. La prueba HTTP local sin clave devolvió `503` como se esperaba. No hay una clave configurada, así que todavía no se ha probado una respuesta real de Gemini. La etapa 2 debe esperar hasta completar esa prueba real.

## Despliegue y prueba real

El backend de Pokémon existente está publicado en Render. Al desplegar estos cambios en ese servicio, configura `GEMINI_API_KEY` como secreto. La app usa por defecto `https://pokemon-backend-rfz3.onrender.com`; una prueba real requiere que el backend actualizado esté desplegado y que el proveedor acepte la clave y cuota del proyecto.

La prueba de esta fase no accede a bases de datos de Pokémon o Dragon Ball, no usa búsqueda web, RAG ni instrucciones temáticas. La cuota puede agotarse y los límites del nivel gratuito no son garantía de disponibilidad.

El límite actual es por IP, no por cuenta de usuario. El endpoint tampoco tiene autenticación; antes de anunciarlo públicamente, protégelo con autenticación para evitar consumo no autorizado de la cuota del proyecto.