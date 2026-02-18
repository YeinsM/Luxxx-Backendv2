-- ═══════════════════════════════════════════════════════════════
-- VERIFICACIÓN RÁPIDA DE CAMPOS PRIVACY & SOFT DELETE
-- ═══════════════════════════════════════════════════════════════
-- Ejecuta este script en Supabase SQL Editor para verificar
-- si necesitas ejecutar la migración 003
-- ═══════════════════════════════════════════════════════════════

SELECT 
  '🔍 VERIFICACIÓN DE CAMPOS NUEVOS' AS titulo;

-- Verificar si los campos existen
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name = 'privacy_consent_accepted_at'
    ) THEN '✅ privacy_consent_accepted_at EXISTE'
    ELSE '❌ privacy_consent_accepted_at FALTA - Ejecuta migración 003'
  END AS "Estado Campo 1",
  
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name = 'soft_deleted_at'
    ) THEN '✅ soft_deleted_at EXISTE'
    ELSE '❌ soft_deleted_at FALTA - Ejecuta migración 003'
  END AS "Estado Campo 2",
  
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE indexname = 'idx_users_soft_deleted_at'
    ) THEN '✅ Índice soft_deleted_at EXISTE'
    ELSE '⚠️  Índice soft_deleted_at FALTA (opcional pero recomendado)'
  END AS "Estado Índice";

-- Mostrar estructura actual de la tabla users (solo campos relacionados)
SELECT 
  '📋 ESTRUCTURA ACTUAL DE LA TABLA USERS (campos clave)' AS seccion;

SELECT 
  column_name AS "Columna",
  data_type AS "Tipo de Dato",
  is_nullable AS "Permite NULL",
  column_default AS "Valor por Defecto"
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'privacy_consent_accepted_at',
    'soft_deleted_at',
    'is_active',
    'email_verified',
    'created_at',
    'updated_at'
  )
ORDER BY 
  CASE column_name
    WHEN 'created_at' THEN 1
    WHEN 'updated_at' THEN 2
    WHEN 'is_active' THEN 3
    WHEN 'email_verified' THEN 4
    WHEN 'privacy_consent_accepted_at' THEN 5
    WHEN 'soft_deleted_at' THEN 6
  END;

-- ═══════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO:
-- ═══════════════════════════════════════════════════════════════
-- Si ves:
--   ✅ privacy_consent_accepted_at EXISTE
--   ✅ soft_deleted_at EXISTE
--   ✅ Índice soft_deleted_at EXISTE
-- 
-- Entonces NO necesitas ejecutar la migración 003.
--
-- Si ves algún ❌ entonces SÍ necesitas ejecutar:
--   database/migrations/003_add_privacy_consent_and_soft_delete.sql
-- ═══════════════════════════════════════════════════════════════
