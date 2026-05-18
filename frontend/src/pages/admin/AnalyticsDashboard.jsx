import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Award, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, BarChart2, Zap
} from 'lucide-react';

export default function AnalyticsDashboard() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggerLoading, setTriggerLoading] = useState(false);

  // Endpoint specific states
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [trends, setTrends] = useState([]);
  // heatmapData: { [deptName]: { Q1: pct, Q2: pct, Q3: pct, Q4: pct } }
  const [heatmapData, setHeatmapData] = useState({});

  // Fetch performance cycles on mount
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const res = await api.get('/admin/cycles');
        setCycles(res.data);
        const active = res.data.find(c => c.is_active);
        if (active) {
          setSelectedCycleId(active.id);
        } else if (res.data.length > 0) {
          setSelectedCycleId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch performance cycles.');
      }
    };
    fetchCycles();
  }, []);

  // Fetch all analytics data once a cycle is selected
  const fetchAnalyticsData = async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    setError('');
    try {
      const [overRes, distRes, thrustRes, deptRes, trendRes, deptQ1, deptQ2, deptQ3, deptQ4] = await Promise.all([
        api.get(`/analytics/overview?cycle_id=${selectedCycleId}`),
        api.get(`/analytics/progress-distribution?cycle_id=${selectedCycleId}&quarter=${selectedQuarter}`),
        api.get(`/analytics/thrust-area-breakdown?cycle_id=${selectedCycleId}`),
        api.get(`/analytics/department-comparison?cycle_id=${selectedCycleId}&quarter=${selectedQuarter}`),
        api.get(`/analytics/trend?cycle_id=${selectedCycleId}`),
        // Fetch all 4 quarters for the heatmap
        api.get(`/analytics/department-comparison?cycle_id=${selectedCycleId}&quarter=Q1`),
        api.get(`/analytics/department-comparison?cycle_id=${selectedCycleId}&quarter=Q2`),
        api.get(`/analytics/department-comparison?cycle_id=${selectedCycleId}&quarter=Q3`),
        api.get(`/analytics/department-comparison?cycle_id=${selectedCycleId}&quarter=Q4`),
      ]);

      setOverview(overRes.data);
      setDistribution(distRes.data);
      setThrustAreas(thrustRes.data);
      setDepartments(deptRes.data);
      setTrends(trendRes.data);

      // Build heatmap lookup: { deptName: { Q1: pct, Q2: pct, Q3: pct, Q4: pct } }
      const hmap = {};
      const quarterData = { Q1: deptQ1.data, Q2: deptQ2.data, Q3: deptQ3.data, Q4: deptQ4.data };
      for (const [q, rows] of Object.entries(quarterData)) {
        for (const row of rows) {
          if (!hmap[row.department]) hmap[row.department] = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
          hmap[row.department][q] = row.checkin_completion_pct;
        }
      }
      setHeatmapData(hmap);
    } catch (err) {
      console.error(err);
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedCycleId, selectedQuarter]);

  // Handler to manually trigger overdue checking & email dispatch
  const handleTriggerEscalation = async () => {
    setTriggerLoading(true);
    try {
      await api.post('/admin/escalation/trigger-now');
      alert('Escalation rules & notification engine successfully triggered!');
      fetchAnalyticsData();
    } catch (err) {
      console.error(err);
      alert('Failed to trigger escalation job manually.');
    } finally {
      setTriggerLoading(false);
    }
  };

  // Safe color scale helper for scores
  const getBadgeColor = (val) => {
    if (val >= 80) return 'bg-green-500/10 text-green-400 border border-green-500/20';
    if (val >= 50) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-red-500/10 text-red-400 border border-red-500/20';
  };

  // Safe background color class for heatmap cells
  const getHeatmapColor = (pct) => {
    if (pct >= 80) return 'bg-green-950/45 text-green-300 border-green-500/10';
    if (pct >= 50) return 'bg-amber-950/45 text-amber-300 border-amber-500/10';
    return 'bg-red-950/45 text-red-300 border-red-500/10';
  };

  if (!selectedCycleId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-500" />
        <h3 className="text-xl font-bold text-slate-350">No Performance Cycles Found</h3>
        <p className="text-slate-500 text-sm max-w-sm">Please define at least one performance cycle in the Cycle Manager page first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Enterprise Analytics Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Real-time compliance tracking, performance distribution, and strategic objective dashboards.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Cycle Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cycle:</span>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="py-2 px-3 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold cursor-pointer"
            >
              {cycles.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.is_active ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Quarter Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quarter:</span>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="py-2 px-3 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold cursor-pointer"
            >
              <option value="Q1">Q1 Review</option>
              <option value="Q2">Q2 Review</option>
              <option value="Q3">Q3 Review</option>
              <option value="Q4">Q4 Review</option>
            </select>
          </div>

          <button
            onClick={fetchAnalyticsData}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-all cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleTriggerEscalation}
            disabled={triggerLoading}
            className="flex items-center space-x-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{triggerLoading ? 'Triggering...' : 'Trigger Emails'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-40">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Section 1 - KPI Cards Row */}
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Employees */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 flex items-center space-x-4">
                <div className="p-3.5 bg-indigo-600/10 text-indigo-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</p>
                  <p className="text-2xl font-bold text-slate-200 mt-1">{overview.total_employees}</p>
                </div>
              </div>

              {/* Goal-Setting Approval Rate */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 flex items-center space-x-4">
                <div className="p-3.5 bg-green-500/10 text-green-400 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approval Rate</p>
                  <p className="text-2xl font-bold text-slate-200 mt-1">
                    {overview.total_employees > 0
                      ? `${round((overview.sheets_approved / overview.total_employees) * 100, 1)}%`
                      : '0.0%'}
                  </p>
                </div>
              </div>

              {/* Average Progress Score */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 flex items-center space-x-4">
                <div className="p-3.5 bg-pink-500/10 text-pink-400 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Progress Score</p>
                  <p className="text-2xl font-bold text-slate-200 mt-1">{overview.avg_progress_score}%</p>
                </div>
              </div>

              {/* Overall Check-in Completion */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 flex items-center space-x-4">
                <div className="p-3.5 bg-teal-500/10 text-teal-400 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{selectedQuarter} Check-in Completion</p>
                  <p className="text-2xl font-bold text-slate-200 mt-1">
                    {overview.completion_by_quarter[selectedQuarter]?.pct || 0}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2 - Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trend Chart */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Progress Trend by Quarter</span>
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="quarter" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="avg_progress" name="Avg Progress (%)" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-pink-400" />
                <span>Employee Progress Distribution</span>
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="range" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="count" name="Employee Count" fill="#ec4899" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Section 3 - Vertical Breakdown Chart & Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Thrust Area performance */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 lg:col-span-1 space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Goal Performance by Thrust Area</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={thrustAreas} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <YAxis dataKey="thrust_area" type="category" stroke="#64748b" fontSize={10} width={70} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="avg_progress" name="Avg Progress" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Check-in Completion Heatmap */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Check-in Completion Heatmap</h3>
              <div className="overflow-x-auto border border-slate-850 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="p-4 font-bold">Department</th>
                      <th className="p-4 text-center">Q1</th>
                      <th className="p-4 text-center">Q2</th>
                      <th className="p-4 text-center">Q3</th>
                      <th className="p-4 text-center">Q4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept, idx) => {
                      const row = heatmapData[dept.department] || { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
                      return (
                        <tr key={idx} className="border-b border-slate-850/60 hover:bg-slate-900/20 transition-colors">
                          <td className="p-4 font-semibold text-slate-350">{dept.department}</td>
                          <td className={`p-4 text-center border-l ${getHeatmapColor(row.Q1)}`}>{row.Q1}%</td>
                          <td className={`p-4 text-center border-l ${getHeatmapColor(row.Q2)}`}>{row.Q2}%</td>
                          <td className={`p-4 text-center border-l ${getHeatmapColor(row.Q3)}`}>{row.Q3}%</td>
                          <td className={`p-4 text-center border-l ${getHeatmapColor(row.Q4)}`}>{row.Q4}%</td>
                        </tr>
                      );
                    })}
                    {departments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">No departments statistics available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 4 - Department Comparison Table */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-200">Department Performance Benchmarks ({selectedQuarter})</h3>
            <div className="overflow-x-auto border border-slate-850 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Department</th>
                    <th className="p-4 text-center">Employee Count</th>
                    <th className="p-4 text-center">Avg Progress Score</th>
                    <th className="p-4 text-center">Check-in Completion</th>
                    <th className="p-4 text-center">Health Status</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, idx) => (
                    <tr key={idx} className="border-b border-slate-850/60 hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 font-semibold text-slate-350">{dept.department}</td>
                      <td className="p-4 text-center text-slate-400 font-semibold">{dept.employee_count}</td>
                      <td className="p-4 text-center text-slate-300 font-bold">{dept.avg_progress}%</td>
                      <td className="p-4 text-center text-slate-300 font-bold">{dept.checkin_completion_pct}%</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getBadgeColor(dept.avg_progress)}`}>
                          {dept.avg_progress >= 80 ? 'Healthy' : dept.avg_progress >= 50 ? 'Lagging' : 'Critical'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">No department benchmarks compiled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Decimal round helper
function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}
