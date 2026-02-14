# Configuración de PostgreSQL Local para Luxxx

## Paso 1: Conectarse a PostgreSQL

Abre PowerShell como Administrador y ejecuta:

```powershell
# Conectarse a PostgreSQL (por defecto usa el usuario postgres)
psql -U postgres
```

Te pedirá la contraseña que configuraste durante la instalación de PostgreSQL.

## Paso 2: Crear la base de datos

Dentro de psql, ejecuta:

```sql
-- Crear la base de datos
CREATE DATABASE lusty_db;

-- Verificar que se creó
\l

-- Conectarse a la nueva base de datos
\c lusty_db
```

## Paso 3: Ejecutar el schema

Sal de psql con `\q` y ejecuta desde PowerShell:

```powershell
# Cambiar al directorio del backend
cd C:\Users\Home\Desktop\TechBrains\Luxxx\Luxxx-Backendv2

# Ejecutar el archivo SQL
psql -U postgres -d lusty_db -f database/schema-local.sql
```

## Paso 4: Verificar las tablas creadas

Conéctate nuevamente a la base de datos:

```powershell
psql -U postgres -d lusty_db
```

Y verifica las tablas:

```sql
-- Ver todas las tablas
\dt

-- Ver la estructura de la tabla users
\d users

-- Ver los tipos de datos personalizados
\dT

-- Salir
\q
```

## Paso 5: Configurar el .env del backend

Edita el archivo `.env` en la carpeta del backend con:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Mode
DB_MODE=supabase

# Local PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/lusty_db

# JWT Configuration
JWT_SECRET=tu_secreto_jwt_muy_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=7d
```

Reemplaza `TU_CONTRASEÑA` con la contraseña de tu usuario postgres.

## Comandos útiles de PostgreSQL

```bash
# Listar bases de datos
\l

# Conectarse a una base de datos
\c nombre_base_datos

# Listar tablas
\dt

# Describir una tabla
\d nombre_tabla

# Ver usuarios/roles
\du

# Salir
\q
```

## Modificar el código del backend para usar PostgreSQL

El backend ya está preparado para usar Supabase/PostgreSQL. Solo necesitas:

1. Cambiar `DB_MODE=supabase` en el `.env`
2. Configurar la `DATABASE_URL` correctamente
3. Reiniciar el backend

El servicio `SupabaseDatabaseService` se activará automáticamente.

## Verificar conexión

Una vez configurado, reinicia el backend y deberías ver en la consola:

```
✅ Connected to Supabase database
🚀 Server running on port 5000
```

¡Listo! Ahora tu backend está usando PostgreSQL local.
