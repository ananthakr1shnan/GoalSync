import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Activity, 
  RefreshCw, 
  AlertCircle, 
  BarChart2, 
  PieChart, 
  TrendingUp,
  Briefcase
} from 'lucide-react';

export default function Reports() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to aggregate system compliance reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Frontend aggregation
  const employees = users.filter(u => u.role === 'employee');
  const totalEmployeesCount = employees.length;

  const sheets = [];
  employees.forEach(emp => {
    if (emp.goal_sheets) {
      sheets.push(...emp.goal_sheets);
    }
  });

  const totalSheetsCount = sheets.length;
  const submittedCount = sheets.filter(s => s.status === 'submitted').length;
  const approvedCount = sheets.filter(s => s.status === 'approved' || s.status === 'locked').length;
  const draftCount = sheets.filter(s => s.status === 'draft').length;
  const returnedCount = sheets.filter(s => s.status === 'returned').length;

  const submissionRate = totalEmployeesCount > 0 
    ? Math.round(((submittedCount + approvedCount) / totalEmployeesCount) * 100) 
    : 0;

  const approvalRate = totalSheetsCount > 0 
    ? Math.round((approvedCount / totalSheetsCount) * 100) 
    : 0;

  // Breakdown by department
  const deptStats = {};
  employees.forEach(emp => {
    const dept = emp.department || 'Operations';
    if (!deptStats[dept]) {
      deptStats[dept] = { total: 0, created: 0, approved: 0 };
    }
    deptStats[dept].total += 1;
    const hasSheet = emp.goal_sheets && emp.goal_sheets.length > 0;
    if (hasSheet) {
      deptStats[dept].created += 1;
      const sheet = emp.goal_sheets[0];
      if (sheet.status === 'approved' || sheet.status === 'locked') {
        deptStats[dept].approved += 1;
      }
    }
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            System Compliance Reports
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Real-time compliance auditing, departmental progress aggregations, and cycle checklists.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-880 transition-all cursor-pointer"
          title="Refresh statistics"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-4 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Key Metrics Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat 1 */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</p>
                  <p className="text-3xl font-extrabold text-slate-200">{totalEmployeesCount}</p>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-2xl rounded-full" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Goal Sheets Cascaded</p>
                  <p className="text-3xl font-extrabold text-slate-200">{totalSheetsCount}</p>
                </div>
                <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submission Rate</p>
                  <p className="text-3xl font-extrabold text-emerald-400">{submissionRate}%</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approval Rate</p>
                  <p className="text-3xl font-extrabold text-indigo-400">{approvalRate}%</p>
                </div>
                <div className="p-3 bg-blue-500/10 text-indigo-400 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Department aggregations (Col-span 1) */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2 border-b border-slate-850 pb-3">
                <BarChart2 className="w-5 h-5 text-indigo-400" />
                <span>Departmental Breakdown</span>
              </h3>

              <div className="space-y-4">
                {Object.keys(deptStats).map(dept => {
                  const stats = deptStats[dept];
                  const createdPct = Math.round((stats.created / stats.total) * 100) || 0;
                  const approvedPct = Math.round((stats.approved / stats.total) * 100) || 0;

                  return (
                    <div key={dept} className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold text-slate-355">
                        <span className="text-slate-300">{dept}</span>
                        <span className="text-slate-500">{stats.created} / {stats.total} sheets</span>
                      </div>
                      
                      {/* Cascaded progress */}
                      <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${createdPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cycle Checklist Ledger (Col-span 2) */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2 border-b border-slate-850 pb-3">
                <Activity className="w-5 h-5 text-indigo-400" />
                <span>Audit Cycle Checklist</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-850">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Manager</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {employees.map(emp => {
                      const sheet = emp.goal_sheets && emp.goal_sheets[0];
                      const manager = users.find(m => m.id === emp.manager_id);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-850/10">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-250">{emp.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">{emp.department || 'Operations'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">{manager ? manager.name : '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                            {sheet ? (
                              <StatusBadge status={sheet.status} />
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-slate-950 text-slate-600 border border-slate-900">
                                Not Created
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
