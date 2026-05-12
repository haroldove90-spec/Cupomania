-- Función para incremento atómico de visitas
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

-- Asegurar que el rol anon y authenticated tengan acceso al esquema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.app_metrics TO anon, authenticated;

-- Reiniciar políticas por si acaso
DROP POLICY IF EXISTS "Cualquiera puede ver métricas" ON public.app_metrics;
CREATE POLICY "Cualquiera puede ver métricas" ON public.app_metrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cualquiera puede incrementar métricas" ON public.app_metrics;
CREATE POLICY "Cualquiera puede incrementar métricas" ON public.app_metrics FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Cualquiera puede insertar métricas" ON public.app_metrics;
CREATE POLICY "Cualquiera puede insertar métricas" ON public.app_metrics FOR INSERT WITH CHECK (true);
