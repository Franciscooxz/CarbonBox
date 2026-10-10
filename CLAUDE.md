# CLAUDE.md — Prueba técnica CarbonBox

> Claude Code lee este archivo al iniciar cada sesión. Contiene el contexto del proyecto,
> las reglas que nunca se rompen y, sobre todo, **cómo debes trabajar conmigo**.

---

## 0. Quién soy y cómo trabajamos (LEE ESTO PRIMERO)

Soy Francisco, desarrollador full stack. Esta es una **prueba técnica** para CarbonBox y
después tendré una **entrevista técnica** donde debo defender cada decisión y cada línea.
La empresa **permite y fomenta el uso de IA**, pero penaliza el "código copiado sin entender".

Por eso trabajas en **modo mentor**, no en modo "hazlo todo":

1. **Una fase a la vez.** Nunca empieces la siguiente fase sin que yo escriba "siguiente fase".
2. **Antes de escribir código**, explícame en 5–10 líneas:
   - qué vamos a construir en esta fase y por qué va en este orden,
   - qué alternativas había y por qué elegimos esta,
   - qué conceptos nuevos aparecen (explicados en simple, con un ejemplo).
   Espera a que diga "dale" antes de generar archivos.
3. **Pasos pequeños.** Dentro de cada fase, avanza por sub-pasos y muéstrame qué archivos
   creaste y para qué sirve cada uno. Nada de 20 archivos de golpe sin explicar.
4. **Comenta el código solo donde aporte** (el *porqué*, no el *qué*). En español.
5. **Al terminar cada fase**, sin excepción:
   - corre `typecheck`, `lint` y `test` y muéstrame el resultado,
   - escribe el documento de la fase en `docs/fases/` (ver plantilla en la sección 9),
   - registra cada decisión importante como ADR en `docs/decisiones/`,
   - agrega una entrada a `docs/bitacora-ia.md` (qué generaste, qué corregí yo, qué aprendí),
   - hazme **3 preguntas de entrevista** sobre lo que hicimos y espera mis respuestas;
     corrígeme si respondo mal,
   - **propón** el mensaje de commit (Conventional Commits, en español). **El commit lo hago yo.**
6. **Si yo propongo algo que viola la arquitectura**, dímelo y explica por qué, aunque yo insista.
7. **Si no sabes algo con certeza** (una API de AWS SDK, una opción de Fastify), dilo y
   revisa la documentación oficial antes de inventarlo.
8. Mi computador es **Windows** con Docker Desktop. Da los comandos para **PowerShell**.

---

## 1. Qué construimos

Sistema de **procesamiento asíncrono de documentos**:

1. El usuario sube un CSV con datos de actividad (consumos de energía, gas, transporte…).
2. La API guarda el archivo en S3, crea el registro `Upload` en estado `PENDING`,
   publica un mensaje en la cola y **responde de inmediato** con el ID.
3. Un **worker en un proceso separado** consume el mensaje, descarga el CSV, valida fila
   por fila, guarda las filas válidas y deja el upload en `COMPLETED` o `FAILED`.
4. El frontend consulta el estado cada 3 segundos y muestra los resultados al terminar.

Usuario único fijo: `userId = "user-123"` (el enunciado dice que no hace falta autenticación).

---

## 2. Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Runtime | Node.js 22 + TypeScript `strict` | Requisito del enunciado |
| HTTP | **Fastify** + `@fastify/multipart` + `@fastify/cors` | Requisito; más rápido que Express y con logger `pino` incluido |
| ORM / DB | **Prisma** + PostgreSQL 15 en Docker | Requisito |
| Inyección de dependencias | **Awilix** | Recomendado por el enunciado |
| Configuración | **Convict** + `.env` por ambiente | El enunciado lo muestra en la estructura (`IConvictProps.ts`) |
| Validación | **Zod** | Valida filas del CSV y DTOs con tipos inferidos |
| CSV | `csv-parse` (streaming) | No carga el archivo completo en memoria |
| Cola | **API de SQS vía ElasticMQ** (local) + Dead Letter Queue | Ver ADR-001 (revisado) |
| Almacenamiento | **Filesystem local** detrás de `IFileStorage` (S3 en AWS) | Ver ADR-001 (revisado) |
| SDK | `@aws-sdk/client-sqs`, `@aws-sdk/client-s3` (v3) | SDK oficial modular |
| Logging | `pino` (logger de Fastify) | Logging estructurado en JSON (puntos bonus) |
| Tests | **Vitest** | Rápido y compatible con TypeScript sin configuración extra |
| Frontend | Next.js 14+ App Router, TypeScript, **TanStack Query**, **Axios**, Tailwind | Requisito |

