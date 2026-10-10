# ADR-002: Hacer polling mientras el estado sea PENDING o PROCESSING

- **Estado:** aceptada

## Contexto
El enunciado pide polling cada 3 segundos "mientras status = PROCESSING". Pero un upload
recién creado empieza en `PENDING` y solo pasa a `PROCESSING` cuando el worker lo toma.
Si el polling solo corre en `PROCESSING`, la página de detalle de un upload nuevo nunca
se actualizaría.

## Opciones consideradas
- **A. Polling solo en PROCESSING:** literal al enunciado, pero deja la página congelada en PENDING.
- **B. Polling en PENDING y PROCESSING:** se detiene solo en estados finales.

## Decisión
**Opción B**, usando `refetchInterval` de TanStack Query como función que retorna `3000`
en estados no finales y `false` en `COMPLETED` o `FAILED`.

## Consecuencias
- La pantalla se actualiza desde el primer momento hasta que el procesamiento termina.
- No hay peticiones innecesarias una vez que el upload llega a un estado final.
