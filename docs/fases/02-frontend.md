# Fase 02 — Frontend

## Qué construimos
Next.js 15 (App Router) con TanStack Query, Axios y Tailwind v4. Tiene 4 pantallas:

| Ruta | Qué hace |
|---|---|
| `/` | Dashboard: total, completados, en proceso (PENDING + PROCESSING) y fallidos, con botón "Nuevo upload" |
| `/uploads` | Tabla paginada (10 por página, la página va en la URL `?page=2`), badges de color y link al detalle |
| `/uploads/new` | Drag & drop o selector, validación `.csv` y 10 MB, barra de progreso de subida y redirección al detalle |
| `/uploads/[id]` | Info del upload, barra de progreso, polling cada 3 s, tabla de resultados, errores y botón para volver |

## Por qué en este orden
Primero los tipos (espejo de los DTOs del backend), luego la capa de datos (`api-client`,
`query-client`, `uploadsApi`), después los componentes y al final las páginas. Las páginas son
Server Components delgados que solo leen la URL y montan un componente cliente.

## Conceptos nuevos (explicados en simple)
- **Server vs Client Components**: las páginas se renderizan en el servidor; lo interactivo
  (React Query, drag & drop) lleva `"use client"`. Ejemplo: `uploads/[id]/page.tsx` lee el `id`
  en el servidor y lo pasa a `<UploadDetail>`, que es cliente.
- **`params` / `searchParams` como Promise**: en Next.js 15 hay que hacer `await params`.
- **`queryKey`**: es la "dirección" de un dato en la caché. Usamos claves jerárquicas
  (`["uploads", "detail", id]`), así `invalidateQueries({ queryKey: ["uploads"] })` refresca todo después de subir.
- **`refetchInterval` como función**: devuelve `3000` mientras el estado sea PENDING o PROCESSING
  y `false` en COMPLETED o FAILED, así el polling se apaga solo (ADR-002).
- **`enabled`**: los resultados solo se piden cuando el upload está COMPLETED.
- **`keepPreviousData`**: al cambiar de página se sigue viendo la anterior (atenuada) hasta que llega la nueva.
- **`onUploadProgress` de Axios**: da el porcentaje de bytes enviados para la barra de subida.

## Archivos creados y para qué sirve cada uno
| Ruta (`frontend/src/`) | Para qué |
|---|---|
| `app/layout.tsx`, `app/providers.tsx` | Layout raíz y `QueryClientProvider` |
| `app/page.tsx`, `app/uploads/**/page.tsx` | Las 4 rutas |
| `features/document-processing/types/upload.types.ts` | Tipos de la API y `isFinalStatus` |
| `features/document-processing/api/uploadsApi.ts` | Llamadas HTTP y hooks de React Query (polling incluido) |
| `features/document-processing/components/*` | `UploadForm`, `UploadList`, `UploadDetail`, `ProcessingStatus`, `ResultsTable`, `StatusBadge`, `StatsCards` |
| `shared/lib/api-client.ts` | Axios con `NEXT_PUBLIC_API_URL` y `getErrorMessage` |
| `shared/lib/query-client.ts` | Configuración de React Query (no reintenta errores 4xx) |
| `shared/lib/format.ts` | Formato de fechas y números en `es-CO` |
| `shared/components/*` | `Layout` (navegación), `LoadingSpinner`, `ErrorMessage` |
| `styles/globals.css` | Tailwind v4 (`@import "tailwindcss"` y `@theme`) |

## Rediseño visual (después de la fase)
El primer diseño se veía "de plantilla". Se rehízo con una estética de libro contable
([ADR-006](../decisiones/ADR-006-frontend-decisiones.md)) y se agregaron piezas con sentido para el dominio:
últimos registros en el resumen, **totales por categoría y unidad** en el detalle, errores como tabla
"Fila / Motivo" y una guía del formato CSV junto al formulario. Componentes nuevos: `UploadTable`
(compartida por lista y resumen), `RecentUploads`, `RowErrorsTable`, `PageHeader` y `Button`.

## Decisiones tomadas
- [ADR-002](../decisiones/ADR-002-polling-en-pending-y-processing.md): polling en PENDING y PROCESSING.
- [ADR-006](../decisiones/ADR-006-frontend-decisiones.md): página en la URL, sin `tailwind.config.ts`,
  fuentes del sistema y polling pausado en segundo plano.
- La lista y el dashboard también hacen polling, pero solo si hay uploads sin terminar.
- La fecha de cada fila (`2024-01-15`) se muestra como texto: convertirla a `Date` en el navegador
  la correría un día en zonas horarias negativas (Colombia es UTC-5).

## Cómo probarlo (PowerShell)
```powershell
docker compose up -d
cd backend; npm run dev          # terminal 1
cd backend; npm run worker       # terminal 2
cd frontend; copy .env.example .env.local; npm install; npm run dev   # terminal 3
# Abrir http://localhost:3000
```

### Resultados verificados (en navegador)
- `typecheck`, `lint` y `next build` sin errores.
- Drag & drop de un CSV → barra de subida → redirección al detalle → resultados y filas con error.
- Con el worker apagado, el detalle queda en "Pendiente" y hace 1 petición cada 3 s.
  Al encender el worker pasa solo a "Completado" (60 filas) y **el polling se detiene** (0 peticiones en 9 s).
- Paginación con 12 uploads: página 1 con 10 filas y página 2 con 2 filas; la URL cambia a `?page=2`.
- Un `.txt` muestra "Solo se aceptan archivos .csv" y deja el botón deshabilitado.
- Hallazgo: con la pestaña oculta, React Query **pausa** el polling (`refetchIntervalInBackground: false`)
  y al volver a la pestaña refresca de inmediato. Es el comportamiento que queremos.

## Preguntas de repaso para la entrevista
1. ¿Cómo sabe React Query cuándo dejar de hacer polling en el detalle, y qué pasa si el usuario cambia de pestaña?
2. Después de subir un archivo, ¿por qué la lista y el dashboard muestran el nuevo upload sin recargar la página?
3. ¿Por qué `page.tsx` es un Server Component y `UploadDetail` es un Client Component? ¿Qué pasaría si usaras `useQuery` en el page?

