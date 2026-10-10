# Fase 03 — Docker y entrega

## Qué construimos
- `backend/Dockerfile`: una sola imagen para la **API** y el **worker** (cambia solo el comando), multi-stage,
  usuario sin privilegios y `prisma migrate deploy` al arrancar la API.
- `frontend/Dockerfile`: Next.js en modo `standalone` (servidor mínimo, sin `node_modules` completo).
- `docker-compose.yml` con 5 servicios: `postgres`, `sqs`, `api`, `worker` y `frontend`, con healthchecks y orden de arranque.
- Diagrama AWS: [docs/arquitectura-aws.md](../arquitectura-aws.md) (Mermaid) y [docs/arquitectura-aws.png](../arquitectura-aws.png).
- [README.md](../../README.md) y [USO-DE-IA.md](../../USO-DE-IA.md).

## Por qué en este orden
Primero Docker, porque es lo único que podía fallar de forma técnica (y falló tres veces, ver abajo).
La documentación va al final porque describe lo que ya está probado.

## Conceptos nuevos (explicados en simple)
- **Build multi-stage:** una etapa compila (con TypeScript, ESLint, etc.) y otra solo copia el resultado.
  La imagen final no lleva herramientas de desarrollo.
- **Una imagen, dos servicios:** API y worker usan la misma imagen con distinto `command`, igual que en
  ECS dos servicios pueden usar la misma imagen de ECR.
- **`depends_on` con `condition: service_healthy`:** el worker espera a que la API responda `/health`,
  y eso garantiza que las migraciones ya se aplicaron.
- **`NEXT_PUBLIC_*` en build time:** Next.js incrusta la variable en el JavaScript que corre en el navegador.
  Por eso es `localhost:3001` (lo que ve tu navegador) y no `api:3001` (lo que ve Docker).
- **Volumen compartido `uploads_data`:** la API escribe el CSV y el worker lo lee. En AWS esto lo reemplaza S3.

## Archivos creados y para qué sirve cada uno
| Archivo | Para qué |
|---|---|
| `backend/Dockerfile`, `backend/.dockerignore` | Imagen de API y worker |
| `frontend/Dockerfile`, `frontend/.dockerignore` | Imagen del frontend |
| `frontend/next.config.ts` | `output: "standalone"` |
| `docker-compose.yml` | Sistema completo con healthchecks |
| `docs/arquitectura-aws.md` / `.png` | Diagrama AWS y tabla de componentes |
| `README.md` | Instalación, arquitectura, decisiones, cómo probar y limitaciones |
| `USO-DE-IA.md` | Cómo se usó la IA, qué se corrigió y qué se aprendió |

## Decisiones tomadas
- `prisma` pasó a `dependencies`: el contenedor de la API necesita la CLI para `migrate deploy`.
- Se fijó `npm@11.6.2` en las etapas de build: el `package-lock.json` se genera con npm 11 y
  `node:22-alpine` trae npm 10, que interpreta distinto las dependencias opcionales.
- Healthcheck con `127.0.0.1` y no `localhost`: en Alpine `localhost` resuelve primero a IPv6.

## Cómo probarlo (PowerShell)
```powershell
docker compose up -d --build
docker compose ps                  # api (healthy), worker, frontend, postgres (healthy), sqs
curl.exe -F "file=@sample-data.csv" http://localhost:3001/api/v1/uploads
docker compose logs worker         # logs JSON: "Upload procesado"
# Abrir http://localhost:3000
```

### Resultados verificados
- Los 5 contenedores arriba; la API `healthy`.
- Upload de `sample-data.csv` contra la API del contenedor → el worker del contenedor lo deja `COMPLETED` (60/60).
- El frontend del contenedor lista los uploads desde la API del contenedor (CORS y URL correctos).
- Logs del worker en JSON estructurado (pino en modo producción).

## Preguntas de entrevista y mis respuestas
1. ¿Por qué la API y el worker usan la misma imagen Docker? ¿Cómo se traduce eso a ECS?
2. En AWS, ¿qué métrica usarías para escalar el worker y por qué no la CPU?
3. ¿Qué pasa con un mensaje que falla 3 veces? ¿Cómo te enterarías en producción?

_(Respuestas pendientes)_
