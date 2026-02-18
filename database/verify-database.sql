-- ═══════════════════════════════════════════════════════════════
-- SCRIPT DE VERIFICACIÓN DE BASE DE DATOS - Luxxx Platform
-- ═══════════════════════════════════════════════════════════════
-- Ejecuta este script en Supabase SQL Editor para verificar
-- qué tablas existen y cuáles faltan por crear
-- ═══════════════════════════════════════════════════════════════

-- 1. VERIFICAR TABLAS EXISTENTES VS REQUERIDAS
-- ───────────────────────────────────────────────────────────────
SELECT 
  'VERIFICACIÓN DE TABLAS' AS seccion,
  '══════════════════════' AS separador;

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'users',
    'advertisements',
    'advertisement_services',
    'advertisement_rates',
    'user_media',
    'reviews',
    'messages',
    'notifications',
    'transactions',
    'invoices',
    'saved_searches'
  ]) AS table_name,
  unnest(ARRAY[
    'Usuarios (escorts, members, agencies, clubs)',
    'Anuncios/perfiles de escorts',
    'Servicios ofrecidos por anuncio',
    'Tarifas por tiempo (1h, 2h, overnight)',
    'Fotos y videos subidos',
    'Reseñas y calificaciones',
    'Sistema de mensajería',
    'Notificaciones del sistema',
    'Historial de transacciones',
    'Facturas generadas',
    'Búsquedas guardadas'
  ]) AS description,
  unnest(ARRAY[
    'CRÍTICA',
    'CRÍTICA',
    'CRÍTICA',
    'CRÍTICA',
    'CRÍTICA',
    'OPCIONAL',
    'OPCIONAL',
    'OPCIONAL',
    'OPCIONAL',
    'OPCIONAL',
    'OPCIONAL'
  ]) AS priority
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT 
  row_number() OVER (ORDER BY CASE WHEN x.table_name IS NULL THEN 0 ELSE 1 END DESC, e.table_name) AS "#",
  e.table_name AS "Tabla",
  e.description AS "Descripción",
  e.priority AS "Prioridad",
  CASE 
    WHEN x.table_name IS NOT NULL THEN '✅ EXISTE'
    ELSE '❌ FALTA'
  END AS "Estado"
FROM expected_tables e
LEFT JOIN existing_tables x ON e.table_name = x.table_name
ORDER BY 
  CASE WHEN x.table_name IS NULL THEN 0 ELSE 1 END DESC,
  e.priority,
  e.table_name;

-- 2. RESUMEN GENERAL
-- ───────────────────────────────────────────────────────────────
SELECT 
  'RESUMEN' AS seccion,
  '═══════' AS separador;

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'users', 'advertisements', 'advertisement_services', 
    'advertisement_rates', 'user_media', 'reviews', 'messages',
    'notifications', 'transactions', 'invoices', 'saved_searches'
  ]) AS table_name
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT 
  (SELECT COUNT(*) FROM existing_tables WHERE table_name IN (SELECT table_name FROM expected_tables)) AS "✅ Tablas Existentes",
  (SELECT COUNT(*) FROM expected_tables) - 
  (SELECT COUNT(*) FROM existing_tables WHERE table_name IN (SELECT table_name FROM expected_tables)) AS "❌ Tablas Faltantes",
  (SELECT COUNT(*) FROM expected_tables) AS "📊 Total Requeridas";

-- 3. VERIFICAR COLUMNAS CRÍTICAS EN TABLA USERS (si existe)
-- ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE 'VERIFICACIÓN DE COLUMNAS EN TABLA USERS';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  ELSE
    RAISE NOTICE '⚠️  TABLA USERS NO EXISTE - Ejecuta database/schema.sql';
  END IF;
END $$;

SELECT 
  'COLUMNAS CRÍTICAS - USERS' AS seccion,
  '═════════════════════════' AS separador;

