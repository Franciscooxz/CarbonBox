# Uso de Inteligencia Artificial en esta prueba

La prueba permite y fomenta el uso de IA. Mi enfoque fue usarla como un equipo de ejecución rápido,
manteniendo yo la dirección: definir reglas antes de escribir código, exigir verificación en cada paso,
cuestionar los resultados y decidir el alcance. Este documento explica qué hizo la IA, qué decidí yo,
qué se corrigió y qué aprendí. El detalle fase por fase está en [docs/bitacora-ia.md](docs/bitacora-ia.md)
y las decisiones técnicas en [docs/decisiones/](docs/decisiones).

## Herramientas utilizadas

- [x] **Claude Code** (app de escritorio): análisis del enunciado, generación de código, pruebas y documentación.
- [x] **Claude (chat)**: análisis inicial del enunciado y redacción del plan de trabajo (`CLAUDE.md`).
- [ ] GitHub Copilot
- [ ] ChatGPT
- [ ] Cursor AI

## Cómo trabajé con la IA

1. **Reglas antes que código.** Antes de generar una sola línea redacté con Claude un `CLAUDE.md` con el stack,
   las reglas de arquitectura que no se podían romper (nada de Prisma en controllers, nada de `any`, `Either`
   en todos los handlers, dominio sin dependencias externas) y la forma de trabajo. Ese archivo guio todas las sesiones.
2. **Revisión crítica del plan.** Pedí analizar el plan contra el enunciado antes de implementarlo. Esa revisión
   encontró cuatro fallos en los casos de error que el propio plan (también generado con IA) no contemplaba.
3. **Verificación obligatoria.** Cada fase cerró con `typecheck`, `lint`, tests y pruebas reales: peticiones con
   curl, uso de la app en el navegador y levantamiento completo en Docker. Nada se dio por terminado sin probarlo.
4. **Control del alcance.** El plan original tenía 12 fases. Lo reorganicé en 3 (backend, frontend, entrega)
   para priorizar un sistema funcional de punta a punta, que es lo que la prueba pide primero.
5. **Auditoría final.** Al terminar pedí comparar el resultado punto por punto contra el enunciado, en lugar
   de asumir que estaba completo.

## Qué generé con IA

### Backend
- [x] Estructura DDD / Clean Architecture / CQRS del bounded context `document-processing`
- [x] Shared kernel: `Either`, `DomainError`, `AggregateRoot`, interfaces de handlers y de mensajería
- [x] Dominio: `Upload` (con sus transiciones de estado protegidas), `ActivityData`, `UploadStatus`, `FileName`
- [x] Schema de Prisma, mappers y repositorios
- [x] `CsvParserService` con `csv-parse` y Zod
- [x] Commands, queries y sus handlers; publicador y consumidor de SQS; worker con reintentos
- [x] Fastify, controllers, error handler central y contenedor Awilix
- [x] 49 tests unitarios con implementaciones en memoria
- [x] 15 tests de integración con la API, el worker, PostgreSQL y la cola reales
- [x] Reintentos con exponential backoff en el worker
- [x] Configuración: TypeScript strict, ESLint (con reglas que impiden importar librerías externas en `domain`), Vitest, Convict

### Frontend
- [x] Proyecto Next.js 15 con App Router
- [x] Hooks de React Query con polling condicional
- [x] Componentes de subida, lista paginada, detalle, progreso, resultados y errores
- [x] Diseño visual y estilos con Tailwind 4

### Infraestructura y documentación
- [x] `docker-compose.yml`, Dockerfiles multi-stage y configuración de la cola
- [x] Diagrama de arquitectura AWS, README, ADRs y documentos de cada fase

## Qué decidí y dirigí yo

- **El plan y las reglas de trabajo** con las que la IA tenía que generar el código.
- **Pedir la revisión crítica del plan**, que evitó implementar un diseño con fallos en reintentos, DLQ y progreso.
- **El alcance:** pasar de 12 fases a 3 para entregar un sistema completo y funcional.
- **El diseño visual:** la primera interfaz se veía genérica, como de plantilla. Pedí rehacerla y elegí una
  dirección de "libro contable", coherente con un producto de contabilidad de carbono. En ese rediseño se
  agregaron además los totales por categoría y la tabla de filas rechazadas.
- **La verificación final contra el enunciado**, que dejó claro qué estaba completo y qué faltaba.

## Qué se modificó o corrigió

1. **La cola en memoria que sugiere el enunciado no funciona en este diseño.** El worker corre en otro proceso
   (`npm run worker`) y no puede ver la memoria de la API. Se usó la API real de SQS
   ([ADR-001](docs/decisiones/ADR-001-cola-sqs-localstack.md)).
2. **LocalStack ya no es gratuito sin cuenta.** El plan proponía LocalStack. Al verificarlo en la documentación
   oficial se confirmó que desde la versión 2026.03 exige un token. Se cambió a ElasticMQ, que implementa la misma
   API de SQS con el mismo SDK, para que cualquier evaluador pueda levantar el proyecto sin registrarse.
