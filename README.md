# Journal Manager

## Descripción

Backend de Journal Manager

---

## Requisitos

- **Node.js** (v16 o superior).
- **Docker** y **Docker Compose**.
- **pnpm** para gestionar dependencias.

---

## Instalación

1. Clona este repositorio:

   ```bash
   git clone https://github.com/Journal-Manager/journal-manager.git
   ```

2. Moverse al backend

```bash
cd backend
```

3. Instala las dependencias:

```bash
pnpm install
```

4. Configura las variables de entorno en un archivo `.env` basado en el archivo `.env.example`.

---

## Configuración de servicios

### Configuración de Redis y PostgreSQL

1. Asegúrate de que Docker y Docker Compose están instalados.

2. Ejecuta los servicios incluidos en el archivo `docker-compose.yml`:

   ```bash
   docker-compose up -d redis postgres
   ```

3. Verifica que Redis está funcionando:

   ```bash
   docker exec -it <redis-container-id> redis-cli ping
   ```

   Debe responder con `PONG`.

4. Verifica que PostgreSQL está funcionando:

   ```bash
   docker exec -it <postgres-container-id> psql -U <your-username> -d <your-database>
   ```

   Asegúrate de que puedes acceder a la base de datos correctamente.

---

## Uso

### Desarrollo

1. Inicia el servidor backend:

   ```bash
   pnpm start:dev
   ```

2. Accede al servidor en `http://localhost:3000`.

### Producción

1. Construye la imagen de Docker:

   ```bash
   docker-compose build
   ```

2. Inicia el contenedor:

   ```bash
   docker-compose up
   ```

---

## Pruebas

Ejecuta las pruebas utilizando:

```bash
pnpm test
```

---
