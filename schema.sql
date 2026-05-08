-- Esquema Final Corregido para Cuponmanía (Supabase)

-- 1. Tabla de Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    whatsapp TEXT,
    city TEXT,
    photo_url TEXT,
    role TEXT DEFAULT 'usuario' CHECK (role IN ('usuario', 'patrocinador', 'admin')),
    is_active BOOLEAN DEFAULT true,
    
    -- Campos específicos de negocio (Solo patrocinadores)
    business_name TEXT,
    representative_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Cupones
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sponsor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    data JSONB NOT NULL, -- Contiene header, oferta, condiciones, cronometro, branding, diseno
    is_published BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE
);

-- 3. Tabla de Favoritos (Saved)
CREATE TABLE IF NOT EXISTS public.saved_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, coupon_id)
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_coupons ENABLE ROW LEVEL SECURITY;

-- --- POLÍTICAS DE SEGURIDAD (RLS) ---

-- Políticas para PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Política Admin para Profiles (Evitando recursión infinita)
DROP POLICY IF EXISTS "Admin: Control total de perfiles" ON public.profiles;
CREATE POLICY "Admin: Control total de perfiles" ON public.profiles FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Políticas para COUPONS
DROP POLICY IF EXISTS "Anyone can view published coupons" ON public.coupons;
CREATE POLICY "Anyone can view published coupons" ON public.coupons FOR SELECT USING (is_published = true OR auth.uid() = sponsor_id);

DROP POLICY IF EXISTS "Sponsors can manage their own coupons" ON public.coupons;
CREATE POLICY "Sponsors can manage their own coupons" ON public.coupons FOR ALL USING (auth.uid() = sponsor_id);

DROP POLICY IF EXISTS "Admin: Control total de cupones" ON public.coupons;
CREATE POLICY "Admin: Control total de cupones" ON public.coupons FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Políticas para SAVED_COUPONS
DROP POLICY IF EXISTS "Users can view own saved" ON public.saved_coupons;
CREATE POLICY "Users can view own saved" ON public.saved_coupons FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved" ON public.saved_coupons;
CREATE POLICY "Users can insert own saved" ON public.saved_coupons FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved" ON public.saved_coupons;
CREATE POLICY "Users can delete own saved" ON public.saved_coupons FOR DELETE USING (auth.uid() = user_id);

-- --- FUNCIONES Y TRIGGERS ---

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