3. **El plan inicial tenía contradicciones en los casos de error**
   ([ADR-003](docs/decisiones/ADR-003-reintentos-progreso-y-dlq.md)):
   - un reintento quedaba bloqueado porque el agregado no permitía volver a procesar un upload en `PROCESSING`;
   - un mensaje enviado a la DLQ dejaba el upload en `PROCESSING` para siempre, con polling infinito en el frontend;
   - una única transacción para todo el archivo hacía invisible la barra de progreso;
   - con parseo en streaming no se conocía el total de filas para calcular el progreso.
4. **El polling solo en `PROCESSING`**, tal como lo dice el enunciado, dejaba congelado un upload recién creado
   en `PENDING`. Se extendió a ambos estados ([ADR-002](docs/decisiones/ADR-002-polling-en-pending-y-processing.md)).
5. **Validación duplicada en Zod.** Al revisar el primer schema se vio que un valor como `abc` reportaría dos errores
   ("no es un número" y "debe ser mayor que 0"). Se encadenó la validación con `.pipe()` y un test lo cubre.
6. **Bug en el `.gitignore`.** La regla `uploads/`, pensada para los archivos subidos al backend, también ignoraba
   las páginas `frontend/src/app/uploads/`. Esas páginas no se habrían subido al repositorio. Se detectó al
   verificar el rediseño y se corrigió.
7. **Problemas del entorno Windows y Docker:** un PostgreSQL local ocupaba el puerto 5432 (se usó el 5433), un
   `package-lock.json` desincronizado rompía `npm ci` dentro de Docker, y el healthcheck fallaba porque en Alpine
   `localhost` resuelve a IPv6.
8. **Los tests de integración apuntaban a la base de datos de desarrollo.** Prisma Client carga el `.env` de
   desarrollo al importarse, antes que la configuración de test. Antes de escribirlos se agregó una protección que
   impide correr los tests si la base no termina en `_test`, y fue esa protección la que detectó el problema
   sin borrar ningún dato. Se corrigió haciendo que `.env.test` tenga prioridad en modo test
   ([ADR-007](docs/decisiones/ADR-007-backoff-y-tests-de-integracion.md)).
9. **Versiones elegidas a propósito.** Se descartaron las versiones más recientes (Prisma 8, TypeScript 7, Vitest 5)
   en favor de versiones estables y bien documentadas
   ([ADR-005](docs/decisiones/ADR-005-versiones-y-puertos.md)).

## Qué aprendí

1. **Mensajería con SQS.** Un mensaje recibido queda oculto durante el *visibility timeout*. Si el worker falla y no
   lo borra, SQS lo vuelve a entregar, y tras tres intentos lo mueve a la Dead Letter Queue. Como SQS garantiza
   entrega "al menos una vez", un mensaje puede llegar duplicado: por eso el worker ignora los uploads que ya terminaron.
   Cambiando el visibility timeout de cada mensaje se implementa el *exponential backoff*: cada reintento espera
   más que el anterior para no saturar una dependencia que está caída.
2. **React Query.** `refetchInterval` puede ser una función: devuelve 3000 ms mientras el upload no termina y `false`
   cuando llega a un estado final, de modo que el polling se apaga solo. También aprendí que el polling se pausa
   cuando la pestaña está oculta y se reanuda al volver, lo que ahorra peticiones.
3. **Either y manejo de errores.** Los errores de negocio se devuelven como `Left` en lugar de lanzarse. Así quien
   llama está obligado a manejarlos, y un único error handler central los traduce a códigos HTTP.
4. **Clean Architecture en la práctica.** Cambiar de LocalStack a ElasticMQ no requirió tocar ni el dominio ni la
   capa de aplicación, solo infraestructura y configuración. Fue la demostración concreta de para qué sirven las capas.
5. **Docker.** Los builds multi-stage producen imágenes sin herramientas de desarrollo. Las variables
   `NEXT_PUBLIC_*` se fijan en el build porque las usa el navegador del usuario, no el contenedor.

## Limitaciones encontradas con la IA

- **Planes que parecen completos pero fallan en los casos de error.** El primer plan se veía sólido y tenía cuatro
  fallos de diseño. Aprendí a preguntar explícitamente "¿qué pasa si esto falla?" antes de aceptar una propuesta.
- **Información desactualizada.** Proponía LocalStack como opción gratuita y ya no lo era. Hubo que verificar en la
  documentación oficial.
- **Criterio de producto.** El primer diseño visual era genérico. La IA ejecuta bien, pero la dirección estética y
  de producto tuvo que venir de mí.
- **Problemas del entorno real.** Los puertos ocupados, las diferencias de versión de npm y el IPv6 de Alpine solo se
  resolvieron ejecutando y leyendo los errores reales, no prediciéndolos.

## Tiempo invertido

- Planeación y análisis del enunciado: 1 hora
- Backend (dominio, aplicación, infraestructura, worker y tests): 1.5 horas
- Frontend y rediseño visual: 1 hora
- Docker, diagrama AWS y documentación: 1 hora
- **Total:** aproximadamente 4.5 horas
