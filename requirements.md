# Requisitos y ejecución del proyecto

## 1. Software necesario

Para ejecutar el proyecto se necesita:

- Node.js
- npm
- Git
- Visual Studio Code (recomendado)
- Expo Go en el dispositivo móvil, si se utilizará un teléfono físico

Comprobar Node.js y npm:

```bash
node --version
npm --version
```

## 2. Clonar el proyecto

```bash
git clone URL_DEL_REPOSITORIO
cd PokeApiExpoGo
```

## 3. Instalar dependencias del frontend

Desde la raíz del proyecto:

```bash
npm install
```

Las dependencias del frontend están definidas en el `package.json` principal.

No es necesario subir `node_modules` al repositorio.

## 4. Microservicio de Pokémon

Entrar en:

```bash
cd pokemon-backend
```

Instalar dependencias:

```bash
npm install
```

Ejecutar:

```bash
node index.js
```

El microservicio utiliza el puerto `3000`.

## 5. Microservicio de Dragon Ball

Abrir otra terminal y entrar en:

```bash
cd dragonball-backend
```

Instalar dependencias:

```bash
npm install
```

Ejecutar:

```bash
node index.js
```

El microservicio utiliza el puerto `3001`.

## 6. Ejecutar Expo

Desde la raíz:

```bash
npx expo start
```

También se puede utilizar:

```bash
npm start
```

## 7. Uso con un dispositivo físico

1. Instalar Expo Go.
2. Conectar el computador y el teléfono a la misma red.
3. Ejecutar `npx expo start`.
4. Escanear el código QR mostrado por Expo.

## 8. Configuración de las direcciones IP

Los microservicios se ejecutan en el computador, mientras que Expo Go puede ejecutarse en el teléfono.

Por eso, los Context del frontend no deben utilizar `localhost` para comunicarse con los microservicios desde el teléfono.

En `context/PokemonContext.tsx`:

```ts
const API_URL = "http://IP_DEL_PC:3000";
```

En `context/DragonBallContext.tsx`:

```ts
const API_URL = "http://IP_DEL_PC:3001";
```

La IP debe corresponder al computador que ejecuta los microservicios y que está en la misma red que el teléfono.

## 9. Obtener la IP en Windows

Ejecutar:

```bash
ipconfig
```

Buscar la dirección IPv4 del adaptador de red conectado a la misma red que el teléfono.

Por ejemplo:

```text
IPv4: 192.168.1.100
```

se utilizaría:

```ts
const API_URL = "http://192.168.1.100:3000";
```

y:

```ts
const API_URL = "http://192.168.1.100:3001";
```

No se debe copiar una IP de otra computadora o de otra red.

## 10. Orden recomendado de ejecución

### Terminal 1 — Microservicio Pokémon

```bash
cd pokemon-backend
node index.js
```

### Terminal 2 — Microservicio Dragon Ball

```bash
cd dragonball-backend
node index.js
```

### Terminal 3 — Aplicación Expo

Desde la raíz:

```bash
npx expo start
```

## 11. Arquitectura del proyecto

### Pokémon

```text
React Native
    ↓
PokemonContext
    ↓
pokemon-backend
    ↓
PokeAPI
```

### Dragon Ball

```text
React Native
    ↓
DragonBallContext
    ↓
dragonball-backend
    ↓
Dragon Ball API
```

El frontend no consume directamente las APIs externas.

## 12. Pantallas de la aplicación

### Home

Permite buscar un Pokémon y visualizar sus imágenes.

### Information

Muestra información del Pokémon encontrado:

- Altura
- Peso
- Especie
- Stats
- Movimientos

### Character

Permite buscar un personaje de Dragon Ball y muestra:

- Nombre
- Imagen
- Raza
- Descripción

### Transformations

Muestra las transformaciones del personaje buscado:

- Imagen
- Nombre
- Ki

## 13. Dependencias

Las dependencias del frontend se encuentran en:

```text
package.json
```

Las dependencias del microservicio Pokémon se encuentran en:

```text
pokemon-backend/package.json
```

Las dependencias del microservicio Dragon Ball se encuentran en:

```text
dragonball-backend/package.json
```

Para instalar las dependencias de cada parte se debe ejecutar:

```bash
npm install
```

dentro de su respectiva carpeta.

## 14. Archivos que no deben subirse al repositorio

No se debe incluir:

```text
node_modules/
```

El archivo `.gitignore` debe excluir las dependencias instaladas.

## 15. Verificación rápida

Antes de ejecutar el proyecto:

```bash
node --version
npm --version
```

Después instalar las dependencias con `npm install` en:

- la raíz del proyecto
- `pokemon-backend`
- `dragonball-backend`

Finalmente iniciar los dos microservicios y Expo.

## 16. Nota para ejecutar el proyecto en otra PC

Las dependencias se pueden reconstruir mediante `npm install`, por lo que no es necesario transportar `node_modules`.

La configuración de `API_URL` debe revisarse en cada computador, porque la dirección IP local depende de la red utilizada.

El proyecto requiere que los microservicios estén activos para que las funciones de búsqueda de Pokémon y Dragon Ball funcionen correctamente.
