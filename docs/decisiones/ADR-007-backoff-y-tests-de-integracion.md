# ADR-007: Reintentos con exponential backoff y tests de integración

- **Estado:** aceptada

## Contexto
1. Cuando el worker fallaba por un error transitorio (base de datos caída, archivo ilegible), SQS reintentaba
   siempre tras el mismo *visibility timeout* de 30 s. Si la dependencia sigue caída, reintentar a intervalo fijo
   la sigue golpeando sin darle tiempo a recuperarse.
2. Los 44 tests existentes eran unitarios con fakes en memoria: no probaban que las piezas reales
   (Fastify, Prisma, PostgreSQL, SQS) funcionaran juntas.

## Opciones consideradas
- Backoff: **A.** `DelaySeconds` al republicar un mensaje nuevo · **B.** `ChangeMessageVisibility` sobre el mismo mensaje.
- Tests: **A.** levantar servidor HTTP real y usar un cliente · **B.** `fastify.inject` contra la app real
  más el worker real, con PostgreSQL y cola reales.

## Decisión
- Backoff **B**: el worker cambia el visibility timeout del mensaje según el intento
  (`base × factor^(intento−1)` con tope): 10 s, 40 s, 160 s... hasta 300 s. Republicar (A) reiniciaría el contador
  de entregas y rompería la DLQ. En el último intento no se reprograma: el upload se marca FAILED y el mensaje va a la DLQ.
  Los errores de negocio no se reintentan. Base, factor y tope son configurables por variables de entorno.
- Tests **B**: `inject` recorre rutas, controllers, handlers y repositorios sin abrir un puerto.
  - Base de datos aparte `document_processing_test`, creada y migrada automáticamente con las migraciones reales.
  - Colas aparte (`file-processing-test` y su DLQ) para que el worker de desarrollo no les robe mensajes.
  - Protección: el setup se niega a correr si el nombre de la base no termina en `_test`.

## Consecuencias
- Ganamos: reintentos que no saturan una dependencia caída, y 15 tests que prueban el sistema de punta a punta
  (incluido el backoff contra la cola real).
- Sacrificamos: los tests de integración requieren `docker compose up -d postgres sqs`.
- Hallazgo: Prisma Client carga el `.env` de desarrollo al importarse; sin forzar `.env.test` en modo test,
  los tests apuntaban a la base de desarrollo. La protección del nombre `_test` lo detectó antes de borrar nada.
