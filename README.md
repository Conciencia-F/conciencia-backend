# Conciencia Backend

Proyecto Conciencia, construido con NestJS, Prisma, PostgreSQL y Redis, y orquestado con Docker.

## Configuración

Utiliza un único archivo de configuración de entorno (`.env`) esta en la carpeta `backend/`. Se detallan las dos formas de ejecución para el desarrollo local.

### Prerrequisitos

Asegúrate de tener instalado el siguiente software:

- Git
- Docker
- Node.js (v20 o superior)
- pnpm (puedes instalarlo con `npm install -g pnpm`)

---

## Entorno Completamente Dockerizado

Este método es el más simple y rápido. Orquesta todos los servicios (backend, postgres, redis) dentro de contenedores Docker.

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd conciencia-backend
```

### 2. Configurar las Variables de Entorno

El archivo de configuración vive dentro de la carpeta `backend`.

```bash
# 1. Navega a la carpeta del backend
cd backend

# 2. Crea tu archivo .env a partir del ejemplo
cp .env.example .env
```

Abre el archivo `backend/.env` y rellena las variables, especialmente `JWT_SECRET`. No necesitas cambiar `DATABASE_URL` ni `REDIS_HOST`, ya que Docker los resolverá automáticamente.

### 3. Levantar el Entorno

Vuelve a la carpeta raíz del proyecto para ejecutar este comando.

```bash
# Desde la raíz (conciencia-backend/)
docker-compose up --build
```

### 4. Preparar la Base de Datos

Una vez que los contenedores estén corriendo, abre una nueva terminal y ejecuta los siguientes comandos para preparar la base de datos.

```bash
# 1. Aplicar las migraciones para crear las tablas
docker-compose exec backend pnpm prisma migrate dev

# 2. Poblar la base de datos con los datos iniciales (roles)
docker-compose exec backend pnpm prisma db seed+
```

La API estará disponible en [http://localhost:3000](http://localhost:3000).

---

## Entorno Híbrido (Backend Local + BD en Docker)

Este método es para los desarrolladores de backend que necesitan depurar el código de NestJS directamente en su máquina.

### 1. Levantar los Servicios de Docker

Desde la raíz del proyecto, levanta únicamente los contenedores de la base de datos y Redis.

```bash
# Desde la raíz (conciencia-backend/)
docker-compose up postgres redis
```

Deja esta terminal corriendo.

### 2. Configurar el Backend Local

En una nueva terminal, navega a la carpeta del backend y configura el entorno.

```bash
# 1. Navega a la carpeta del backend
cd backend

# 2. Instala las dependencias
pnpm install

# 3. Crea tu archivo .env a partir del ejemplo
cp .env.example .env
```

**Modificar el .env para Desarrollo Local**

Abre el archivo `backend/.env`. Como tu backend corre en tu máquina, necesita conectarse a los servicios de Docker a través de localhost. Debes cambiar las siguientes líneas:

```env
# backend/.env

# Cambia 'postgres' por 'localhost'
DATABASE_URL="postgresql://conciencia_user:conciencia_pass@localhost:5432/conciencia_db?schema=public"

# Cambia 'redis' por 'localhost'
REDIS_HOST="localhost"
```

### 3. Preparar la Base de Datos (desde local)

Con el `.env` correctamente configurado, ejecuta los siguientes comandos desde la carpeta `backend/`.

```bash
# 1. Aplica las migraciones
pnpm prisma migrate dev

# 2. Puebla la base de datos
pnpm prisma db seed
```

### 4. Ejecutar el Backend

Finalmente, inicia el servidor de NestJS:

```bash
# Desde la carpeta backend/
pnpm start:dev
```

La API estará disponible en [http://localhost:3000](http://localhost:3000) y se reiniciará automáticamente con cada cambio.
