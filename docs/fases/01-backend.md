# Fase 01 — Backend completo

## Qué construimos
La API (Fastify) y el worker (proceso separado), funcionando de punta a punta:

```
POST /uploads → guarda archivo → crea Upload PENDING → publica { uploadId } en la cola → 201
Worker: recibe mensaje → PROCESSING → lee archivo → valida filas → inserta en lotes → COMPLETED | FAILED → borra mensaje
```

Endpoints: `POST /api/v1/uploads`, `GET /api/v1/uploads`, `GET /api/v1/uploads/stats`,
`GET /api/v1/uploads/:id`, `GET /api/v1/uploads/:id/results` y `GET /health`.

## Por qué en este orden
Dominio primero (no depende de nada), luego aplicación (depende del dominio), luego infraestructura
(implementa las interfaces) y por último HTTP y worker (solo conectan piezas). Cada capa se pudo
probar antes de que existiera la siguiente, gracias a los fakes en memoria (`test/fakes.ts`).

## Conceptos nuevos (explicados en simple)
- **Aggregate Root (`Upload`)**: la única puerta para cambiar un upload. Si alguien intenta
  `COMPLETED → PROCESSING`, el método retorna `Left` y el cambio no ocurre.
- **Either**: el handler retorna `Left(error)` o `Right(resultado)`. Ejemplo: `FileName.create('a.txt')`
  retorna `Left(ValidationError('Solo se aceptan archivos .csv'))` en vez de lanzar.
- **CQRS**: los commands escriben (`CreateUpload`, `ProcessFile`, `FailUpload`); las queries solo leen
  (`GetUploadById`, `ListUploads`, `GetUploadResults`, `GetUploadStats`).
- **Puertos y adaptadores**: la aplicación define `IFileStorage` e `IMessagePublisher`; la infraestructura
  los implementa (`LocalFileStorage`, `SqsMessagePublisher`). Awilix decide cuál se inyecta.
- **Long polling**: el worker pide mensajes y SQS mantiene la petición abierta hasta 10 s esperando.
- **Visibility timeout**: un mensaje recibido se oculta 30 s. Si el worker no lo borra (falló), reaparece.
- **Dead Letter Queue**: después de 3 entregas fallidas, el mensaje se mueve a `file-processing-dlq`.

## Archivos creados y para qué sirve cada uno
| Ruta | Para qué |
|---|---|
| `docker-compose.yml` | PostgreSQL 15 (puerto 5433) y ElasticMQ (API de SQS, puerto 9324) |
| `infra/elasticmq/elasticmq.conf` | Crea la cola, la DLQ, `maxReceiveCount = 3` y el visibility timeout |
| `backend/src/config/` | Convict: valida las variables de entorno al arrancar |
| `backend/src/shared/domain/` | `Either`, `DomainError`, `ValueObject`, `Entity`, `AggregateRoot` |
| `backend/src/shared/application/` | Interfaces `ICommandHandler`, `IQueryHandler`, `IMessagePublisher`, `IMessageConsumer` |
| `backend/src/shared/infrastructure/http/` | `BaseController`, `IHttpRequest/Response`, error handler central |
| `.../domain/` | `Upload`, `ActivityData`, `UploadStatus`, `FileName`, interfaces de repositorio |
| `.../application/commands`, `queries` | Commands, queries y sus handlers |
| `.../application/services/CsvParserService.ts` | Parseo con `csv-parse` y validación por fila con Zod |
| `.../infrastructure/persistence/` | Schema Prisma, mappers y repositorios |
| `.../infrastructure/messaging/` | Publicador y consumidor SQS (`@aws-sdk/client-sqs`) |
| `.../infrastructure/storage/LocalFileStorage.ts` | Guarda los CSV en `backend/uploads/` |
| `.../infrastructure/dependency-injection/` | Contenedor Awilix |
| `.../presentation/` | Controllers (sin Fastify) y rutas (adaptador Fastify) |
| `backend/src/workers/FileProcessingWorker.ts` | Bucle del worker, reintentos y marcado FAILED en el último intento |
| `backend/test/fakes.ts` | Repositorios, storage y cola en memoria para los tests |

## Decisiones tomadas
- [ADR-001 (revisado)](../decisiones/ADR-001-cola-sqs-localstack.md): ElasticMQ + filesystem, porque LocalStack ahora exige cuenta.
- [ADR-003](../decisiones/ADR-003-reintentos-progreso-y-dlq.md): reintentos, progreso por lote y DLQ.
- [ADR-004](../decisiones/ADR-004-desviaciones-del-enunciado.md): `enum` de estado y endpoint `/stats`.
- [ADR-005](../decisiones/ADR-005-versiones-y-puertos.md): versiones fijadas y puerto 5433.
- Los controllers no conocen Fastify: reciben un `IHttpRequest`. Así se prueban sin servidor y
  la regla "cero lógica en controllers" es fácil de verificar.
- ESLint impide importar Prisma, Fastify, AWS SDK, Zod o capas externas desde `domain`.

## Cómo probarlo (PowerShell)
```powershell
docker compose up -d
cd backend
copy .env.example .env
npm install
npx prisma migrate dev
npm run dev          # terminal 1: API en http://localhost:3001
npm run worker       # terminal 2: worker
curl.exe -F "file=@../sample-data.csv" http://localhost:3001/api/v1/uploads
curl.exe http://localhost:3001/api/v1/uploads/<id>
curl.exe http://localhost:3001/api/v1/uploads/<id>/results
```

### Resultados verificados
- `typecheck`, `lint`: sin errores. `test`: **44 tests en 7 archivos, todos pasan**.
- `sample-data.csv` → `COMPLETED`, 60/60 filas.
- `sample-data-con-errores.csv` → `COMPLETED`, 2 válidas, 7 fallidas, con el detalle de cada fila.
- `sample-data-header-invalido.csv` → `FAILED` con "Header inválido...".
- Cola detenida (`docker compose stop sqs`) → `POST` responde **503** y el upload queda `FAILED`.
  Al volver la cola, el worker se recupera solo.
- 404 en id inexistente, 400 en `page=0` o archivo `.txt`, 406 si no es multipart.

## Preguntas de entrevista y mis respuestas
1. ¿Por qué el worker no borra el mensaje cuando falla, y qué evita que se reintente para siempre?
2. ¿Por qué `saveBatchWithProgress` usa una transacción por lote y no una sola para todo el archivo?
3. Si mañana hay que usar S3 real en vez del filesystem, ¿qué archivos cambias y cuáles no tocas?

_(Respuestas pendientes)_
