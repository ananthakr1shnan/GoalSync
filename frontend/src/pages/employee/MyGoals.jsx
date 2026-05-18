import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { WeightageMeter } from '../../components/common/WeightageMeter';
import {
  Target,
  Plus,
  Edit3,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Calendar,
  TrendingUp,
  FileCheck,
  ChevronRight,
  Clock,
  CheckCircle2,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

export default function MyGoals() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sheetsRes, cycleRes] = await Promise.all([
        api.get('/goal-sheets/'),
        api.get('/cycles/active').catch(() => ({ data: null }))
      ]);
      setSheets(sheetsRes.data);
      setActiveCycle(cycleRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load goal sheets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSheet = activeCycle
    ? sheets.find(s => s.cycle_id === activeCycle.id)
    : null;

  const handleCreateSheet = async () => {
    if (!activeCycle) {
      setError('No active performance cycle. Please contact your administrator.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/goal-sheets/', {
        employee_id: null,   // backend overrides with current_user.id
        cycle_id: activeCycle.id
      });
      navigate(`/my-goals/edit/${res.data.id}`);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (err.response?.status === 409) {
        // Sheet already exists — reload and navigate
        await fetchData();
      } else {
        setError(detail || 'Failed to create goal sheet.');
      }
    } finally {
      setCreating(false);
    }
  };

  // Determine the current open check-in quarter from the active cycle
  const getCurrentOpenQuarter = () => {
    if (!activeCycle) return null;
    const today = new Date().toISOString().slice(0, 10);
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
      const ql = q.toLowerCase();
      const open = activeCycle[`${ql}_open`];
      const close = activeCycle[`${ql}_close`];
      if (open && close && today >= open && today <= close) {
        return { quarter: q, open, close };
      }
    }
    return null;
  };

  const openCheckin = getCurrentOpenQuarter();
  const goals = activeSheet?.goals || [];
  const totalWeightage = goals.reduce((acc, g) => acc + Number(g.weightage), 0);
  const isEditable = activeSheet?.status === 'draft' || activeSheet?.status === 'returned';
  const isApproved = activeSheet?.status === 'approved' || activeSheet?.status === 'locked';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            My Goals
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage your performance goals for the current cycle.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-880 transition-all cursor-pointer"
          title="Refresh"
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

      {/* No Active Cycle Banner */}
      {!activeCycle && (
        <div className="rounded-2xl bg-amber-950/30 border border-amber-500/20 p-6 flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">No Active Performance Cycle</p>
            <p className="text-sm text-amber-300/70 mt-1">Your administrator has not activated a performance cycle yet. Please check back later.</p>
          </div>
        </div>
      )}

      {/* Active Cycle Info */}
      {activeCycle && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200">{activeCycle.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5">Active Performance Cycle</p>
            </div>
          </div>
          {openCheckin && (
            <div className="flex items-center space-x-2 bg-green-950/40 border border-green-500/20 rounded-lg px-4 py-2">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300 font-semibold">
                {openCheckin.quarter} Check-in Open
              </span>
              <span className="text-xs text-green-400/70">until {openCheckin.close}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Goal Sheet Card */}
      {activeCycle && !activeSheet && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl text-center space-y-6">
          <div className="p-5 bg-indigo-600/10 rounded-2xl">
            <Target className="w-12 h-12 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-200">No Goal Sheet Yet</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              You haven't created a goal sheet for <span className="font-semibold text-slate-300">{activeCycle.name}</span> yet. Start by creating your goal sheet.
            </p>
          </div>
          <button
            onClick={handleCreateSheet}
            disabled={creating}
            className="flex items-center space-x-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            <span>{creating ? 'Creating...' : 'Create Goal Sheet'}</span>
          </button>
        </div>
      )}

      {activeSheet && (
        <div className="space-y-6">
          {/* Sheet Status Header */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-slate-800 rounded-xl">
                  <Target className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-200">My Goal Sheet</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{activeCycle?.name}</p>
                </div>
              </div>
              <StatusBadge status={activeSheet.status} />
            </div>

            {/* Manager Note (when returned) */}
            {activeSheet.status === 'returned' && activeSheet.manager_note && (
              <div className="mt-4 p-4 bg-amber-950/30 border border-amber-500/20 rounded-xl">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Manager's Feedback</p>
                <p className="text-sm text-amber-200">{activeSheet.manager_note}</p>
              </div>
            )}

            {/* Weightage meter */}
            {goals.length > 0 && (
              <div className="mt-5">
                <WeightageMeter current={totalWeightage} max={100} />
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
              <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-850">
                <p className="text-xs text-slate-500">Goals</p>
                <p className="text-xl font-bold text-slate-200 mt-1">{goals.length} <span className="text-xs text-slate-500">/ 8</span></p>
              </div>
              <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-850">
                <p className="text-xs text-slate-500">Total Weightage</p>
                <p className={`text-xl font-bold mt-1 ${totalWeightage === 100 ? 'text-green-400' : 'text-amber-400'}`}>
                  {totalWeightage}%
                </p>
              </div>
              <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-850">
                <p className="text-xs text-slate-500">Avg Progress</p>
                <p className="text-xl font-bold text-slate-200 mt-1">
                  {goals.length > 0
                    ? `${Math.round(goals.reduce((a, g) => a + (g.progress_score || 0), 0) / goals.length)}%`
                    : '—'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-slate-850/60">
              {isEditable && (
                <button
                  onClick={() => navigate(`/my-goals/edit/${activeSheet.id}`)}
                  className="flex items-center space-x-2 py-2.5 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold text-sm transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Goals</span>
                </button>
              )}
              {isApproved && (
                <button
                  onClick={() => navigate('/check-in')}
                  className="flex items-center space-x-2 py-2.5 px-5 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-100 font-semibold text-sm transition-colors cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Log Check-in</span>
                </button>
              )}
              {activeSheet.status === 'submitted' && (
                <div className="flex items-center space-x-2 py-2.5 px-5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Awaiting Manager Review</span>
                </div>
              )}
              {isEditable && goals.length > 0 && (
                <button
                  onClick={() => navigate(`/my-goals/edit/${activeSheet.id}`)}
                  className="flex items-center space-x-2 py-2.5 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700/50 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Submit for Approval</span>
                </button>
              )}
            </div>
          </div>

          {/* Goals List */}
          {goals.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">Goals</h4>
              {goals.map((goal, idx) => (
                <div key={goal.id} className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start space-x-3">
                      <span className="text-xs font-bold text-slate-600 w-5 pt-0.5 shrink-0">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 leading-tight">{goal.title}</p>
                        <p className="text-xs text-indigo-400 mt-1 font-medium">{goal.thrust_area}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm shrink-0 pl-8 sm:pl-0">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Weight</p>
                      <p className="font-bold text-slate-300">{goal.weightage}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Progress</p>
                      <p className={`font-bold ${goal.progress_score >= 75 ? 'text-green-400' : goal.progress_score >= 40 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {goal.progress_score || 0}%
                      </p>
                    </div>
                    {(isEditable) && (
                      <button
                        onClick={() => navigate(`/my-goals/edit/${activeSheet.id}`)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Edit goal"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {goals.length === 0 && isEditable && (
            <div
              onClick={() => navigate(`/my-goals/edit/${activeSheet.id}`)}
              className="flex items-center justify-between p-5 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900/40 transition-all"
            >
              <div className="flex items-center space-x-3 text-slate-400">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-medium">Add your first goal to get started</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
            </div>
          )}
        </div>
      )}

      {/* Past Sheets */}
      {sheets.filter(s => s.cycle_id !== activeCycle?.id).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Past Cycles</h4>
          {sheets
            .filter(s => s.cycle_id !== activeCycle?.id)
            .map(sheet => (
              <div key={sheet.id} className="bg-slate-900/20 border border-slate-850/60 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-400">{sheet.goals?.length || 0} goals</p>
                    <p className="text-xs text-slate-600">Previous cycle sheet</p>
                  </div>
                </div>
                <StatusBadge status={sheet.status} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
