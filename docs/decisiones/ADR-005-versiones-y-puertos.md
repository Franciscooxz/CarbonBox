# ADR-005: Versiones fijadas y puerto de PostgreSQL

- **Estado:** aceptada

## Contexto
1. En octubre de 2026 las últimas versiones son Prisma 8 (RC), TypeScript 7, Vitest 5, ESLint 10
   y Zod 4. Varias cambian la configuración respecto a la documentación y los tutoriales más comunes.
2. En la máquina de desarrollo ya hay un PostgreSQL de Windows escuchando en el puerto 5432.
   Prisma se conectaba a ese y fallaba con `P1000: Authentication failed`.

## Opciones consideradas
- Versiones: **A.** últimas versiones · **B.** la última major estable y conocida de cada una.
- Puerto: **A.** detener el PostgreSQL local · **B.** exponer el contenedor en otro puerto.

## Decisión
- Versiones **B**, fijadas con `--save-exact`: Prisma 6.19, TypeScript 5.9, Vitest 3.2,
  ESLint 9, Zod 3.25, Fastify 5, Awilix 12, AWS SDK v3.
- Puerto **B**: el contenedor se expone en **5433** (`5433:5432`). Dentro de Docker sigue siendo 5432.

## Consecuencias
- Ganamos: builds reproducibles, sin sorpresas de configuración y sin tocar software de la máquina.
- Sacrificamos: no usamos las novedades de las majors nuevas (no aportan nada a esta prueba).
  Quien clone el repo debe usar `localhost:5433` (ya está en `.env.example`).
