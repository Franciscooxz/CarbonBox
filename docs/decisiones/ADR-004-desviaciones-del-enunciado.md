# ADR-004: Desviaciones menores respecto al schema y la API del enunciado

- **Estado:** aceptada

## Contexto
El enunciado da un schema Prisma "mínimo" con `status String` y no define cómo obtener los
contadores del dashboard.

## Opciones consideradas
- Estado: **A.** `String` como en el enunciado · **B.** `enum UploadStatus` en Prisma.
- Dashboard: **A.** calcular contadores en el frontend desde la lista (solo ve una página de 10) ·
  **B.** endpoint `GET /api/v1/uploads/stats` con `COUNT ... GROUP BY status`.

## Decisión
Estado **B**: la base de datos rechaza valores inválidos, no solo el dominio.
Dashboard **B**: los contadores son correctos aunque haya miles de uploads.
También se agregan índices (`ActivityData.uploadId`, `Upload(userId, createdAt)`) y `onDelete: Cascade`.

## Consecuencias
- Ganamos: integridad en DB y un dashboard correcto y barato.
- Sacrificamos: un endpoint y una query más que no estaban en el enunciado.
