# AI Service

Este servicio contiene la lógica de procesamiento para tareas de
inteligencia artificial (IA) en el proyecto Journal Manager.

## Ejecutar localmente

```bash
uvicorn app.main:app --reload

```

## Con Docker

```bash
docker build -t ai-service .
docker run -p 8000:8000 ai-service
```