---

## 3. Decisión clave: la cola (ADR-001, ya tomada)

El enunciado sugiere una cola "mock" con un array en memoria. **No funciona en este diseño**:
el worker corre en **otro proceso** (`npm run worker`), y un array en la memoria de la API
no es visible para otro proceso. El mensaje nunca llegaría.

**Decisión:** usar la **API real de SQS** con el SDK oficial (`@aws-sdk/client-sqs`).
- La primera opción era LocalStack, pero desde la versión 2026.03 exige una cuenta y un token.
  Por eso en local se usa **ElasticMQ**, que implementa la misma API de SQS: el código es idéntico
  y solo cambia el `endpoint`. Incluye Dead Letter Queue (`maxReceiveCount: 3`).
- Almacenamiento: **filesystem local** detrás de `IFileStorage` (el enunciado lo permite); en AWS sería S3.
- Plan B que no hizo falta: una cola en una tabla de PostgreSQL con `SELECT ... FOR UPDATE SKIP LOCKED`.
- Todo va detrás de las interfaces `IMessagePublisher` / `IMessageConsumer` / `IFileStorage`. Cambiar de
  implementación no toca el dominio ni la aplicación (eso es justamente lo que demuestra Clean Architecture).

---

## 4. Arquitectura — reglas que nunca se rompen

### Capas (Clean Architecture)
```
presentation  →  application  →  domain
infrastructure  →  application / domain   (implementa sus interfaces)
```
- **domain**: entidades, value objects, interfaces de repositorio y errores de dominio.
  **No importa nada externo**: ni Prisma, ni Fastify, ni AWS SDK, ni Zod.
- **application**: commands, queries, handlers y servicios. Solo conoce `domain` e interfaces.
- **infrastructure**: Prisma, S3, SQS, Awilix. Implementa las interfaces.
- **presentation**: controllers y rutas. Solo traduce HTTP ↔ command/query.
  **Cero lógica de negocio y cero Prisma en controllers o rutas** (la empresa lo penaliza fuerte).

### DDD
- Bounded context: `document-processing`.
- `Upload` es **Aggregate Root**. Protege sus transiciones de estado:
  `PENDING → PROCESSING → COMPLETED | FAILED`. Además `PROCESSING → PROCESSING` está permitida
  **solo como reanudación de un reintento** (`startProcessing()` la acepta y reinicia los contadores, ver ADR-003).
  `PENDING → FAILED` se permite si falla la publicación en la cola. Cualquier otra transición retorna `Left`.
