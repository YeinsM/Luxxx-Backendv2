# Comandos rápidos para usar PostgreSQL con lusty_db
# Copia y pega estos comandos en PowerShell

# IMPORTANTE: Usa la ruta completa hasta que agregues PostgreSQL al PATH

# --------------------------------------------------
# CONEXIÓN A LA BASE DE DATOS
# --------------------------------------------------

# Conectarse a lusty_db
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d lusty_db

# --------------------------------------------------
# COMANDOS DENTRO DE PSQL
# --------------------------------------------------
# Una vez dentro de psql, puedes usar:
#
# \l                  # Listar todas las bases de datos
# \dt                 # Listar todas las tablas
# \d users            # Ver estructura de la tabla users
# \dT                 # Ver tipos de datos personalizados
# \du                 # Ver usuarios/roles
# \q                  # Salir de psql
#
# SELECT * FROM users;                    # Ver todos los usuarios
# SELECT * FROM users WHERE user_type = 'escort';  # Filtrar por tipo

# --------------------------------------------------
# EJECUTAR COMANDOS SQL DESDE POWERSHELL
# --------------------------------------------------

# Ver todas las tablas
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d lusty_db -c "\dt"

# Ver estructura de tabla users
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d lusty_db -c "\d users"

# Ver todos los usuarios registrados
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d lusty_db -c "SELECT id, email, user_type, created_at FROM users ORDER BY created_at DESC;"

# Contar usuarios por tipo
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d lusty_db -c "SELECT user_type, COUNT(*) as total FROM users GROUP BY user_type;"

# --------------------------------------------------
# AGREGAR POSTGRESQL AL PATH (PERMANENTE)
# --------------------------------------------------
# Para no tener que escribir la ruta completa, ejecuta como Administrador:
#
# .\database\setup-postgresql-path.ps1
#
# Después de esto podrás usar simplemente: psql -U postgres -d lusty_db

# --------------------------------------------------
# BACKUP Y RESTORE
# --------------------------------------------------

# Crear backup de la base de datos
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -d lusty_db -f "backup_lusty_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Restaurar desde backup
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d lusty_db -f "backup_lusty_XXXXXXXX_XXXXXX.sql"
