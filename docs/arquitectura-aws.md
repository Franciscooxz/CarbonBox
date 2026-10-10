# Arquitectura en AWS (propuesta de despliegue)

Imagen exportada: [`arquitectura-aws.png`](arquitectura-aws.png). Fuente Mermaid:

```mermaid
flowchart LR
    user(["Usuario<br/>navegador"])

    subgraph vpc["VPC 10.0.0.0/16 · Multi-AZ (a, b)"]
        direction LR
        subgraph pub["Subnets públicas"]
            direction TB
            alb["Application Load Balancer<br/>HTTPS 443 · certificado ACM<br/>/api/* → API · /* → Frontend"]
            nat["NAT Gateway<br/>(salida a internet)"]
        end
        subgraph app["Subnets privadas · ECS Fargate"]
            direction TB
            fe["Frontend Service<br/>Next.js · 2 tasks"]
            api["API Service<br/>Fastify · 2+ tasks<br/>auto-scaling por CPU"]
            worker["Worker Service<br/>1..N tasks<br/>auto-scaling por tamaño de cola"]
        end
        subgraph data["Subnets privadas · datos"]
            rds[("RDS PostgreSQL 15<br/>Multi-AZ<br/>primaria + standby")]
        end
    end

    subgraph managed["Servicios administrados (acceso privado vía VPC Endpoints)"]
        direction TB
        s3[("S3 · bucket privado<br/>cifrado SSE · lifecycle<br/>90 días → Glacier")]
        sqs["SQS · file-processing<br/>visibility timeout 30 s"]
        dlq["SQS · DLQ<br/>maxReceiveCount = 3"]
        sm["Secrets Manager<br/>credenciales de RDS"]
        cw["CloudWatch<br/>logs JSON · métricas · alarmas"]
    end

    user -->|HTTPS| alb
    alb --> fe
    alb --> api
    api -->|"Paso 1: PutObject CSV"| s3
    api -->|"Paso 2: INSERT Upload PENDING"| rds
    api -->|"Paso 3: SendMessage uploadId"| sqs
    sqs -->|"Paso 4: ReceiveMessage long polling"| worker
    worker -->|"Paso 5: GetObject"| s3
    worker -->|"Paso 6: filas por lotes + estado final"| rds
    worker -.->|"Paso 7: DeleteMessage"| sqs
    sqs -.->|"3 entregas fallidas"| dlq
    sm -.-> app
    app -.->|"logs"| cw
    sqs -.->|"mensajes visibles → escala el worker"| cw
    dlq -.->|"alarma si hay mensajes"| cw
```

## Cómo se conectan los componentes

| Componente | Rol | Seguridad / disponibilidad |
|---|---|---|
| **ALB** (subnets públicas) | Único punto de entrada; termina HTTPS y enruta `/api/*` a la API y el resto al frontend | Security group: 443 desde internet |
| **ECS Fargate – API** | Recibe el CSV, lo sube a S3, crea el `Upload` y publica en SQS | 2+ tasks en 2 AZ; SG: solo acepta tráfico del ALB |
| **ECS Fargate – Worker** | Consume SQS, procesa y guarda en RDS | Escala con *target tracking* sobre `ApproximateNumberOfMessagesVisible`; sin puertos de entrada |
| **ECS Fargate – Frontend** | Sirve Next.js | 2 tasks; SG: solo desde el ALB |
| **RDS PostgreSQL** | Uploads y ActivityData | Multi-AZ con failover automático; SG: 5432 solo desde los SG de API y worker; backups automáticos |
| **S3** | Archivos CSV originales | Bloqueo de acceso público, cifrado SSE-S3, *lifecycle* (90 días → Glacier, 365 → borrar) |
| **SQS + DLQ** | Desacopla API y worker; reintentos nativos | Redrive a la DLQ tras 3 intentos; alarma en CloudWatch si la DLQ tiene mensajes |
| **Secrets Manager** | `DATABASE_URL` / credenciales de RDS | Se inyecta como *secret* en la task definition; rotación automática |
| **CloudWatch** | Logs (pino en JSON), métricas y alarmas | Log groups por servicio; alarmas de DLQ, 5xx del ALB y CPU de RDS |
| **ECR** | Registro de las imágenes Docker de los 3 servicios | Escaneo de vulnerabilidades al subir |
| **VPC Endpoints / NAT** | Acceso privado a servicios AWS; NAT solo para salida a internet | El tráfico a S3/SQS no sale a internet |
| **IAM (task roles)** | Mínimo privilegio | API: `s3:PutObject`, `sqs:SendMessage`. Worker: `s3:GetObject`, `sqs:ReceiveMessage/DeleteMessage` |

## Qué cambia en el código para desplegar aquí
- `IFileStorage`: una clase `S3FileStorage` (`PutObject` / `GetObject`) en lugar de `LocalFileStorage`.
  Se registra en Awilix; dominio y aplicación no cambian.
- `SQS_ENDPOINT` vacío (usa AWS real) y `SQS_QUEUE_URL` con la URL de la cola real.
- Credenciales: el SDK toma el *task role* de ECS automáticamente (sin access keys).
- `prisma migrate deploy` como *task* de ECS separada antes del despliegue, en vez de al arrancar la API.
