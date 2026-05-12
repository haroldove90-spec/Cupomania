-- 1. Asegurar estructura de la tabla app_metrics
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_metrics') THEN
        CREATE TABLE public.app_metrics (
            id TEXT PRIMARY KEY,
            count BIGINT DEFAULT 0,
            updated_at TIMESTAMPTZ DEFAULT now()
        );
    ELSE
        -- Si la tabla existe pero le falta la columna 'count', la agregamos
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_metrics' AND column_name='count') THEN
            ALTER TABLE public.app_metrics ADD COLUMN count BIGINT DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 2. Función para incremento atómico de visitas
CREATE OR REPLACE FUNCTION public.increment_page_visits()
RETURNS void AS $$
BEGIN
    INSERT INTO public.app_metrics (id, count)
    VALUES ('page_visits', 1)
    ON CONFLICT (id)
    DO UPDATE SET 
        count = public.app_metrics.count + 1,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Permisos y Políticas
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.app_metrics TO anon, authenticated;

ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cualquiera puede ver métricas" ON public.app_metrics;
CREATE POLICY "Cualquiera puede ver métricas" ON public.app_metrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cualquiera puede incrementar métricas" ON public.app_metrics;
CREATE POLICY "Cualquiera puede incrementar métricas" ON public.app_metrics FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Cualquiera puede insertar métricas" ON public.app_metrics;
CREATE POLICY "Cualquiera puede insertar métricas" ON public.app_metrics FOR INSERT WITH CHECK (true);

-- 4. Inicializar el contador si no existe
INSERT INTO public.app_metrics (id, count) VALUES ('page_visits', 0) ON CONFLICT (id) DO NOTHING;
