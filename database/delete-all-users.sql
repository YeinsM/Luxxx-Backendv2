-- ══════════════════════════════════════════════════════════════
-- ELIMINAR TODOS LOS USUARIOS DE SUPABASE
-- ══════════════════════════════════════════════════════════════
-- ADVERTENCIA: Esta operación eliminará PERMANENTEMENTE todos los 
-- usuarios de la base de datos. Úsala solo en desarrollo.
-- ══════════════════════════════════════════════════════════════

-- Ver cuántos usuarios hay antes de eliminar
SELECT 
  user_type,
  COUNT(*) as total
FROM users
GROUP BY user_type
ORDER BY user_type;

-- Ver el total general
SELECT COUNT(*) as total_usuarios FROM users;

-- ══════════════════════════════════════════════════════════════
-- EJECUTA ESTA LÍNEA PARA ELIMINAR TODOS LOS USUARIOS
-- ══════════════════════════════════════════════════════════════

TRUNCATE TABLE users CASCADE;

-- O usa esto si prefieres DELETE (más lento pero registra cada eliminación):
-- DELETE FROM users;

-- ══════════════════════════════════════════════════════════════
-- Verificar que la tabla quedó vacía
-- ══════════════════════════════════════════════════════════════

SELECT COUNT(*) as usuarios_restantes FROM users;
