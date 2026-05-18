import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { 
  Users, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  ShieldAlert, 
  Calendar,
  FileCheck,
  CheckSquare
} from 'lucide-react';

export default function TeamDashboard() {
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamRes, cycleRes] = await Promise.all([
        api.get('/manager/team'),
        api.get('/cycles/active').catch(() => ({ data: null }))
      ]);
      setTeam(teamRes.data);
      setActiveCycle(cycleRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load team dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getActiveSheet = (employee) => {
    if (!employee || !employee.goal_sheets) return null;
    return employee.goal_sheets.find(s => s.cycle_id === activeCycle?.id);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Team Performance Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Monitor direct reports, approve goal sheets, and submit manager check-in comments.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-880 transition-all cursor-pointer"
          title="Refresh data"
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

      {/* Cycle Window Indicator */}
      {activeCycle && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200">{activeCycle.name} Performance Cycle</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Active Goal Planning and Review Period
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Direct Reports List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : team.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
          <Users className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-300">No direct reports found</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm mt-1">
            You are not configured as a manager for any active employee accounts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {team.map((emp) => {
            const activeSheet = getActiveSheet(emp);
            const totalWeightage = activeSheet?.goals?.reduce((acc, g) => acc + g.weightage, 0) || 0;

            return (
              <div 
                key={emp.id}
                className="bg-slate-900/40 border border-slate-805 hover:border-slate-800 rounded-2xl p-6 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* User Profile Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 flex items-center justify-center font-bold text-indigo-300 text-md border border-indigo-500/25">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200">{emp.name}</h4>
                        <p className="text-xs text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                    {activeSheet ? (
                      <StatusBadge status={activeSheet.status} />
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950 text-slate-550 border border-slate-850">
                        No Sheet
                      </span>
                    )}
                  </div>

                  {/* Goal Sheet Detail Block */}
                  {activeSheet ? (
                    <div className="space-y-2 text-sm text-slate-400 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                      <div className="flex justify-between">
                        <span>Goal Count:</span>
                        <span className="font-semibold text-slate-350">{activeSheet.goals?.length || 0} / 8</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Weightage:</span>
                        <span className={`font-semibold ${totalWeightage === 100 ? 'text-green-400' : 'text-slate-400'}`}>
                          {totalWeightage}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-slate-950/20 rounded-xl border border-dashed border-slate-850 text-slate-550 text-xs">
                      No goal sheet initialized for FY 2025-26
                    </div>
                  )}
                </div>

                {/* Footer Action buttons */}
                <div className="mt-6 pt-4 border-t border-slate-850/50 flex items-center gap-3">
                  {activeSheet?.status === 'submitted' ? (
                    <button
                      onClick={() => navigate(`/team/approve/${emp.id}/${activeSheet.id}`)}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Review Goal Sheet</span>
                    </button>
                  ) : activeSheet?.status === 'approved' || activeSheet?.status === 'locked' ? (
                    <button
                      onClick={() => navigate(`/team/check-in/${emp.id}`)}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 font-semibold text-xs border border-slate-700/50 transition-colors cursor-pointer"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Log Manager Check-in</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-slate-550 font-semibold text-xs border border-slate-850 cursor-not-allowed text-center"
                    >
                      Awaiting Submission
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
