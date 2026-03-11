-- Normaliza la clave del Promo Sticker en promotion_plans.
-- El Promo Sticker (€0.5/día) está disponible en los planes Premium y Exclusive.
-- El emoji en el título está incluido sin coste adicional en el plan Exclusive.

-- 1. Renombrar emoji_price_per_day → promo_sticker_price_per_day donde exista
UPDATE promotion_plans
SET features = (features - 'emoji_price_per_day') || jsonb_build_object('promo_sticker_price_per_day', (features->>'emoji_price_per_day')::numeric)
WHERE features ? 'emoji_price_per_day';

-- 2. Renombrar boost_price_per_day → promo_sticker_price_per_day donde exista
UPDATE promotion_plans
SET features = (features - 'boost_price_per_day') || jsonb_build_object('promo_sticker_price_per_day', (features->>'boost_price_per_day')::numeric)
WHERE features ? 'boost_price_per_day' AND NOT features ? 'promo_sticker_price_per_day';

-- 3. Añadir promo_sticker_price_per_day (0.5) al plan PREMIUM si aún no lo tiene
UPDATE promotion_plans
SET features = features || jsonb_build_object('promo_sticker_price_per_day', 0.5)
WHERE name = 'PREMIUM' AND NOT features ? 'promo_sticker_price_per_day';
