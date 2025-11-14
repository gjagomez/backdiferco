# Backend DIFERCO Videos - Node.js + MySQL

Backend API REST para la gestión de videos de DIFERCO, reemplazando Supabase con Node.js y MySQL.

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

```bash
cd backend
npm install
```

### 2. Configurar Variables de Entorno

El archivo `.env` ya está configurado con tus credenciales de MySQL:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=admin
DB_NAME=diferco_videos
DB_PORT=3306
```

### 3. Inicializar Base de Datos

```bash
npm run init-db
```

Esto creará:
- Base de datos `diferco_videos`
- Tablas: `users`, `videos`, `additional_videos`, `comments`
- Usuario admin: `admin@diferco.com` / `diferco2025`

### 4. Iniciar Servidor

```bash
npm start
# O para desarrollo con auto-reload:
npm run dev
```

El servidor estará corriendo en: **http://localhost:3001**

## 📡 Endpoints API

### Videos

- `GET /api/videos` - Obtener todos los videos
- `GET /api/videos/:id` - Obtener video por ID
- `GET /api/videos/nog/:nog` - Obtener video por número NOG
- `POST /api/videos` - Crear nuevo video
- `PUT /api/videos/:id` - Actualizar video
- `DELETE /api/videos/:id` - Eliminar video
- `POST /api/videos/:id/like` - Incrementar likes
- `POST /api/videos/:id/additional` - Agregar video adicional

### Autenticación

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/verify` - Verificar token

### Health Check

- `GET /api/health` - Estado del servidor

## 🗄️ Estructura de la Base de Datos

### Tabla `videos`
```sql
id (VARCHAR(36) PRIMARY KEY)
nog (VARCHAR(20) UNIQUE)
title (VARCHAR(255))
description (TEXT)
category (VARCHAR(100))
category_color (VARCHAR(100))
public_id (VARCHAR(255))
views (VARCHAR(50))
likes (INT)
date (VARCHAR(100))
duration (VARCHAR(50))
featured (BOOLEAN)
border_color (VARCHAR(100))
card_color (VARCHAR(255))
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla `users`
```sql
id (VARCHAR(36) PRIMARY KEY)
email (VARCHAR(255) UNIQUE)
username (VARCHAR(100) UNIQUE)
password (VARCHAR(255))
role (ENUM: 'admin', 'user')
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Tabla `additional_videos`
```sql
id (VARCHAR(36) PRIMARY KEY)
video_id (VARCHAR(36) FK)
title (VARCHAR(255))
public_id (VARCHAR(255))
thumbnail (VARCHAR(500))
created_at (TIMESTAMP)
```

### Tabla `comments`
```sql
id (INT AUTO_INCREMENT PRIMARY KEY)
video_id (VARCHAR(36) FK)
author (VARCHAR(100))
content (TEXT)
date (VARCHAR(100))
likes (INT)
created_at (TIMESTAMP)
```

## 🔧 Scripts Disponibles

- `npm start` - Iniciar servidor en producción
- `npm run dev` - Iniciar servidor en desarrollo (con nodemon)
- `npm run init-db` - Crear/inicializar base de datos

## 📦 Dependencias

- **express** - Framework web
- **mysql2** - Cliente MySQL con Promises
- **cors** - Manejo de CORS
- **dotenv** - Variables de entorno
- **bcryptjs** - Encriptación de contraseñas
- **jsonwebtoken** - Autenticación JWT
- **uuid** - Generación de IDs únicos

## 🔐 Seguridad

- Contraseñas encriptadas con bcrypt
- Autenticación JWT
- Validación de datos en endpoints
- CORS configurado

## 📝 Notas

- El backend genera números NOG automáticamente si no se proporcionan
- Los videos eliminados también eliminan sus videos adicionales y comentarios (CASCADE)
- El token JWT expira en 7 días
- CORS está configurado para `http://localhost:8080` (frontend)

## 🚢 Despliegue en Digital Ocean

### Preparar para producción:

1. **Actualizar `.env` con datos de producción:**
```env
NODE_ENV=production
DB_HOST=tu-servidor-mysql.com
DB_USER=tu-usuario
DB_PASSWORD=tu-contraseña-segura
DB_NAME=diferco_videos
JWT_SECRET=tu-secreto-super-seguro-aqui
CORS_ORIGIN=https://tu-dominio.com
```

2. **En Digital Ocean:**
- Crear Droplet con Ubuntu
- Instalar Node.js y MySQL
- Clonar repositorio
- Ejecutar `npm install --production`
- Ejecutar `npm run init-db`
- Usar PM2 para mantener el servidor corriendo:
  ```bash
  npm install -g pm2
  pm2 start server.js --name diferco-api
  pm2 startup
  pm2 save
  ```

## ❓ Problemas Comunes

**Error: Cannot connect to MySQL**
- Verifica que MySQL esté corriendo
- Verifica las credenciales en `.env`
- Asegúrate de que el puerto 3306 esté disponible

**Error: EADDRINUSE (puerto 3001 en uso)**
- Cambia el puerto en `.env`: `PORT=3002`
- O mata el proceso: `npx kill-port 3001`

**Error al inicializar la base de datos**
- Verifica que el usuario MySQL tenga permisos para crear bases de datos
- Ejecuta MySQL como administrador

## 📞 Soporte

Para problemas o preguntas, contacta al equipo de desarrollo de DIFERCO.
