# ADR-001: Usar SQS y S3 en LocalStack en lugar de una cola en memoria

- **Estado:** aceptada

## Contexto
El enunciado sugiere una cola "mock" con un array en memoria y un worker que hace polling.
Pero el worker se ejecuta como un **proceso separado** (`npm run worker`). Cada proceso de
Node.js tiene su propia memoria: lo que la API guarda en su array no existe para el worker.
El mensaje nunca llegaría y el sistema no funcionaría de punta a punta.

## Opciones consideradas
- **A. Array en memoria:** sencillo, pero no funciona entre procesos.
- **B. Worker dentro del mismo proceso de la API:** funciona, pero mezcla responsabilidades
  y no escala por separado (en AWS la API y el worker son servicios distintos en ECS).
- **C. Cola en una tabla de PostgreSQL** (`SELECT ... FOR UPDATE SKIP LOCKED`): funciona
  entre procesos y no necesita AWS.
- **D. SQS y S3 reales en LocalStack:** el mismo código que correría en AWS.

## Decisión
**Opción D.** La opción C queda como plan B si LocalStack da problemas. Ambas se implementan
detrás de las interfaces `IMessagePublisher` / `IMessageConsumer`, así que cambiar entre
ellas no toca el dominio ni la capa de aplicación.

## Consecuencias
- Ganamos: código igual al de producción, Dead Letter Queue y reintentos nativos de SQS,
  y aprendizaje real de AWS.
- Sacrificamos: un contenedor más (LocalStack) y algo más de configuración inicial.

## Revisión (fase 1): LocalStack exige cuenta → ElasticMQ + filesystem
- **Hallazgo:** desde LocalStack 2026.03.0 la imagen exige `LOCALSTACK_AUTH_TOKEN` (cuenta).
  Un evaluador que clone el repo no podría levantar el sistema sin registrarse.
- **Nueva decisión:**
  - **Cola:** ElasticMQ (`softwaremill/elasticmq-native:1.7.1`), que implementa la API de SQS.
    Se usa el **mismo** `@aws-sdk/client-sqs`; solo cambia el `endpoint`. Soporta DLQ con
    `RedrivePolicy` y `maxReceiveCount`.
  - **Almacenamiento:** filesystem local (`LocalFileStorage`) detrás de `IFileStorage`, como permite
    el enunciado. En AWS se reemplaza por una implementación S3 sin tocar dominio ni aplicación.
- **Consecuencia:** `docker compose up` funciona sin cuentas. Volver a LocalStack/AWS real es
  configuración (`SQS_ENDPOINT`) más una clase `S3FileStorage`.
