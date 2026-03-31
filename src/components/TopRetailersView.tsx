import { RetailerSummary, RetailerMonthly } from '@/types';
import { TrendingUp, DollarSign, PhoneForwarded, Activity } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface TopRetailersViewProps {
  retailers: RetailerSummary[];
  branch: string;
  loading: boolean;
  branchMonthlyData?: RetailerMonthly[];
  selectedZone?: string;
}

export default function TopRetailersView({ retailers, branch, loading, branchMonthlyData, selectedZone }: TopRetailersViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-[#21264E]">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading retailers data...
        </div>
      </div>
    );
  }

  if (!retailers || retailers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">No retailers available in {branch}</p>
        </div>
      </div>
    );
  }

  // Get top retailers by different criteria, excluding those with 0 for the metric
  const topByGA = [...retailers]
    .filter(r => r.ga_cnt > 0)
    .sort((a, b) => b.ga_cnt - a.ga_cnt)
    .slice(0, 5);

  const topByPortIn = [...retailers]
    .filter(r => r.port_in > 0)
    .sort((a, b) => b.port_in - a.port_in)
    .slice(0, 5);

  const topByIncentive = [...retailers]
    .filter(r => r.incentive > 0)
    .sort((a, b) => b.incentive - a.incentive)
    .slice(0, 5);

  const topByRenewalRate = [...retailers]
    .filter(r => r.renewal_rate > 0)
    .sort((a, b) => b.renewal_rate - a.renewal_rate)
    .slice(0, 5);

  // Chart data
  const gaChartData = topByGA.map(r => ({ id: r.retailer_id, name: r.retailer_id.slice(-4), value: r.ga_cnt, zone: r.zone }));
  const portInChartData = topByPortIn.map(r => ({ id: r.retailer_id, name: r.retailer_id.slice(-4), value: r.port_in, zone: r.zone }));
  const incentiveChartData = topByIncentive.map(r => ({ id: r.retailer_id, name: r.retailer_id.slice(-4), value: Math.round(r.incentive), zone: r.zone }));
  const renewalChartData = topByRenewalRate.map(r => ({ id: r.retailer_id, name: r.retailer_id.slice(-4), value: parseFloat(r.renewal_rate.toFixed(1)), zone: r.zone }));

  const fullRetailerTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 text-xs p-2 rounded shadow">
        <p className="font-semibold text-[#21264E]">{point.id}</p>
        <p>{label}</p>
        <p>{payload[0].name}: {payload[0].value?.toLocaleString('en-IE')}</p>
      </div>
    );
  };

  const filteredRetailers = selectedZone ? retailers.filter(r => r.zone === selectedZone) : retailers;
  const zoneRetailerIds = new Set(filteredRetailers.map(r => r.retailer_id));

  const branchMonthly = (branchMonthlyData || [])
    .filter(m => !selectedZone || zoneRetailerIds.has(m.retailer_id))
    .reduce((acc, m) => {
      const key = m.month;
      if (!acc[key]) acc[key] = { month: key, ga_cnt: 0, port_in: 0, count: 0 };
      acc[key].ga_cnt += m.ga_cnt;
      acc[key].port_in += m.port_in;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { month: string; ga_cnt: number; port_in: number; count: number }>);

  const aggregatedMonthly = Object.values(branchMonthly).sort((a, b) => a.month.localeCompare(b.month));
  const moMData = aggregatedMonthly.map((m, idx, arr) => ({
    month: m.month,
    ga_cnt: m.ga_cnt,
    port_in: m.port_in,
    ga_mom: idx === 0 ? 0 : m.ga_cnt - arr[idx - 1].ga_cnt,
    port_in_mom: idx === 0 ? 0 : m.port_in - arr[idx - 1].port_in,
  }));

  const totalGa = aggregatedMonthly.length > 0 ? aggregatedMonthly.reduce((sum, m) => sum + m.ga_cnt, 0) : 0;
  const totalMonthlyPortIn = aggregatedMonthly.length > 0 ? aggregatedMonthly.reduce((sum, m) => sum + m.port_in, 0) : 0;

  // Summary statistics - use only active retailers for performance overview (unless viewing shop closed zone)
  const activeOnlyRetailers = !selectedZone ? retailers : retailers.filter(r => !r.zone.toLowerCase().includes('shop closed'));
  const displayedRetailers = activeOnlyRetailers.length;
  const totalGA = activeOnlyRetailers.reduce((sum, r) => sum + r.ga_cnt, 0);
  const totalIncentive = activeOnlyRetailers.reduce((sum, r) => sum + r.incentive, 0);
  const totalPortIn = activeOnlyRetailers.reduce((sum, r) => sum + r.port_in, 0);
  const totalDeductions = activeOnlyRetailers.reduce((sum, r) => sum + r.total_deductions, 0);
  const avgRenewalRate = activeOnlyRetailers.length > 0 ? activeOnlyRetailers.reduce((sum, r) => sum + r.renewal_rate, 0) / activeOnlyRetailers.length : 0;
  const activeRetailers = activeOnlyRetailers.filter(r => !r.zone.toLowerCase().includes('shop closed')).length;

  const COLORS = ['#006AE0', '#08DC7D', '#FFC8B2', '#FFD54F', '#00D7FF'];

  const StatCard = ({ 
    icon: Icon, 
    title, 
    retailers: data, 
    formatter 
  }: { 
    icon: any; 
    title: string; 
    retailers: RetailerSummary[]; 
    formatter: (v: number) => string;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-[#245bc1]" />
        <h3 className="font-semibold text-sm text-[#21264E]">{title}</h3>
      </div>
      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((r, idx) => (
            <div key={r.retailer_id} className="flex items-center justify-between pb-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{backgroundColor: COLORS[idx], color: idx < 2 ? 'white' : 'black'}}>
                  #{idx + 1}
                </span>
                <div>
                  <p className="text-xs font-medium text-[#21264E]" title={r.retailer_id}>{r.retailer_id}</p>
                  <p className="text-xs text-gray-500">{r.zone}</p>
                  <p className={`text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded ${r.zone.toLowerCase().includes('shop closed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {r.zone.toLowerCase().includes('shop closed') ? 'Inactive' : 'Active'}
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-[#245bc1]">{formatter(
                title.includes('GA') ? r.ga_cnt :
                title.includes('Port-In') ? r.port_in :
                title.includes('Paid') ? r.incentive :
                r.renewal_rate
              )}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-500">No data available</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 overflow-y-auto bg-[#fff7f2]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#21264E] mb-2">Retailer Performance Overview</h1>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <p className="text-gray-600">Branch: <span className="font-semibold text-[#21264E]">{branch}</span></p>
          <div className="flex gap-4 text-sm flex-wrap">
            <div>
              <span className="text-gray-600">{selectedZone ? 'Zone' : 'Branch'} Retailers: </span>
              <span className="font-semibold text-[#245bc1]">{displayedRetailers}</span>
            </div>
            <div>
              <span className="text-gray-600">Total GA: </span>
              <span className="font-semibold text-[#245bc1]">{totalGA.toLocaleString('en-IE')}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Incentive: </span>
              <span className="font-semibold text-[#245bc1]">€{totalIncentive.toLocaleString('en-IE', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {aggregatedMonthly.length > 0 && (
          <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-[#21264E]">{selectedZone ? 'Zone' : 'Branch'} Monthly GA & Port-In Trends (aggregated)</p>
            <div className="text-xs text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {selectedZone ? (
                <>
                  <div>Avg GA: <span className="font-bold text-[#245bc1]">{aggregatedMonthly.length > 0 ? (totalGa / aggregatedMonthly.length).toFixed(0) : 0}</span></div>
                  <div>Avg Port-In: <span className="font-bold text-[#06b6d4]">{aggregatedMonthly.length > 0 ? (totalMonthlyPortIn / aggregatedMonthly.length).toFixed(0) : 0}</span></div>
                </>
              ) : (
                <>
                  <div>Total GA: <span className="font-bold text-[#245bc1]">{totalGa}</span></div>
                  <div>Total Port-In: <span className="font-bold text-[#06b6d4]">{totalMonthlyPortIn}</span></div>
                </>
              )}
              <div>Latest GA: <span className="font-bold">{aggregatedMonthly[aggregatedMonthly.length -1].ga_cnt}</span></div>
              <div>Latest Port-In: <span className="font-bold">{aggregatedMonthly[aggregatedMonthly.length -1].port_in}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Main KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Incentive', value: `€${totalIncentive.toLocaleString('en-IE', { maximumFractionDigits: 0 })}`, color: '#006AE0' },
          { label: 'Total GA Activations', value: totalGA.toLocaleString('en-IE'), color: '#08DC7D' },
          { label: 'Total Port-In', value: totalPortIn.toLocaleString('en-IE'), color: '#00D7FF' },
          { label: 'Avg Renewal Rate', value: `${avgRenewalRate.toFixed(1)}%`, color: '#FFD54F' },
          { label: 'Total Deductions', value: `€${totalDeductions.toLocaleString('en-IE', { maximumFractionDigits: 0 })}`, color: '#F04438' },
          { label: 'Active Retailers', value: activeRetailers.toString(), color: '#08DC7D' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: kpi.color }} />
            <p className="text-xs text-gray-500 mb-1 pl-2">{kpi.label}</p>
            <p className="text-lg font-bold pl-2" style={{ color: kpi.color === '#F04438' ? '#F04438' : '#21264E' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* GA Activations Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#245bc1]" />
            <h3 className="font-semibold text-[#21264E]">Top GA Activations</h3>
          </div>
          {gaChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gaChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip content={<fullRetailerTooltip />} />
                <Bar dataKey="value" fill="#245bc1" radius={[8, 8, 0, 0]}>
                  {gaChartData.map((entry, idx) => (
                    <Cell key={`cell-ga-${idx}`} fill={idx === 0 ? '#245bc1' : '#06b6d4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>

        {/* Port-In Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <PhoneForwarded size={18} className="text-[#245bc1]" />
            <h3 className="font-semibold text-[#21264E]">Top Port-In Activations</h3>
          </div>
          {portInChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={portInChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip content={<fullRetailerTooltip />} />
                <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>

        {/* Incentive Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-[#245bc1]" />
            <h3 className="font-semibold text-[#21264E]">Top Incentive Paid</h3>
          </div>
          {incentiveChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={incentiveChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: €${value.toLocaleString('en-IE')}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incentiveChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<fullRetailerTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>

        {/* Renewal Rate Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-[#245bc1]" />
            <h3 className="font-semibold text-[#21264E]">Best Renewal Rate</h3>
          </div>
          {renewalChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={renewalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<fullRetailerTooltip />} />
                <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>
      </div>

      {moMData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-[#245bc1]" />
              <h3 className="font-semibold text-[#21264E]">Month-on-Month GA Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moMData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => value.toLocaleString('en-IE')} />
                <Line type="monotone" dataKey="ga_cnt" stroke="#245bc1" strokeWidth={2} dot={{ fill: '#245bc1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <PhoneForwarded size={18} className="text-[#06b6d4]" />
              <h3 className="font-semibold text-[#21264E]">Month-on-Month Port-In Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moMData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => value.toLocaleString('en-IE')} />
                <Line type="monotone" dataKey="port_in" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Rankings */}
      <h2 className="text-xl font-bold text-[#21264E] mb-4">Detailed Rankings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          icon={TrendingUp}
          title="Top GA Activations"
          retailers={topByGA}
          formatter={(v) => v.toLocaleString('en-IE')}
        />
        <StatCard
          icon={PhoneForwarded}
          title="Top Port-In Activations"
          retailers={topByPortIn}
          formatter={(v) => v.toLocaleString('en-IE')}
        />
        <StatCard
          icon={DollarSign}
          title="Highest Paid (Incentive)"
          retailers={topByIncentive}
          formatter={(v) => `€${v.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <StatCard
          icon={Activity}
          title="Best Renewal Rate"
          retailers={topByRenewalRate}
          formatter={(v) => `${v.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}
