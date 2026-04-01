# KPI Data Setup Instructions

## Problem
The `kpi_data` table in Supabase may have RLS (Row Level Security) policies preventing inserts, or the table may not exist.

## Solution

### Method 1: Execute SQL in Supabase Dashboard (RECOMMENDED)

1. **Open Supabase SQL Editor**:
   - Go to your Supabase project dashboard
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Run the complete initialization SQL**:
   - Copy the contents of `public/kpi-init-complete.sql`
   - Paste into the SQL editor
   - Click "Run"
   - This will:
     - Create the kpi_data table if it doesn't exist
     - Set up indexes
     - Enable RLS with proper policies
     - Insert all 720 data rows

3. **Verify the data**:
   - Click "SQL Editor" → "New Query"
   - Run: `SELECT COUNT(*) as row_count FROM kpi_data;`
   - Should return: 72 rows (sample from LMIT-HS-BARI)

### Method 2: Using the App's Data Import Feature

1. Go to "Data Import" page in your app
2. Select "KPI Data" tab
3. Upload `public/kpi_sample_data.csv`
4. Click "Import"
5. Wait for completion message

**If this fails**, check browser console (F12) for error messages, which will show the exact RLS policy issue.

### Method 3: Complete Data Load (If using all 720 records)

1. **First**, run the initialization SQL from Method 1 to set up RLS policies
2. **Then**, run SQL from `public/kpi_insert.sql` to load all 720 records:
   - Go to Supabase SQL Editor
   - New Query
   - Copy all contents from `public/kpi_insert.sql`
   - Paste and Run
   - This inserts all branches: BARI, BOLOGNA, MILAN, NAPLES, PADOVA, PALERMO, ROME, TORINO

## Troubleshooting

### Issue: "Policy violation" or "permission denied"
- **Cause**: RLS policies don't exist or are too restrictive
- **Fix**: Run `kpi-init-complete.sql` to set up policies

### Issue: "Relation kpi_data does not exist"
- **Cause**: Table wasn't created
- **Fix**: Run `kpi-init-complete.sql` (includes CREATE TABLE)

### Issue: "Violates unique constraint"
- **Cause**: Data is being imported twice
- **Fix**: The SQL uses `ON CONFLICT ... DO UPDATE` to deduplicate

### Issue: App still shows "No KPI data"
- **Cause**: Browser cache or data not actually inserted
- **Fix**: 
  1. Verify in Supabase: `SELECT COUNT(*) FROM kpi_data;`
  2. Clear browser cache (Ctrl+Shift+Delete)
  3. Reload the app
  4. Select a branch in the KPI page dropdown

## Column Mapping (CSV → Table)

| CSV Column | Database Column | Type | Example |
|-----------|-----------------|------|---------|
| branch | branch | VARCHAR(255) | LMIT-HS-BARI |
| zone | zone | VARCHAR(255) | HS BARI ZONE 1 |
| month | month | VARCHAR(7) | 2024-01 |
| year | year | INTEGER | 2024 |
| ga | ga | NUMERIC(10,2) | 577.00 |
| ga_target | ga_target | NUMERIC(10,2) | 1000.00 |
| uao | uao | NUMERIC(10,2) | 96.00 |
| uao_target | uao_target | NUMERIC(10,2) | 95.00 |
| na | na | NUMERIC(10,2) | 4.00 |
| na_target | na_target | NUMERIC(10,2) | 6.00 |

## Success Indicators

After successful import, you should see:
- ✅ "72 rows" when running LMIT-HS-BARI query in KPI dashboard
- ✅ Year dropdown shows "2024" and "2025" options
- ✅ Charts display with actual vs target metrics
- ✅ "Processed 720 KPI records" in Data Import logs (if using all data)

