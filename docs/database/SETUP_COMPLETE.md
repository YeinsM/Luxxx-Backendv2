# ✅ Base de datos lusty_db creada exitosamente

## 📊 Tablas creadas:
- ✅ users (tabla principal con todos los tipos de usuarios)
- ✅ Índices para optimizar consultas
- ✅ Trigger para actualizar updated_at automáticamente
- ✅ Enumeración user_type (escort, member, agency, club)

## 📁 Estructura de la tabla users:
- id (UUID) - Identificador único generado automáticamente
- email (VARCHAR) - Email único del usuario
- password (VARCHAR) - Contraseña hasheada
- user_type (ENUM) - Tipo: escort, member, agency, club
- is_active (BOOLEAN) - Cuenta activa
- email_verified (BOOLEAN) - Email verificado
- created_at (TIMESTAMP) - Fecha de creación
- updated_at (TIMESTAMP) - Última actualización

### Campos específicos por tipo:
**Escort:** name, phone, city, age
**Member:** username, city
**Agency:** agency_name, phone, city, website (opcional)
**Club:** club_name, phone, address, city, website (opcional), opening_hours (opcional)

## 🔧 SIGUIENTE PASO: Configurar el backend

### 1. Edita el archivo .env:

```env
DB_MODE=supabase
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA_AQUI@localhost:5432/lusty_db
```

Reemplaza `TU_CONTRASEÑA_AQUI` con tu contraseña de PostgreSQL.

### 2. Recompila y arranca el backend:

```powershell
cd C:\Users\Home\Desktop\TechBrains\Luxxx\Luxxx-Backendv2
npm run build
npm start
```

Deberías ver en la consola:
```
✅ Using PostgreSQL/Supabase database
🚀 Server running on port 5000
```

## 📝 Comandos útiles:

### Para usar psql sin ruta completa:
Ejecuta como Administrador:
```powershell
.\database\setup-postgresql-path.ps1
```

### Ver comandos de ejemplo:
```powershell
.\database\psql-commands.ps1
```

### Conectarse a la base de datos:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d lusty_db
```

## 🎯 Archivos de ayuda creados:
1. `database/setup-postgresql-path.ps1` - Script para agregar psql al PATH
2. `database/psql-commands.ps1` - Comandos de ejemplo para PostgreSQL
3. `database/schema-local.sql` - Schema de la base de datos

¡La base de datos está lista para usar! 🎉
