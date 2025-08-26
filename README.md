# Conciencia Backend

Este es el repositorio para el backend del proyecto **Conciencia**, construido con
**NestJS**, **Prisma**, **PostgreSQL** y **Redis**, y orquestado con **Docker**.

## Desarrollo Local

Sigue estos pasos para levantar el entorno de desarrollo en tu máquina local.

### Prerrequisitos

Asegúrate de tener instalado el siguiente software:

- **Git**
- **Docker**
- **Node.js** (v20 o superior)
- **pnpm** (puedes instalarlo con `npm install -g pnpm`)

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd conciencia-backend
```

## Configurar las Variables de Entorno

El proyecto utiliza un archivo .env para gestionar las variables de entorno.
Crea una copia del archivo de ejemplo:

```bash
cp .env.example .env
```

## Levantar el entorno

Este comando construirá las imágenes de Docker (si es la primera vez)
y levantará todos los servicios (backend, postgres, redis):

```bash
docker-compose up --build
```

La API estará disponible en <http://localhost:3000>.

## Preparar la Base de Datos

Una vez que los contenedores estén corriendo, abre una nueva terminal y
ejecuta los siguientes comandos para preparar la base de datos.

1. Aplicar migraciones para crear tablas

```bash
docker-compose exec backend pnpm prisma migrate dev
```

2. Poblar la base de datos con los datos iniciales (roles):

```bash
docker-compose exec backend pnpm prisma db seed
```
