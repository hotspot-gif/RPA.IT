export interface RpaUser {
  id: string;
  auth_user_id: string | null;
  username: string;
  full_name: string;
  email: string;
  role: 'HS-ADMIN' | 'COUNTRY-MANAGER' | 'RSM' | 'ASM';
  branches: string[];
  is_active: boolean;
  pdf_export_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RetailerSummary {
  retailer_id: string;
  branch: string;
  zone: string;
  ga_cnt: number;
  pi_l6: number;
  pi_g6: number;
  np_l6: number;
  np_g6: number;
  port_in: number;
  port_out: number;
  total_deductions: number;
  pi_raw: number;
  add_gara: number;
  pi_total: number;
  incentive: number;
  renewal_rate: number;
  po_deduction: number;
  clawback: number;
  renewal_impact: number;
  updated_at: string;
}

export interface RetailerMonthly {
  id: number;
  retailer_id: string;
  branch: string;
  month: string;
  ga_cnt: number;
  pi_l6: number;
  pi_g6: number;
  np_l6: number;
  np_g6: number;
  port_in: number;
  port_out: number;
  po_deduction: number;
  clawback: number;
  renewal_impact: number;
  total_ded: number;
  pi_raw: number;
  add_gara: number;
  pi_total: number;
  incentive: number;
  renewal_rate: number;
}

export interface ImportLog {
  id: number;
  filename: string;
  imported_by: string | null;
  rows_processed: number;
  rows_skipped: number;
  new_retailers: number;
  upd_retailers: number;
  new_months: string[];
  upd_months: string[];
  status: 'success' | 'partial' | 'failed';
  error_msg: string | null;
  imported_at: string;
}

export interface YearlyTotal {
  year: string;
  ga_cnt: number;
  pi_l6: number;
  pi_g6: number;
  np_l6: number;
  np_g6: number;
  port_in: number;
  port_out: number;
  po_deduction: number;
  clawback: number;
  renewal_impact: number;
  total_ded: number;
  pi_raw: number;
  add_gara: number;
  pi_total: number;
  incentive: number;
  renewal_rate: number;
  monthCount: number;
}

export interface CalendarOverlayPoint {
  monthNum: number;
  monthName: string;
  [year: string]: number | string;
}

export interface KPIData {
  id: string;
  branch: string;
  zone: string;
  month: string;
  year: number;
  ga: number; // Gross Ads
  ga_target: number;
  uao: number; // Unique Active Outlets
  uao_target: number;
  na: number; // New Outlets
  na_target: number;
  created_at: string;
  updated_at: string;
}

export interface KPIMonthly {
  month: string;
  year: number;
  ga: number;
  ga_target: number;
  uao: number;
  uao_target: number;
  na: number;
  na_target: number;
}

export interface KPIAnalysis {
  average: number;
  highest: number;
  lowest: number;
  percentageChange: number;
}
