-- ============================================================
-- ADD PDF EXPORT PERMISSION TO RPA_USERS TABLE
-- ============================================================

ALTER TABLE public.rpa_users 
ADD COLUMN IF NOT EXISTS pdf_export_enabled boolean NOT NULL DEFAULT true;

-- Ensure all current users have it enabled by default
UPDATE public.rpa_users SET pdf_export_enabled = true WHERE pdf_export_enabled IS NULL;
