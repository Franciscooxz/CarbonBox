# Bitácora de uso de IA

> Una entrada por fase. Al final, con esto se escribe `USO-DE-IA.md`.
> Ser honesto: qué hizo la IA, qué hice yo, qué aprendí y dónde se equivocó la IA.

## Fase 0 — Preparación y planeación
- **Qué generó la IA:** con Claude analicé el enunciado y redactamos el `CLAUDE.md`
  (stack, reglas de arquitectura, fases y forma de trabajo) y los CSV de prueba.
- **Qué revisé o decidí yo:**
- **Qué aprendí:** que un array en memoria no sirve como cola cuando el worker corre en
  otro proceso (ADR-001), y que el polling también debe correr en PENDING (ADR-002).
- **Revisión del plan (con Claude Code):** se detectaron fallos en el plan original que la IA
  había generado: reintento bloqueado por el agregado, uploads colgados tras la DLQ, progreso
  invisible por la transacción global y `totalRows` desconocido con streaming (ADR-003).
  También se documentaron las desviaciones del enunciado (ADR-004).
- **Limitaciones o errores de la IA:** el primer plan tenía esas contradicciones internas;
  solo aparecieron al revisarlo contra los casos de fallo.
- **Tiempo aproximado:**

## Fase 01 — Backend completo
- **Qué generó la IA (Claude Code):** todo el backend: dominio, CQRS, Prisma, mensajería, Fastify,
  worker, 44 tests unitarios y la configuración (tsconfig, ESLint, Vitest, Convict, Docker Compose).
- **Qué revisé, corregí o cambié yo:** _(completar: qué leíste, qué preguntaste, qué cambiarías)_
- **Errores o correcciones durante la fase:**
  - LocalStack ahora exige cuenta: se cambió a ElasticMQ + filesystem (ADR-001 revisado).
  - Prisma fallaba con `P1000` porque había un PostgreSQL de Windows en el 5432: se movió el contenedor al 5433 (ADR-005).
  - Al revisar la primera versión del schema de Zod (antes de correr los tests) se vio que reportaría
    dos errores para un mismo campo (`abc` → "no es número" y "debe ser mayor que 0"); se cambió a
    `.pipe()` para validar en cadena, y un test lo verifica.
  - Las majors más nuevas (Prisma 8, TS 7, Vitest 5) se descartaron a propósito (ADR-005).
- **Qué aprendí:** _(completar)_
- **Tiempo aproximado:** _(completar)_

## Fase 02 — Frontend
- **Qué generó la IA (Claude Code):** el proyecto Next.js 15 (con `create-next-app`), los hooks de
  React Query, los 7 componentes, las 4 páginas y las pruebas en el navegador integrado.
- **Qué revisé, corregí o cambié yo:** _(completar)_
- **Errores o correcciones durante la fase:**
  - `create-next-app` creó un repositorio git dentro de `frontend/`; se borró para tener un solo repositorio.
  - Se quitó `next/font/google` para que el build no dependa de internet (después, en el rediseño, se volvió a usar: ver ADR-006).
  - Al probar, el polling "no funcionaba": el panel del navegador estaba oculto y React Query pausa el
    polling en segundo plano. No era un bug; se verificó simulando la pestaña visible (1 petición cada 3 s).
  - Al apagar el worker en medio de un long polling, el mensaje tardó ~30 s en reaparecer: es el
    visibility timeout de SQS funcionando como se esperaba.
- **Qué aprendí:** _(completar)_
- **Tiempo aproximado:** _(completar)_

## Fase 03 — Docker y entrega
- **Qué generó la IA (Claude Code):** Dockerfiles multi-stage (API/worker y frontend), `docker-compose.yml`
  con 5 servicios, diagrama AWS (Mermaid exportado a PNG con Edge headless), README y `USO-DE-IA.md`.
- **Qué revisé, corregí o cambié yo:** _(completar)_
- **Errores o correcciones durante la fase:**
  - `npm ci` fallaba en Docker: el `package-lock.json` del frontend estaba desincronizado (bug de npm con
    dependencias opcionales WASM de Tailwind 4) y además npm 10 de la imagen difería de npm 11 local.
    Se regeneró el lockfile y se fijó `npm@11.6.2` en la etapa de build.
  - El healthcheck de la API salía `unhealthy`: en Alpine `localhost` resuelve a IPv6 (`::1`) y el servidor
    escucha en IPv4. Se cambió a `127.0.0.1`.
  - `prisma` pasó de devDependencies a dependencies porque el contenedor ejecuta `prisma migrate deploy`.
  - El primer render del diagrama mostraba "Unsupported markdown: list": Mermaid interpreta etiquetas como
    "1. PutObject" como listas. Se cambiaron a "Paso 1: ...".
- **Qué aprendí:** _(completar)_
- **Tiempo aproximado:** _(completar)_

## Rediseño del frontend
- **Por qué:** el primer diseño se veía genérico, "hecho por IA" (tarjetas con sombra, verde esmeralda).
  Elegí entre 3 direcciones la de **libro contable** (ADR-006).
- **Qué generó la IA:** paleta, tipografía, `UploadTable`, `RecentUploads`, `RowErrorsTable`, totales por
  categoría y la reescritura de todas las pantallas.
- **Errores encontrados al verificar:**
  - **Bug serio en `.gitignore`:** la regla `uploads/` (pensada para los CSV del backend) también ignoraba
    `frontend/src/app/uploads/`, es decir, 3 de las 4 páginas. Tailwind respeta `.gitignore` y no generaba sus
    clases, y **git no las habría subido al repositorio**. Se cambió a `/backend/uploads/` y se verificó con `git check-ignore`.
  - En móvil la página se desbordaba: el texto `sr-only` (position absolute) de la tabla escapaba del
    contenedor con scroll. Se arregló con `relative` en el contenedor; se verificaron las 4 páginas a 375 px.
- **Qué revisé o decidí yo:** _(completar)_

## Bonus: exponential backoff y tests de integración
- **Qué generó la IA (Claude Code):** `computeBackoffSeconds` y su uso en el worker (`ChangeMessageVisibility`),
  la configuración del backoff, 5 tests unitarios nuevos y 15 tests de integración (API, worker, PostgreSQL y cola reales).
- **Errores o correcciones durante la fase:**
  - El primer intento de correr los tests de integración apuntaba a la base de **desarrollo**: Prisma Client carga
    el `.env` al importarse, antes que `.env.test`. La protección "la base debe terminar en `_test`" lo detuvo antes
    de borrar nada. Se corrigió dando prioridad a `.env.test` en modo test (ADR-007).
  - Se usaron colas propias para los tests porque el worker de Docker consumía los mensajes de la cola compartida.
- **Resultado:** 49 tests unitarios y 15 de integración pasando, repetibles, y los datos de desarrollo intactos.
