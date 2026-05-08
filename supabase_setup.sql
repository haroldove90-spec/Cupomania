-- Script de configuración COMPLETO para Supabase
-- Ejecuta este script en el editor SQL para asegurar que la base de datos sea 100% compatible.

-- 1. Tabla de Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Se vincula con auth.users
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    whatsapp TEXT,
    city TEXT,
    photo_url TEXT,
    role TEXT DEFAULT 'usuario' CHECK (role IN ('usuario', 'patrocinador', 'admin')),
    is_active BOOLEAN DEFAULT true,
    business_name TEXT,
    representative_name TEXT,
    address TEXT,
    location_link TEXT,
    website TEXT, -- Campo para página web
    services JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Cupones
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    nombre_negocio TEXT,
    logo_url TEXT,
    oferta_texto TEXT,
    categoria TEXT,
    condiciones TEXT,
    color_primario TEXT,
    codigo_canje TEXT,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    timestamp_final TEXT,
    image_data TEXT,
    status TEXT DEFAULT 'success',
    is_published BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para Perfiles
DROP POLICY IF EXISTS "Permitir lectura pública de perfiles" ON public.profiles;
CREATE POLICY "Permitir lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios pueden gestionar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden gestionar su propio perfil" ON public.profiles FOR ALL USING (true);

-- 5. Políticas para Cupones
DROP POLICY IF EXISTS "Cupones visibles para todos" ON public.coupons;
CREATE POLICY "Cupones visibles para todos" ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creadores gestionan sus cupones" ON public.coupons;
CREATE POLICY "Creadores gestionan sus cupones" ON public.coupons FOR ALL USING (true);

-- 6. Tabla de Favoritos
CREATE TABLE IF NOT EXISTS public.saved_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, coupon_id)
);

ALTER TABLE public.saved_coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestión de favoritos" ON public.saved_coupons;
CREATE POLICY "Gestión de favoritos" ON public.saved_coupons FOR ALL USING (true);
