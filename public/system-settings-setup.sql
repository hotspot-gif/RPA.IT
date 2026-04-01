-- ============================================================
-- SYSTEM SETTINGS TABLE — CREATE AFTER database-setup.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id text PRIMARY KEY DEFAULT 'global',
  pdf_export_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Adming can manage settings
CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rpa_users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'HS-ADMIN'
    )
  );

-- All users can read settings
CREATE POLICY "Everyone can read settings" ON public.system_settings
  FOR SELECT USING (true);

-- Insert default row
INSERT INTO public.system_settings (id, pdf_export_enabled)
VALUES ('global', true)
ON CONFLICT (id) DO NOTHING;