- El `id` del upload es un UUID generado en el dominio (`crypto.randomUUID`, módulo nativo de Node).
- Value objects: `UploadStatus`, `FileName` (no vacío, termina en `.csv`, máx. 255 caracteres,
  sin `/` ni `\`).
- `ActivityData`: entidad con `category`, `amount`, `unit`, `date`.
- **Mappers** entre modelos de Prisma y entidades de dominio. Las entidades nunca son tipos de Prisma.

### CQRS
- Commands (escriben): `CreateUploadCommand`, `ProcessFileCommand`, `FailUploadCommand`.
- Queries (leen): `GetUploadByIdQuery`, `ListUploadsQuery`, `GetUploadResultsQuery`, `GetUploadStatsQuery`.
- Cada uno con su handler. Interfaces:
```ts
interface ICommandHandler<TCommand, TResult> {
  execute(command: TCommand): Promise<Either<DomainError, TResult>>;
}
interface IQueryHandler<TQuery, TResult> {
  execute(query: TQuery): Promise<Either<DomainError, TResult>>;
}
```

### Either
- Todo handler retorna `Either<DomainError, T>`. **Nada de `throw` para errores de negocio.**
- **Sin try/catch en controllers.** Un **error handler central** de Fastify traduce:
  validación → 400, no encontrado → 404, inesperado → 500 (sin filtrar detalles internos).
- Las excepciones reales de infraestructura (DB caída) sí pueden lanzarse y las atrapa el handler central.

### Variables de entorno
- Convict carga `.env.${NODE_ENV}` (`.env.development`, `.env.test`) y valida el schema al arrancar.
- Solo se commitean los `.env.*.example`.

### Otras reglas
- TypeScript `strict: true`. **Sin `any`.** Si algo no tiene tipo, se tipa o se usa `unknown` + validación.
- Inyección de dependencias por constructor, registrada en Awilix. Nada de importar
  repositorios directamente dentro de un handler.

---

## 5. Reglas de negocio

### Validación de filas (Zod)
- Header requerido: `category,amount,unit,date` (ignorar mayúsculas y espacios).
- `category`, `unit`: obligatorios, no vacíos tras `trim`.
- `amount`: número finito **mayor que 0**.
- `date`: formato estricto `YYYY-MM-DD` **y** fecha real (rechazar `2024-02-30`).

### Política de resultado (documentarla en el README)
- Archivo vacío, ilegible o con header inválido → `FAILED` con `errorMessage` claro.
- Filas válidas se guardan; inválidas suman `failedRows`.
- Se guarda un resumen de errores en `errorMessage` (máx. 20, formato `Fila 4: amount debe ser mayor que 0`).
- **Todas** las filas inválidas → `FAILED`. Al menos una válida → `COMPLETED`.
- El archivo (máx. 10 MB) se descarga completo y se parsea en memoria: así `totalRows` se conoce
  **antes** de insertar y la barra de progreso tiene denominador (ADR-003).
- Inserción en lotes de 500 (`createMany`), **una transacción por lote** que incluye la
  actualización de `processedRows`. Con una sola transacción global, nadie vería el progreso
  hasta el commit final (aislamiento READ COMMITTED de PostgreSQL).

### Creación del upload (orden importa)
1. Subir archivo a S3. 2. Crear registro `PENDING` en DB. 3. Publicar mensaje en SQS.
- Si el paso 3 falla, el upload pasa a `FAILED` con `errorMessage` ("No se pudo encolar") y la API
  responde 500. Así no quedan uploads huérfanos en `PENDING` para siempre.

### Worker
- Long polling a SQS (`WaitTimeSeconds: 10`).
- Al recibir `{ uploadId }`: si el upload ya está `COMPLETED` o `FAILED`, ignora y borra el mensaje (idempotencia).
- Si está `PROCESSING` (reintento tras un fallo), `startProcessing()` lo reanuda (`PROCESSING → PROCESSING`).
- Antes de reprocesar, borra las `ActivityData` previas de ese upload.
- Lee el atributo `ApproximateReceiveCount`: si es el **último intento** (= `maxReceiveCount`) y
  falla, marca el upload `FAILED` antes de que el mensaje pase a la DLQ. Si no, el frontend haría
  polling infinito sobre un upload que nadie va a terminar (ADR-003).
- **Solo borra el mensaje cuando terminó.** Si falla por algo transitorio, no lo borra: lo reprograma con
  **exponential backoff** (`ChangeMessageVisibility`: 10 s, 40 s... con tope de 300 s; ADR-007).
- Los errores de negocio (upload inexistente) no se reintentan: se borra el mensaje.
- `maxReceiveCount: 3` → Dead Letter Queue.
- Apagado limpio con `SIGINT` / `SIGTERM`.

---

## 6. API

| Método | Ruta | Respuesta |
|---|---|---|
| POST | `/api/v1/uploads` (multipart, campo `file`, solo `.csv`, máx. 10 MB) | `201 { id, status, fileName, createdAt }` |
| GET | `/api/v1/uploads/:id` | `{ id, status, fileName, totalRows, processedRows, failedRows, errorMessage, createdAt, updatedAt }` |
| GET | `/api/v1/uploads?page=1&limit=10` | `{ data, total, page, limit }` |
| GET | `/api/v1/uploads/:id/results` | `{ data: [{ category, amount, unit, date }] }` |
| GET | `/api/v1/uploads/stats` | `{ total, pending, processing, completed, failed }` |
| GET | `/health` | `{ status: "ok" }` |

Prisma: schema mínimo del enunciado, más `enum UploadStatus`, `@@index([uploadId])` en
`ActivityData`, `@@index([userId, createdAt])` en `Upload` y `onDelete: Cascade`.

---

## 7. Frontend

- `/` — dashboard: 4 tarjetas (total, completados, en proceso, fallidos) + botón "Nuevo upload".
- `/uploads` — tabla paginada (10 por página). Badges: PENDING amarillo, PROCESSING azul,
  COMPLETED verde, FAILED rojo. Link al detalle.
- `/uploads/new` — drag & drop + selector, solo `.csv`, barra de progreso con
  `onUploadProgress` de Axios, redirección al detalle al terminar.
- `/uploads/[id]` — detalle con **`refetchInterval` de 3000 ms mientras el estado sea
  PENDING o PROCESSING** (ADR: el enunciado dice solo PROCESSING, pero un upload recién
  creado está en PENDING y también debe actualizarse). Se detiene en COMPLETED o FAILED.
  Barra de progreso, tabla de resultados, mensaje de error y botón para volver.
- Hooks de React Query en `features/document-processing/api/uploadsApi.ts`.
  Al crear un upload, invalidar las queries de lista y estadísticas.
- URL del backend en `NEXT_PUBLIC_API_URL`.

---

## 8. Fases (reorganizadas en 3 bloques por tiempo)

Cada fase termina con su documento, sus ADR, su entrada en la bitácora, las 3 preguntas
de entrevista y un commit propuesto (los commits los hace Francisco).

| # | Fase | Entregable |
|---|---|---|
| 1 | Backend completo | Docker Compose (Postgres + ElasticMQ), proyecto TS, shared kernel, dominio, Prisma, CQRS, cola, storage, Fastify, worker, tests. Prueba de punta a punta con curl |
| 2 | Frontend | Next.js App Router: dashboard, lista, subida y detalle con polling (React Query + Axios + Tailwind) |
| 3 | Docker y entrega | Dockerfiles, compose completo, README, `USO-DE-IA.md`, diagrama AWS (Mermaid + PNG), revisión final |

### Versiones fijadas (decisión consciente)
Se usan majors estables conocidas en vez de las últimas: Prisma 6, TypeScript 5, Vitest 3,
ESLint 9, Zod 3, Next.js 15, Tailwind 4. Motivo: las majors más nuevas (Prisma 7/8, TS 7, Vitest 5)
cambian configuración y no aportan nada a esta prueba; el riesgo de perder tiempo es alto.

---

## 9. Plantillas de documentación

### `docs/fases/NN-nombre.md`
```markdown
# Fase NN — Nombre

## Qué construimos
## Por qué en este orden
## Conceptos nuevos (explicados en simple)
## Archivos creados y para qué sirve cada uno
## Decisiones tomadas (con enlace al ADR)
## Cómo probarlo
## Preguntas de entrevista y mis respuestas
```

### `docs/decisiones/ADR-NNN-titulo.md`
```markdown
# ADR-NNN: Título
- Estado: aceptada
- Contexto: qué problema teníamos
- Opciones consideradas: A, B, C
- Decisión: cuál elegimos
- Consecuencias: qué ganamos y qué sacrificamos
```

### `docs/bitacora-ia.md` (una entrada por fase; con esto se escribe `USO-DE-IA.md` al final)
```markdown
## Fase NN — Nombre
- Qué generó la IA:
- Qué revisé, corregí o cambié yo:
- Qué aprendí:
- Limitaciones o errores de la IA:
- Tiempo aproximado:
```

---

## 9.1 Notas técnicas verificadas

Puntos que se verificaron en la documentación o en la práctica en vez de asumirse de memoria:

- **LocalStack** exige `LOCALSTACK_AUTH_TOKEN` desde la versión 2026.03 → se usó ElasticMQ (ADR-001).
  Las imágenes Docker se fijan siempre a una versión concreta, nunca `latest`.
- **Prisma** fijado en 6.19 (Prisma 7+ cambia la configuración: `prisma.config.ts` y driver adapters).
  Prisma Client carga el `.env` al importarse; en tests, `.env.test` debe tener prioridad (ADR-007).
- **Tailwind v4** no usa `tailwind.config.ts`: la configuración vive en `globals.css` con `@theme` (ADR-006).
- **Node:** local v25; las imágenes Docker usan Node 22 LTS con npm 11.6.2 fijado (ADR-005).
- **PostgreSQL** expuesto en el puerto 5433 del host para no chocar con una instalación local (ADR-005).
- **Healthchecks en Alpine:** usar `127.0.0.1`, porque `localhost` resuelve primero a IPv6.
- **Diagrama AWS:** fuente Mermaid en `docs/arquitectura-aws.md` y exportado a `docs/arquitectura-aws.png`.

---

## 10. Lo que nunca debes hacer

- Avanzar de fase sin mi "siguiente fase".
- Generar código sin explicarlo antes.
- Hacer el commit por mí.
- Inventar requisitos, agregar autenticación o cambiar el stack sin consultarme.
- Usar `any` o desactivar reglas de lint.
- Poner Prisma, AWS SDK, Fastify o Zod dentro de `domain`.
- Usar `setTimeout` o un array en memoria como "cola".
- Commitear archivos `.env` reales.
