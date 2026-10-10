# ADR-006: Decisiones del frontend

- **Estado:** aceptada

## Contexto
El enunciado pide Next.js 14+ con App Router, React Query, Axios y Tailwind, paginación de 10
elementos y polling cada 3 s. Hubo que decidir varios detalles que el enunciado no fija.

## Opciones consideradas y decisión
1. **Dónde vive la página actual de la lista:** en estado de React o en la URL (`?page=2`).
   → **URL.** El botón "atrás" funciona, el enlace se puede compartir y la página la lee el
   Server Component sin necesitar `useSearchParams` ni `Suspense`.
2. **`tailwind.config.ts` (lo muestra la estructura del enunciado):** Tailwind v4 lo reemplazó
   por configuración en CSS (`@theme` en `globals.css`). → **No se crea**; se documenta la diferencia.
3. **Fuentes y estilo visual:** la primera versión usaba la estética por defecto de las plantillas
   (tarjetas redondeadas con sombra, botones verde esmeralda) y se veía genérica.
   → **Rediseño tipo "libro contable"**, coherente con un producto de contabilidad de carbono:
   papel cálido, tinta, reglas finas en vez de tarjetas, títulos serif (Newsreader), cifras en
   IBM Plex Mono con números de asiento (`013`) y un único acento verde bosque. Los colores de estado
   del enunciado se mantienen (amarillo, azul, verde, rojo) en tonos de la paleta.
   Las fuentes se cargan con `next/font/google`: se descargan **durante el build** y se sirven desde el
   propio sitio (sin peticiones a Google en runtime). El build de Docker necesita internet, igual que `npm ci`.
4. **Polling con la pestaña oculta:** seguir consultando o pausar.
   → **Pausar** (comportamiento por defecto de React Query). Al volver a la pestaña, `refetchOnWindowFocus`
   trae el estado actual de inmediato. No se pierden actualizaciones y se ahorran peticiones.
5. **Validación del archivo en el cliente:** el backend ya valida. → **Validar también en el cliente**
   (extensión, vacío y 10 MB) para dar feedback inmediato. El backend sigue siendo la autoridad.

## Consecuencias
- Ganamos: navegación natural, builds reproducibles y menos tráfico.
- Sacrificamos: el límite de 10 MB está duplicado (frontend y backend); si cambia, hay que cambiarlo en los dos.
