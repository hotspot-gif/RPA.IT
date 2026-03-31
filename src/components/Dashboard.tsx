import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { RetailerSummary, RetailerMonthly } from '@/types';
import RetailerAnalysis from '@/components/RetailerAnalysis';
import TopRetailersView from '@/components/TopRetailersView';
import DataImport from '@/components/DataImport';
import UserManagement from '@/components/UserManagement';
import KPIAnalysis from '@/components/KPIAnalysis';
import {
  LayoutDashboard, Upload, LogOut, Search, User, Building2, Shield, FileDown, ChevronLeft, ChevronRight, Users, TrendingUp, Globe,
} from 'lucide-react';
import { generatePDF } from '@/utils/pdfExport';
import { ALL_BRANCHES, BRANCH_TO_ZONES, normalizeBranch, NORTH_REGION, SOUTH_REGION } from '@/data/mockData';

const VIEWS = { DASHBOARD: 'dashboard', KPI: 'kpi', IMPORT: 'import', USERS: 'users' } as const;
type View = (typeof VIEWS)[keyof typeof VIEWS];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [view, setView] = useState<View>(VIEWS.DASHBOARD);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [zones, setZones] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [retailers, setRetailers] = useState<RetailerSummary[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [retailerSearch, setRetailerSearch] = useState('');
  const [monthlyData, setMonthlyData] = useState<RetailerMonthly[]>([]);
  const [branchMonthlyData, setBranchMonthlyData] = useState<RetailerMonthly[]>([]);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [showRetailerDropdown, setShowRetailerDropdown] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // KPI-specific filters (independent from dashboard)
  const [kpiBranch, setKpiBranch] = useState('');
  const [kpiRegion, setKpiRegion] = useState('ITALY');
  const [kpiZone, setKpiZone] = useState('');
  const [kpiZones, setKpiZones] = useState<string[]>([]);
  const [kpiBranches, setKpiBranches] = useState<string[]>([]);

  // Determine available branches based on role
  useEffect(() => {
    if (!user) return;
    
    // Fetch branches that actually have retailers in the database
    supabase
      .from('retailer_summary')
      .select('branch', { count: 'exact' })
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) {
          console.error('Error fetching branches:', error);
          return;
        }
        
        if (data) {
          // Get unique branches from database
          const uniqueBranches = [...new Set(data.map((r: any) => r.branch))];
          
          // Filter based on user role
          let availableBranches: string[] = [];
          if (user.role === 'HS-ADMIN') {
            // Admin can see all standard branches.
            availableBranches = ALL_BRANCHES;
          } else if (user.role === 'RSM') {
            // RSM sees up to 4 assigned branches
            const userBranches = (user.branches || []).map(normalizeBranch);
            availableBranches = userBranches.filter((b: string) => ALL_BRANCHES.includes(b)).slice(0, 4);
          } else if (user.role === 'ASM') {
            // ASM sees only 1 assigned branch
            const userBranches = (user.branches || []).map(normalizeBranch);
            availableBranches = userBranches.filter((b: string) => ALL_BRANCHES.includes(b)).slice(0, 1);
          } else {
            // Other roles only see assigned branches that are present in retailer data
            const userBranches = (user.branches || []).map(normalizeBranch);
            availableBranches = (uniqueBranches as string[])
              .filter((b: string) => ALL_BRANCHES.includes(b))
              .filter((b: string) => userBranches.includes(normalizeBranch(b)));
          }
          
          setBranches(availableBranches);
          if (availableBranches.length > 0 && !selectedBranch) {
            setSelectedBranch(availableBranches[0]);
          }
          // Initialize KPI branch to first available
          if (availableBranches.length > 0 && !kpiBranch) {
            setKpiBranch(availableBranches[0]);
          }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch available KPI branches from kpi_data table
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from('kpi_data')
      .select('branch', { count: 'exact' })
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) {
          console.error('ERROR fetching KPI branches:', error.message, error);
          return;
        }
        
        if (data && data.length > 0) {
          // Get unique branches from kpi_data
          const uniqueKpiBranches = [...new Set(data.map((r: any) => r.branch))];
          
          // Filter based on user role and region
          let availableKpiBranches: string[] = [];
          if (user.role === 'HS-ADMIN') {
            availableKpiBranches = (uniqueKpiBranches as string[]);
          } else {
            const userBranches = (user.branches || []).map(normalizeBranch);
            availableKpiBranches = (uniqueKpiBranches as string[])
              .filter((b: string) => userBranches.includes(normalizeBranch(b)));
          }

          // If kpiRegion is selected, filter the branch list further
          if (kpiRegion === 'NORTH') {
            availableKpiBranches = availableKpiBranches.filter(b => NORTH_REGION.includes(normalizeBranch(b)));
          } else if (kpiRegion === 'SOUTH') {
            availableKpiBranches = availableKpiBranches.filter(b => SOUTH_REGION.includes(normalizeBranch(b)));
          }
          
          setKpiBranches(availableKpiBranches);
          
          // If the current kpiBranch is not in the filtered list, reset it
          if (kpiBranch && !availableKpiBranches.includes(kpiBranch)) {
            setKpiBranch('');
          }
          
          // Default region logic for ASM/RSM - open with region results
          if (user.role !== 'HS-ADMIN') {
             const userBranch = user.branches?.[0] ? normalizeBranch(user.branches[0]) : '';
             let newRegion = 'ITALY';
             if (NORTH_REGION.includes(userBranch)) newRegion = 'NORTH';
             else if (SOUTH_REGION.includes(userBranch)) newRegion = 'SOUTH';
             
             if (newRegion !== kpiRegion) {
               setKpiRegion(newRegion);
               setKpiBranch(''); // Show all branches in that region by default
             }
          }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, kpiRegion]);

  // Update zones when branch changes (and keep no-zone selected on login to show branch-level performance)
  useEffect(() => {
    if (!selectedBranch) {
      setZones([]);
      setSelectedZone('');
      return;
    }

    // First try the hardcoded mapping for known branches
    if (BRANCH_TO_ZONES[selectedBranch]) {
      const branchZones = BRANCH_TO_ZONES[selectedBranch];
      setZones(branchZones);
      setSelectedZone('');
      return;
    }

    // If not in hardcoded mapping, fetch zones from database for this branch
    setLoadingRetailers(true);
    supabase
      .from('retailer_summary')
      .select('zone')
      .eq('branch', selectedBranch)
      .limit(15000)
      .then(({ data, error }) => {
        if (!error && data) {
          // Get unique zones including shop closed for selection
          const uniqueZones = [...new Set(data.map((r: any) => r.zone))];
          setZones(uniqueZones);
          setSelectedZone('');
        }
        setLoadingRetailers(false);
      });
  }, [selectedBranch]);

  // Update KPI zones when KPI branch changes
  useEffect(() => {
    if (!kpiBranch) {
      setKpiZones([]);
      setKpiZone('');
      return;
    }

    // First try the hardcoded mapping for known branches
    if (BRANCH_TO_ZONES[kpiBranch]) {
      const branchZones = BRANCH_TO_ZONES[kpiBranch].filter(z => !z.toLowerCase().includes('shop closed'));
      setKpiZones(branchZones);
      setKpiZone('');
      return;
    }

    // If not in hardcoded mapping, fetch zones from kpi_data table for this branch
    supabase
      .from('kpi_data')
      .select('zone')
      .eq('branch', kpiBranch)
      .limit(5000)
      .then(({ data, error }) => {
        if (!error && data) {
          // Get unique zones from kpi_data, excluding shop closed
          const uniqueZones = [...new Set(data.map((r: any) => r.zone))]
            .filter(z => !z.toLowerCase().includes('shop closed'));
          setKpiZones(uniqueZones);
          setKpiZone('');
        }
      });
  }, [kpiBranch]);

  // Fetch retailers when branch or zone changes
  const fetchRetailers = useCallback(async () => {
    if (!selectedBranch) return;
    setLoadingRetailers(true);

    const query = supabase.from('retailer_summary').select('*').eq('branch', selectedBranch);
    if (selectedZone) query.eq('zone', selectedZone);

    // Check up to 15000 rows to ensure we capture all active retailers
    const { data, error } = await query.order('retailer_id').limit(15000);
    if (!error && data) {
      let filtered = data as RetailerSummary[];
      // If no specific zone selected, show only active (exclude shop closed)
      if (!selectedZone) {
        filtered = filtered.filter(r => !r.zone.toLowerCase().includes('shop closed'));
      }
      // Remove duplicates by retailer_id to ensure accurate count
      const uniqueRetailers = Array.from(new Map(filtered.map(r => [r.retailer_id, r])).values());
      setRetailers(uniqueRetailers);
    }
    setLoadingRetailers(false);
  }, [selectedBranch, selectedZone]);

  useEffect(() => {
    fetchRetailers();
    setSelectedRetailerId('');
    setRetailerSearch('');
    setMonthlyData([]);
  }, [fetchRetailers]);

  // Fetch monthly data when retailer changes
  useEffect(() => {
    if (!selectedRetailerId) { setMonthlyData([]); return; }
    setLoadingMonthly(true);
    supabase
      .from('retailer_monthly')
      .select('*')
      .eq('retailer_id', selectedRetailerId)
      .order('month')
      .limit(10000)
      .then(({ data, error }: { data: any; error: any }) => {
        if (!error && data) setMonthlyData(data as RetailerMonthly[]);
        setLoadingMonthly(false);
      });
  }, [selectedRetailerId]);

  // Fetch branch-level monthly data when branch or zone changes
  useEffect(() => {
    if (!selectedBranch) { setBranchMonthlyData([]); return; }

    const query = supabase.from('retailer_monthly').select('*').eq('branch', selectedBranch);
    if (selectedZone) query.eq('zone', selectedZone);

    // Fetch up to 100000 monthly records to ensure all historical data is captured
    query.order('month').limit(100000).then(({ data, error }: { data: any; error: any }) => {
      if (!error && data) setBranchMonthlyData(data as RetailerMonthly[]);
    });
  }, [selectedBranch, selectedZone]);

  const selectedSummary = retailers.find((r: RetailerSummary) => r.retailer_id === selectedRetailerId);
  const filteredRetailers = retailers.filter((r: RetailerSummary) =>
    r.retailer_id.toLowerCase().includes(retailerSearch.toLowerCase())
  );

  const handleExportPDF = async () => {
    if (!selectedSummary || monthlyData.length === 0 || !user) return;
    setExportingPdf(true);
    setPdfProgress(0);
    try {
      setPdfProgress(25);
      await generatePDF(selectedSummary, monthlyData, user, setPdfProgress);
      setPdfProgress(100);
    } catch (e) {
      console.error('PDF export failed:', e);
    }
    setExportingPdf(false);
    setPdfProgress(0);
  };

  const roleLabel = user?.role === 'HS-ADMIN' ? 'Admin' : user?.role === 'RSM' ? 'Regional Manager' : 'Area Manager';
  const roleBadgeColor = user?.role === 'HS-ADMIN' ? 'bg-[#46286E]' : user?.role === 'RSM' ? 'bg-[#006AE0]' : 'bg-[#08DC7D]';

  return (
    <div className="flex h-screen bg-[#fff7f2] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-[72px]' : 'w-64'} bg-[#21264E] text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-center gap-3">
          <img
            src="https://cms-assets.ldsvcplatform.com/IT/s3fs-public/2023-09/MicrosoftTeams-image%20%2813%29.png"
            alt="Logo"
            className={`flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'h-8 w-8' : 'h-10 w-10'}`}
          />
          {!sidebarCollapsed && <span className="font-bold text-sm leading-tight">Retailer<br/>Analytics</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setView(VIEWS.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              view === VIEWS.DASHBOARD ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutDashboard size={20} />
            {!sidebarCollapsed && 'Dashboard'}
          </button>
          <button
            onClick={() => setView(VIEWS.KPI)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              view === VIEWS.KPI ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <TrendingUp size={20} />
            {!sidebarCollapsed && 'KPI'}
          </button>
          {user?.role === 'HS-ADMIN' && (
            <button
              onClick={() => setView(VIEWS.IMPORT)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                view === VIEWS.IMPORT ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Upload size={20} />
              {!sidebarCollapsed && 'Data Import'}
            </button>
          )}
          {user?.role === 'HS-ADMIN' && (
            <button
              onClick={() => setView(VIEWS.USERS)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                view === VIEWS.USERS ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users size={20} />
              {!sidebarCollapsed && 'User Management'}
            </button>
          )}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          {!sidebarCollapsed && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.full_name}</p>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${roleBadgeColor} text-white mt-0.5`}>
                    {roleLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-white/50 text-xs mb-3">
                <Building2 size={12} />
                <span className="truncate">{user?.branches?.join(', ')}</span>
              </div>
            </>
          )}
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <LogOut size={16} />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2.5 text-white/40 hover:text-white text-center border-t border-white/10 flex items-center justify-center"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        {(view === VIEWS.DASHBOARD || view === VIEWS.KPI) && (
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-2 md:gap-4 flex-shrink-0">
            {/* DASHBOARD - Branch selector */}
            {view === VIEWS.DASHBOARD && (
              <div className="flex flex-1 min-w-[180px] max-w-[220px] items-center gap-2">
                <Shield size={16} className="text-[#21264E]" />
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#21264E] focus:ring-2 focus:ring-[#245bc1] outline-none"
                >
                  {branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            {/* KPI - Branch selector (independent, from kpi_data table) */}
            {view === VIEWS.KPI && (
              <div className="flex items-center gap-4">
                {/* Region filter */}
                <div className="flex items-center gap-2 min-w-[140px]">
                  <Globe size={16} className="text-[#21264E]" />
                  <select
                    value={kpiRegion}
                    onChange={e => setKpiRegion(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#21264E] focus:ring-2 focus:ring-[#245bc1] outline-none"
                  >
                    {user?.role === 'HS-ADMIN' ? (
                      <>
                        <option value="ITALY">ITALY (All)</option>
                        <option value="NORTH">NORTH</option>
                        <option value="SOUTH">SOUTH</option>
                      </>
                    ) : (
                      <option value={kpiRegion}>{kpiRegion}</option>
                    )}
                  </select>
                </div>

                {/* Branch selector */}
                <div className="flex items-center gap-2 min-w-[180px] max-w-[220px]">
                  <Shield size={16} className="text-[#21264E]" />
                  <select
                    value={kpiBranch}
                    onChange={e => setKpiBranch(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#21264E] focus:ring-2 focus:ring-[#245bc1] outline-none"
                  >
                    <option value="">{kpiRegion === 'ITALY' ? 'All Branches' : `All ${kpiRegion} Branches`}</option>
                    {kpiBranches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* DASHBOARD - Zone selector */}
            {view === VIEWS.DASHBOARD && (
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-[#21264E]" />
                <select
                  value={selectedZone}
                  onChange={e => setSelectedZone(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#21264E] focus:ring-2 focus:ring-[#245bc1] outline-none"
                >
                  <option value="">All Zones</option>
                  {zones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            )}

            {/* KPI - Zone selector (independent) */}
            {view === VIEWS.KPI && (
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-[#21264E]" />
                <select
                  value={kpiZone}
                  onChange={e => setKpiZone(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#21264E] focus:ring-2 focus:ring-[#245bc1] outline-none"
                >
                  <option value="">All Zones</option>
                  {kpiZones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Retailer selector - only show for DASHBOARD */}
            {view === VIEWS.DASHBOARD && (
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={retailerSearch}
                  onChange={e => { setRetailerSearch(e.target.value); setShowRetailerDropdown(true); }}
                  onFocus={() => setShowRetailerDropdown(true)}
                  placeholder={loadingRetailers ? 'Loading retailers...' : `Search retailers in ${selectedBranch}...`}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg text-[#21264E] placeholder:text-gray-400 focus:ring-2 focus:ring-[#245bc1] outline-none"
                />
                {showRetailerDropdown && filteredRetailers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                    {filteredRetailers.map(r => (
                      <button
                        key={r.retailer_id}
                        onClick={() => {
                          setSelectedRetailerId(r.retailer_id);
                          setRetailerSearch(r.retailer_id);
                          setShowRetailerDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fff7f2] transition flex items-center justify-between ${
                          r.retailer_id === selectedRetailerId ? 'bg-[#fff7f2] font-medium' : ''
                        }`}
                      >
                        <span className="text-[#21264E]">{r.retailer_id}</span>
                        <span className="text-xs text-gray-400">{r.zone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected retailer info - only show for DASHBOARD */}
            {view === VIEWS.DASHBOARD && selectedSummary && (
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-[#21264E] text-white px-3 py-1 rounded-full text-xs font-medium" title={selectedSummary.retailer_id}>
                  {selectedSummary.retailer_id}
                </span>
                <span className="text-gray-500">{selectedSummary.zone}</span>
                <span className={`text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded ${selectedSummary.zone.toLowerCase().includes('shop closed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {selectedSummary.zone.toLowerCase().includes('shop closed') ? 'Inactive' : 'Active'}
                </span>
              </div>
            )}

            {/* PDF Export - only show for DASHBOARD */}
            {view === VIEWS.DASHBOARD && selectedSummary && monthlyData.length > 0 && (
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf}
                className="flex items-center gap-2 px-4 py-2 bg-[#21264E] hover:bg-[#245bc1] text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                <FileDown size={16} />
                {exportingPdf ? `Exporting... ${pdfProgress}%` : 'Export PDF'}
                {exportingPdf && (
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-300" style={{ width: `${pdfProgress}%` }} />
                  </div>
                )}
              </button>
            )}
          </header>
        )}

        {/* Click-away listener for dropdown */}
        {showRetailerDropdown && (
          <div className="fixed inset-0 z-40" onClick={() => setShowRetailerDropdown(false)} />
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {view === VIEWS.USERS && user?.role === 'HS-ADMIN' ? (
            <UserManagement />
          ) : view === VIEWS.IMPORT && user?.role === 'HS-ADMIN' ? (
            <DataImport user={user} />
          ) : view === VIEWS.KPI ? (
            <KPIAnalysis user={user} branch={kpiBranch} zone={kpiZone} region={kpiRegion} />
          ) : !selectedRetailerId ? (
            <TopRetailersView 
              retailers={retailers}
              branch={selectedBranch}
              loading={loadingRetailers}
              branchMonthlyData={branchMonthlyData}
              selectedZone={selectedZone}
            />
          ) : loadingMonthly ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-[#21264E]">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading retailer data...
              </div>
            </div>
          ) : selectedSummary ? (
            <RetailerAnalysis
              summary={selectedSummary}
              monthlyData={monthlyData}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
