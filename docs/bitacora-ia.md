# Bitácora de uso de IA

> Una entrada por fase: qué generó la IA, qué decidí yo, qué se corrigió y qué aprendí.
> El resumen de esta bitácora está en [USO-DE-IA.md](../USO-DE-IA.md).

## Fase 0 — Preparación y planeación
- **Qué generó la IA:** con Claude analicé el enunciado y redactamos el `CLAUDE.md`
  (stack, reglas de arquitectura, fases y forma de trabajo) y los CSV de prueba.
- **Qué decidí yo:** definir las reglas antes de escribir código y pedir una revisión crítica del plan
  contra el enunciado antes de implementarlo.
- **Revisión del plan (con Claude Code):** se detectaron fallos en el plan original, que también había
  generado la IA: reintento bloqueado por el agregado, uploads colgados tras la DLQ, progreso
  invisible por la transacción global y `totalRows` desconocido con streaming (ADR-003).
  También se documentaron las desviaciones del enunciado (ADR-004).
- **Qué aprendí:** que un array en memoria no sirve como cola cuando el worker corre en
  otro proceso (ADR-001), y que el polling también debe correr en PENDING (ADR-002).
- **Limitaciones de la IA:** el primer plan tenía contradicciones internas que solo aparecieron al
  revisarlo contra los casos de fallo.
- **Tiempo aproximado:** 1 hora.

## Fase 01 — Backend completo
- **Qué generó la IA (Claude Code):** todo el backend: dominio, CQRS, Prisma, mensajería, Fastify,
  worker, 44 tests unitarios y la configuración (tsconfig, ESLint, Vitest, Convict, Docker Compose).
- **Qué decidí yo:** reorganizar el plan de 12 fases en 3 (backend, frontend, entrega) para priorizar
  un sistema funcional de punta a punta, y empezar sin esperar a resolver LocalStack: se adoptó
  ElasticMQ para que el proyecto se pueda levantar sin crear cuentas.
- **Errores o correcciones durante la fase:**
  - LocalStack ahora exige cuenta: se cambió a ElasticMQ + filesystem (ADR-001 revisado).
  - Prisma fallaba con `P1000` porque había un PostgreSQL de Windows en el 5432: se movió el contenedor al 5433 (ADR-005).
  - Al revisar la primera versión del schema de Zod (antes de correr los tests) se vio que reportaría
    dos errores para un mismo campo (`abc` → "no es número" y "debe ser mayor que 0"); se cambió a
    `.pipe()` para validar en cadena, y un test lo verifica.
  - Las majors más nuevas (Prisma 8, TS 7, Vitest 5) se descartaron a propósito (ADR-005).
- **Qué aprendí:** cómo funcionan el long polling, el visibility timeout y la DLQ de SQS; por qué el worker
  solo borra el mensaje al terminar; y cómo el patrón Either obliga a manejar los errores de negocio.
- **Tiempo aproximado:** 1.5 horas.

## Fase 02 — Frontend
- **Qué generó la IA (Claude Code):** el proyecto Next.js 15 (con `create-next-app`), los hooks de
  React Query, los componentes, las 4 páginas y las pruebas en el navegador integrado.
- **Qué decidí yo:** levanté la app y la revisé en el navegador; al verla, noté que el diseño se veía
  genérico y pedí rehacerlo (ver "Rediseño del frontend").
- **Errores o correcciones durante la fase:**
  - `create-next-app` creó un repositorio git dentro de `frontend/`; se borró para tener un solo repositorio.
  - Se quitó `next/font/google` para que el build no dependa de internet (después, en el rediseño, se volvió a usar: ver ADR-006).
  - Al probar, el polling "no funcionaba": el panel del navegador estaba oculto y React Query pausa el
    polling en segundo plano. No era un bug; se verificó simulando la pestaña visible (1 petición cada 3 s).
  - Al apagar el worker en medio de un long polling, el mensaje tardó ~30 s en reaparecer: es el
    visibility timeout de SQS funcionando como se esperaba.