WITH expected_columns AS (
  SELECT unnest(ARRAY[
    'id',
    'email',
    'password',
    'user_type',
    'token_version',
    'is_active',
    'email_verified',
    'email_verification_token',
    'password_reset_token_hash',
    'privacy_consent_accepted_at',
    'soft_deleted_at',
    'created_at',
    'updated_at'
  ]) AS column_name
),
existing_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
)
SELECT 
  e.column_name AS "Columna",
  CASE 
    WHEN x.column_name IS NOT NULL THEN '✅ EXISTE'
    ELSE '❌ FALTA'
  END AS "Estado"
FROM expected_columns e
LEFT JOIN existing_columns x ON e.column_name = x.column_name
ORDER BY 
  CASE WHEN x.column_name IS NULL THEN 0 ELSE 1 END DESC,
  e.column_name;

-- 4. VERIFICAR ÍNDICES IMPORTANTES
-- ───────────────────────────────────────────────────────────────
SELECT 
  'ÍNDICES' AS seccion,
  '═══════' AS separador;

SELECT 
  schemaname AS "Schema",
  tablename AS "Tabla",
  indexname AS "Nombre del Índice",
  indexdef AS "Definición"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'advertisements', 'advertisement_services',
    'advertisement_rates', 'user_media', 'reviews', 'messages',
    'notifications', 'transactions', 'invoices', 'saved_searches'
  )
ORDER BY tablename, indexname;

-- 5. VERIFICAR FOREIGN KEYS
-- ───────────────────────────────────────────────────────────────
SELECT 
  'FOREIGN KEYS' AS seccion,
  '════════════' AS separador;

SELECT 
  tc.table_name AS "Tabla",
  kcu.column_name AS "Columna",
  ccu.table_name AS "Referencia a Tabla",
  ccu.column_name AS "Referencia a Columna",
  tc.constraint_name AS "Constraint"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'advertisements', 'advertisement_services', 'advertisement_rates',
    'user_media', 'reviews', 'messages', 'notifications',
    'transactions', 'invoices', 'saved_searches'
  )
ORDER BY tc.table_name, kcu.column_name;

-- 6. VERIFICAR TRIGGERS
-- ───────────────────────────────────────────────────────────────
SELECT 
  'TRIGGERS' AS seccion,
  '════════' AS separador;

SELECT 
  event_object_table AS "Tabla",
  trigger_name AS "Trigger",
  event_manipulation AS "Evento",
  action_statement AS "Acción"
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'users', 'advertisements', 'reviews'
  )
ORDER BY event_object_table, trigger_name;

-- 7. CONTAR REGISTROS (si existen datos)
-- ───────────────────────────────────────────────────────────────
SELECT 
  'DATOS EXISTENTES' AS seccion,
  '════════════════' AS separador;

DO $$
DECLARE
  tables_exist BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'users' 
      AND table_schema = 'public'
  ) INTO tables_exist;

  IF tables_exist THEN
    RAISE NOTICE '📊 Conteo de registros en tablas:';
  ELSE
    RAISE NOTICE '⚠️  No hay tablas creadas aún';
  END IF;
END $$;

-- Contar usuarios (si existe la tabla)
SELECT 
  'users' AS "Tabla",
  COUNT(*) AS "Registros"
FROM users
WHERE soft_deleted_at IS NULL
UNION ALL
-- Contar anuncios (si existe la tabla)
SELECT 
  'advertisements' AS "Tabla",
  COUNT(*) AS "Registros"
FROM advertisements
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advertisements')
UNION ALL
-- Contar media (si existe la tabla)
SELECT 
  'user_media' AS "Tabla",
  COUNT(*) AS "Registros"
FROM user_media
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_media')
ORDER BY "Tabla";

-- ═══════════════════════════════════════════════════════════════
-- FIN DEL REPORTE
-- ═══════════════════════════════════════════════════════════════

SELECT 
  '════════════════════════════════════════════════' AS "═══════════════════════════════════════════════════";

SELECT 
  '✅ VERIFICACIÓN COMPLETADA' AS "Resultado";

SELECT 
  '════════════════════════════════════════════════' AS "═══════════════════════════════════════════════════";

-- INSTRUCCIONES:
-- Si ves tablas faltantes (❌ FALTA):
-- 1. Para tabla 'users': Ejecuta database/schema.sql
-- 2. Para las demás: Ejecuta database/migrations/002_full_schema.sql
