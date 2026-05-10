-- Script de configuración para Cuponmanía en Supabase

-- 1. Tabla de Cupones (si no existe)
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    creator_id TEXT NOT NULL, -- Puede ser el UID de Supabase o un ID temporal
    nombre_negocio TEXT NOT NULL,
    logo_url TEXT,
    oferta_texto TEXT NOT NULL,
    categoria TEXT,
    condiciones TEXT,
    timestamp_final TIMESTAMPTZ,
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    color_primario TEXT DEFAULT '#2B8C85',
    codigo_canje TEXT,
    is_published BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active',
    image_data TEXT
);

-- 2. Tabla de Cupones Guardados (La "Cuponera")
CREATE TABLE IF NOT EXISTS public.saved_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id TEXT NOT NULL,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
    UNIQUE(user_id, coupon_id)
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_coupons ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para saved_coupons
-- Permitir lectura solo de los propios cupones guardados
CREATE POLICY "Usuarios pueden ver sus propios cupones guardados"
ON public.saved_coupons FOR SELECT
USING (true); -- En un entorno real sería: auth.uid()::text = user_id

-- Permitir insertar
CREATE POLICY "Usuarios pueden guardar cupones"
ON public.saved_coupons FOR INSERT
WITH CHECK (true);

-- Permitir eliminar
CREATE POLICY "Usuarios pueden eliminar sus cupones guardados"
ON public.saved_coupons FOR DELETE
USING (true);

-- 5. Políticas para coupons
CREATE POLICY "Cualquiera puede ver cupones publicados"
ON public.coupons FOR SELECT
USING (is_published = true OR status = 'active');

CREATE POLICY "Admins y Patrocinadores pueden insertar cupones"
ON public.coupons FOR INSERT
WITH CHECK (true);

CREATE POLICY "Dueños pueden actualizar sus cupones"
ON public.coupons FOR UPDATE
USING (true);

-- 6. Tabla de Visitas (Métricas)
CREATE TABLE IF NOT EXISTS public.app_metrics (
    id TEXT PRIMARY KEY,
    count BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar contador inicial si no existe
INSERT INTO public.app_metrics (id, count) VALUES ('page_visits', 0) ON CONFLICT (id) DO NOTHING;

-- Políticas para app_metrics
ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cualquiera puede ver métricas" ON public.app_metrics FOR SELECT USING (true);
CREATE POLICY "Cualquiera puede incrementar métricas" ON public.app_metrics FOR UPDATE USING (true);
