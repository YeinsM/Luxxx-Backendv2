-- ============================================================
-- Migración 006: Invalidar todas las sesiones activas
-- Uso: correr SOLO cuando se quiere forzar re-login de todos
--      los usuarios (ej: cambio de política de expiración JWT)
-- Efecto: incrementa token_version de todos los usuarios,
--         haciendo inválidos todos los tokens JWT existentes.
-- ============================================================

UPDATE public.users
SET token_version = COALESCE(token_version, 0) + 1
WHERE soft_deleted_at IS NULL;

-- Verificar cuántos usuarios fueron afectados
SELECT COUNT(*) AS users_invalidated FROM public.users WHERE soft_deleted_at IS NULL;
