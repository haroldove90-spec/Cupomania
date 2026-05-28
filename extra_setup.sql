-- 1. Agregar columna para guardar la imagen renderizada del cupón
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS image_data TEXT;

-- 2. Tabla para el registro fotográfico (Evidencia de canje)
-- Eliminamos la restricción de llave foránea para evitar errores si el perfil no existe
CREATE TABLE IF NOT EXISTS public.photo_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_name TEXT,
    photo_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Si la tabla ya existía, nos aseguramos de que tenga las columnas correctas y no tenga el FK
DO $$ 
BEGIN
    -- Intentar agregar user_name si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='photo_registrations' AND column_name='user_name') THEN
        ALTER TABLE public.photo_registrations ADD COLUMN user_name TEXT;
    END IF;

    -- Intentar quitar el FK si existe (basado en el nombre del error reportado por el usuario)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='photo_registrations_user_id_fkey') THEN
        ALTER TABLE public.photo_registrations DROP CONSTRAINT photo_registrations_user_id_fkey;
    END IF;
END $$;

-- 3. Habilitar RLS y políticas
ALTER TABLE public.photo_registrations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Registros visibles para todos" ON public.photo_registrations;
    CREATE POLICY "Registros visibles para todos" ON public.photo_registrations FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Insercion libre de registros" ON public.photo_registrations;
    CREATE POLICY "Insercion libre de registros" ON public.photo_registrations FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Borrado para administradores y dueños" ON public.photo_registrations;
    CREATE POLICY "Borrado para administradores y dueños" ON public.photo_registrations FOR DELETE USING (true);
END $$;

-- 4. Asegurar que public.izcalli_flyers tenga whatsapp y phone
CREATE TABLE IF NOT EXISTS public.izcalli_flyers (
    id TEXT PRIMARY KEY,
    title TEXT,
    image_url TEXT NOT NULL,
    category_name TEXT,
    creator_id TEXT,
    creator_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.izcalli_flyers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.izcalli_flyers ADD COLUMN IF NOT EXISTS phone TEXT;