- **Qué aprendí:** `refetchInterval` como función para apagar el polling al terminar, `enabled` para pedir
  los resultados solo cuando existen, e `invalidateQueries` para refrescar la lista tras subir un archivo.
- **Tiempo aproximado:** 40 minutos.

## Rediseño del frontend
- **Por qué:** el primer diseño se veía genérico, "hecho por IA" (tarjetas con sombra, verde esmeralda).
- **Qué decidí yo:** elegí entre 3 direcciones la de **libro contable**, coherente con un producto de
  contabilidad de carbono (ADR-006).
- **Qué generó la IA:** paleta, tipografía, `UploadTable`, `RecentUploads`, `RowErrorsTable`, totales por
  categoría y la reescritura de todas las pantallas.
- **Errores encontrados al verificar:**
  - **Bug serio en `.gitignore`:** la regla `uploads/` (pensada para los CSV del backend) también ignoraba
    `frontend/src/app/uploads/`, es decir, 3 de las 4 páginas. Tailwind respeta `.gitignore` y no generaba sus
    clases, y **git no las habría subido al repositorio**. Se cambió a `/backend/uploads/` y se verificó con `git check-ignore`.
  - En móvil la página se desbordaba: el texto `sr-only` (position absolute) de la tabla escapaba del
    contenedor con scroll. Se arregló con `relative` en el contenedor; se verificaron las 4 páginas a 375 px.
- **Tiempo aproximado:** 20 minutos.

## Fase 03 — Docker y entrega
- **Qué generó la IA (Claude Code):** Dockerfiles multi-stage (API/worker y frontend), `docker-compose.yml`
  con 5 servicios, diagrama AWS (Mermaid exportado a PNG con Edge headless), README y `USO-DE-IA.md`.
- **Qué decidí yo:** pedí una auditoría del proyecto contra el enunciado para saber qué faltaba, y a partir
  de ella decidí implementar los bonus de backoff y tests de integración.
- **Errores o correcciones durante la fase:**
  - `npm ci` fallaba en Docker: el `package-lock.json` del frontend estaba desincronizado (bug de npm con
    dependencias opcionales WASM de Tailwind 4) y además npm 10 de la imagen difería de npm 11 local.
    Se regeneró el lockfile y se fijó `npm@11.6.2` en la etapa de build.
  - El healthcheck de la API salía `unhealthy`: en Alpine `localhost` resuelve a IPv6 (`::1`) y el servidor
    escucha en IPv4. Se cambió a `127.0.0.1`.
  - `prisma` pasó de devDependencies a dependencies porque el contenedor ejecuta `prisma migrate deploy`.
  - El primer render del diagrama mostraba "Unsupported markdown: list": Mermaid interpreta etiquetas como
    "1. PutObject" como listas. Se cambiaron a "Paso 1: ...".
- **Qué aprendí:** builds multi-stage, `output: "standalone"` de Next.js, y por qué `NEXT_PUBLIC_API_URL`
  se fija en el build (la usa el navegador, no el contenedor).
- **Tiempo aproximado:** 45 minutos.

## Bonus: exponential backoff y tests de integración
- **Qué generó la IA (Claude Code):** `computeBackoffSeconds` y su uso en el worker (`ChangeMessageVisibility`),
  la configuración del backoff, 5 tests unitarios nuevos y 15 tests de integración (API, worker, PostgreSQL y cola reales).
- **Errores o correcciones durante la fase:**
  - El primer intento de correr los tests de integración apuntaba a la base de **desarrollo**: Prisma Client carga
    el `.env` al importarse, antes que `.env.test`. La protección "la base debe terminar en `_test`" lo detuvo antes
    de borrar nada. Se corrigió dando prioridad a `.env.test` en modo test (ADR-007).
  - Se usaron colas propias para los tests porque el worker de Docker consumía los mensajes de la cola compartida.
- **Qué aprendí:** que reintentar a intervalo fijo puede saturar una dependencia caída, y que una protección
  defensiva sencilla (verificar el nombre de la base de datos) evita un error grave.
- **Resultado:** 49 tests unitarios y 15 de integración pasando, repetibles, y los datos de desarrollo intactos.
- **Tiempo aproximado:** 15 minutos.
