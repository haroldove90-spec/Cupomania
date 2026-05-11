-- 1. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'promo')) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Permitir que el sistema (o el admin vía RPC) inserte notificaciones
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- 2. Función para envío masivo (Broadcast)
CREATE OR REPLACE FUNCTION public.send_broadcast_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_target_role TEXT DEFAULT 'all'
) RETURNS void AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Obtenemos los IDs de auth.users filtrando por el rol en public.profiles
    FOR v_user IN 
        SELECT p.id FROM public.profiles p
        WHERE (p_target_role = 'all') 
           OR (p.role = p_target_role)
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (v_user.id, p_title, p_message, p_type);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para notificar a administradores un nuevo registro
CREATE OR REPLACE FUNCTION public.notify_admins(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info'
) RETURNS void AS $$
DECLARE
    v_admin RECORD;
BEGIN
    FOR v_admin IN 
        SELECT p.id FROM public.profiles p WHERE p.role = 'admin'
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (v_admin.id, p_title, p_message, p_type);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
