# ADR-003: Reintentos, progreso y Dead Letter Queue en el procesamiento

- **Estado:** aceptada

## Contexto
Al revisar el plan inicial aparecieron cuatro problemas que harían fallar el sistema en casos reales:

1. **Reintento bloqueado por el agregado.** Si el worker falla a mitad de camino, no borra el
   mensaje y SQS lo reentrega. Pero el upload ya está en `PROCESSING`, y la regla
   "`PENDING → PROCESSING` y nada más" hace que el reintento retorne `Left`: nunca se reprocesa.
2. **Upload colgado tras la DLQ.** Después de `maxReceiveCount` intentos el mensaje pasa a la
   DLQ, pero el upload sigue en `PROCESSING` y el frontend hace polling para siempre.
3. **Progreso invisible.** Insertar todos los lotes en una sola transacción hace que
   `processedRows` no sea visible para la API hasta el commit final (READ COMMITTED).
4. **Total desconocido.** Con parseo en streaming no se sabe `totalRows` hasta terminar, así que
   la barra de progreso no tiene denominador.

## Opciones consideradas
- Reintento: **A.** permitir cualquier transición (pierde la protección del agregado) ·
  **B.** permitir solo la transición adicional `PROCESSING → PROCESSING` (reanudación), definida en la tabla
  de transiciones de `UploadStatus`.
- DLQ: **A.** consumidor aparte que lea la DLQ y marque `FAILED` · **B.** el worker lee
  `ApproximateReceiveCount` y marca `FAILED` en el último intento.
- Progreso: **A.** una transacción global · **B.** una transacción por lote.
- Parseo: **A.** streaming · **B.** archivo completo en memoria (límite de 10 MB).

## Decisión
Reintento **B**, DLQ **B** (la DLQ queda para inspección manual), progreso **B**, parseo **B**.
En el código, `Upload.startProcessing()` acepta tanto `PENDING` como `PROCESSING` y reinicia los contadores;
cualquier otra transición sigue retornando `Left`.
Además, si falla la publicación en SQS al crear el upload, se marca `FAILED` (`PENDING → FAILED`).

## Consecuencias
- Ganamos: reintentos reales, ningún upload queda colgado, barra de progreso que avanza.
- Sacrificamos: si el worker cae entre lotes, quedan filas parciales; por eso al reanudar se
  borran las `ActivityData` previas antes de reprocesar. El parseo en memoria no escala a
  archivos de cientos de MB (fuera del alcance: límite de 10 MB).
