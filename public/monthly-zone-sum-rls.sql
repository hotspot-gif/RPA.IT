-- ============================================================
-- ENABLE RLS FOR MONTHLY_ZONE_SUM WITH CORRECT POLICIES
-- ============================================================

-- 1. Enable Row Level Security
ALTER TABLE public.monthly_zone_sum ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if any (to avoid duplicates)
DROP POLICY IF EXISTS "Users can read aggregated monthly data" ON public.monthly_zone_sum;

-- 3. Create the access policy
-- This allows:
-- - Admins and Country Managers to see all rows
-- - Other users (RSM, ASM) to only see rows for their assigned branches
CREATE POLICY "Users can read aggregated monthly data" ON public.monthly_zone_sum
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rpa_users u
      WHERE u.auth_user_id = auth.uid()
        AND u.is_active = true
        AND (
          u.role IN ('HS-ADMIN', 'COUNTRY-MANAGER')
          OR branch = ANY(u.branches)
          OR branch = ANY(
               -- This subquery handles potential LMIT-HS- prefix differences
               SELECT CASE 
                 WHEN b LIKE 'LMIT-HS-%' THEN REPLACE(b, 'LMIT-HS-', '')
                 ELSE 'LMIT-HS-' || b 
               END
               FROM unnest(u.branches) AS b
             )
        )
    )
  );

-- 4. Admin management policy (Optional, if you import data to this table)
DROP POLICY IF EXISTS "Admins can manage monthly_zone_sum" ON public.monthly_zone_sum;
CREATE POLICY "Admins can manage monthly_zone_sum" ON public.monthly_zone_sum
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rpa_users u
      WHERE u.auth_user_id = auth.uid() AND u.role = 'HS-ADMIN'
    )
  );
