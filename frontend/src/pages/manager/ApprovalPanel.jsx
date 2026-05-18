import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { WeightageMeter } from '../../components/common/WeightageMeter';
import { StatusBadge } from '../../components/common/StatusBadge';
import { 
  ArrowLeft, 
  Check, 
  X, 
  AlertCircle, 
  TrendingUp, 
  RotateCcw, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles,
  Edit2
} from 'lucide-react';

export default function ApprovalPanel() {
  const { employeeId, sheetId } = useParams();
  const navigate = useNavigate();
  
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Negotiation state
  const [goals, setGoals] = useState([]);
  const [returnNote, setReturnNote] = useState('');
  const [showReturnPanel, setShowReturnPanel] = useState(false);

  const fetchSheet = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/manager/team/${employeeId}/sheet/${sheetId}`);
      setSheet(res.data);
      setGoals(res.data.goals || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load employee goal sheet details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, [employeeId, sheetId]);

  const handleGoalChange = (goalId, field, value) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          return {
            ...g,
            [field]: field === 'weightage' ? Number(value) : value
          };
        }
        return g;
      })
    );
  };

  const totalWeightage = goals.reduce((acc, g) => acc + g.weightage, 0);

  const handleApprove = async () => {
    if (totalWeightage !== 100) {
      setError('Total weightage must be exactly 100% to approve.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const payload = {
        goals: goals.map((g) => ({
          id: g.id,
          target: String(g.target),
          weightage: Number(g.weightage)
        }))
      };

      await api.patch(`/manager/sheets/${sheetId}/approve`, payload);
      navigate('/team');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to approve goal sheet.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!returnNote.trim()) {
      setError('Please provide a reason/note for returning the sheet.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const payload = {
        note: returnNote
      };

      await api.patch(`/manager/sheets/${sheetId}/return`, payload);
      navigate('/team');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to return goal sheet.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <TrendingUp className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-200">Goal sheet not found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-850">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/team')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-400 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-extrabold text-slate-100">Review Goal Sheet</h2>
              <StatusBadge status={sheet.status} />
            </div>
            <p className="text-sm text-slate-400 mt-1">Reviewing submission for direct report</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReturnPanel(!showReturnPanel)}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-850 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return for Rework</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={totalWeightage !== 100 || actionLoading}
            className="flex items-center space-x-2 py-2.5 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 text-slate-100 font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Approve & Lock</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-4 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Return Note Modal Panel */}
      {showReturnPanel && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-slate-200 flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <span>Reason for Return</span>
          </h3>
          <form onSubmit={handleReturn} className="space-y-4">
            <textarea
              required
              rows={3}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="Provide specific feedback or negotiate required changes..."
              className="block w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowReturnPanel(false)}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 font-medium text-xs border border-slate-700/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="py-2 px-5 rounded-lg bg-indigo-650 hover:bg-indigo-500 text-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Send back
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Overview Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:col-span-2 flex flex-col justify-center">
          <WeightageMeter current={totalWeightage} />
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
          <p className="text-sm text-slate-500 uppercase font-semibold tracking-wider">Goal Cards</p>
          <p className="text-4xl font-extrabold text-slate-200 mt-2">{goals.length} <span className="text-xl text-slate-650">/ 8</span></p>
        </div>
      </div>

      {/* Goal Cards Review list */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-200 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Interactive Goal Matrix</span>
          </h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Manager Negotiation Mode Active
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {goals.map((g) => (
            <div 
              key={g.id}
              className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center"
            >
              {/* Left description column */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {g.thrust_area}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    UoM: {g.uom}
                  </span>
                </div>
                <h4 className="text-md font-bold text-slate-200 leading-snug">{g.title}</h4>
              </div>

              {/* Target Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Target Value</span>
                </label>
                <input
                  type={g.uom === 'timeline' ? 'date' : 'text'}
                  disabled={g.uom === 'zero'}
                  value={g.uom === 'zero' ? '0' : g.target}
                  onChange={(e) => handleGoalChange(g.id, 'target', e.target.value)}
                  className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm disabled:opacity-50 font-semibold"
                />
              </div>

              {/* Weightage Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Weightage (%)</span>
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={g.weightage}
                  onChange={(e) => handleGoalChange(g.id, 'weightage', e.target.value)}
                  className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-semibold"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
