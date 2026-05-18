import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { WeightageMeter } from '../../components/common/WeightageMeter';
import { StatusBadge } from '../../components/common/StatusBadge';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Send,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  FileCheck
} from 'lucide-react';

export default function GoalSheetBuilder() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [title, setTitle] = useState('');
  const [thrustArea, setThrustArea] = useState('Revenue');
  const [uom, setUom] = useState('numeric_min');
  const [target, setTarget] = useState('');
  const [weightage, setWeightage] = useState(10);

  const fetchSheet = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/goal-sheets/${sheetId}`);
      setSheet(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load goal sheet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheet();
  }, [sheetId]);

  const resetForm = () => {
    setIsEditingGoal(false);
    setSelectedGoalId(null);
    setTitle('');
    setThrustArea('Revenue');
    setUom('numeric_min');
    setTarget('');
    setWeightage(10);
  };

  const handleEditClick = (goal) => {
    setIsEditingGoal(true);
    setSelectedGoalId(goal.id);
    setTitle(goal.title);
    setThrustArea(goal.thrust_area);
    setUom(goal.uom);
    setTarget(goal.target);
    setWeightage(goal.weightage);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!title || !target) {
      setError('Please fill out all required fields.');
      return;
    }
    if (weightage < 10) {
      setError('Minimum goal weightage is 10%.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const payload = {
        title,
        thrust_area: thrustArea,
        uom,
        target: String(target),
        weightage: Number(weightage)
      };

      if (selectedGoalId) {
        // Edit existing goal
        await api.patch(`/goal-sheets/${sheetId}/goals/${selectedGoalId}`, payload);
      } else {
        // Add new goal
        await api.post(`/goal-sheets/${sheetId}/goals`, payload);
      }
      resetForm();
      await fetchSheet();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save goal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.delete(`/goal-sheets/${sheetId}/goals/${goalId}`);
      await fetchSheet();
    } catch (err) {
      console.error(err);
      setError('Failed to delete goal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitSheet = async () => {
    if (!window.confirm('Are you sure you want to submit this goal sheet for approval? This will lock edits.')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/goal-sheets/${sheetId}/submit`);
      navigate('/my-goals');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to submit goal sheet.');
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

  const goals = sheet.goals || [];
  const totalWeightage = goals.reduce((acc, g) => acc + g.weightage, 0);
  const isEditable = sheet.status === 'draft' || sheet.status === 'returned';

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/my-goals')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-400 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-extrabold text-slate-100">Configure Goal Sheet</h2>
              <StatusBadge status={sheet.status} />
            </div>
            <p className="text-sm text-slate-400 mt-1">Sheet ID: {sheet.id}</p>
          </div>
        </div>

        {isEditable && (
          <button
            onClick={handleSubmitSheet}
            disabled={totalWeightage !== 100 || actionLoading}
            className="flex items-center space-x-2 py-2.5 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 text-slate-100 font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Submit Sheet</span>
          </button>
        )}
      </div>

      {/* Warning Banner for Returned Sheets */}
      {sheet.status === 'returned' && sheet.manager_note && (
        <div className="rounded-xl bg-orange-950/30 border border-orange-500/20 p-5 flex items-start space-x-4 text-orange-200">
          <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-orange-300">Returned for Rework by Manager</h4>
            <p className="mt-1 text-sm text-orange-200/80">{sheet.manager_note}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-4 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:col-span-2 flex flex-col justify-center">
          <WeightageMeter current={totalWeightage} />
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center">
          <p className="text-sm text-slate-500 uppercase font-semibold tracking-wider">Goal Count</p>
          <p className="text-4xl font-extrabold text-slate-200 mt-2">{goals.length} <span className="text-xl text-slate-600">/ 8</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goals List (Col-span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-slate-200 flex items-center space-x-2">
            <span>Goal Cards</span>
          </h3>

          {goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
              <FileCheck className="w-12 h-12 text-slate-600 mb-4" />
              <h4 className="font-bold text-slate-400">No goals added yet</h4>
              <p className="text-xs text-slate-500 mt-1">Use the builder form to populate this sheet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {goals.map((g, index) => (
                <div 
                  key={g.id}
                  className="bg-slate-900/30 border border-slate-850 hover:border-slate-800 rounded-xl p-5 flex justify-between items-start gap-4 transition-all"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {g.thrust_area}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        UoM: {g.uom}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        Weight: {g.weightage}%
                      </span>
                    </div>

                    <h4 className="text-md font-bold text-slate-200 leading-snug break-words">
                      {g.title}
                    </h4>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <span className="text-slate-500">Target Value:</span>
                      <span className="font-semibold text-slate-300">{g.target}</span>
                    </div>
                  </div>

                  {isEditable && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleEditClick(g)}
                        disabled={actionLoading}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                        title="Edit goal"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        disabled={actionLoading}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goal Form Sidebar (Col-span 1) */}
        <div>
          {isEditable ? (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-6 sticky top-8">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-slate-200">
                  {selectedGoalId ? 'Edit Goal Card' : 'Add Goal Card'}
                </h3>
                {selectedGoalId && (
                  <button 
                    onClick={resetForm}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Thrust Area
                  </label>
                  <select
                    value={thrustArea}
                    onChange={(e) => setThrustArea(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                  >
                    <option value="Revenue">Revenue</option>
                    <option value="Operations">Operations</option>
                    <option value="Learning">Learning</option>
                    <option value="Safety">Safety</option>
                    <option value="Quality">Quality</option>
                    <option value="Customer">Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Goal Title / Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-6550 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                    placeholder="Describe the specific outcome..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      UoM
                    </label>
                    <select
                      value={uom}
                      onChange={(e) => setUom(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                    >
                      <option value="numeric_min">Numeric Min</option>
                      <option value="numeric_max">Numeric Max</option>
                      <option value="timeline">Timeline</option>
                      <option value="zero">Zero</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Weightage (%)
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={100}
                      value={weightage}
                      onChange={(e) => setWeightage(Number(e.target.value))}
                      className="mt-1 block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Target Value
                  </label>
                  <input
                    type={uom === 'timeline' ? 'date' : 'text'}
                    required
                    disabled={uom === 'zero'}
                    value={uom === 'zero' ? '0' : target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm disabled:opacity-55"
                    placeholder={uom === 'zero' ? 'Zero is enforced' : 'e.g. 1000000'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || (!selectedGoalId && goals.length >= 8)}
                  className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white font-semibold text-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{selectedGoalId ? 'Save Changes' : 'Add to Sheet'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4 sticky top-8 text-center">
              <FileCheck className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="font-bold text-slate-300">Goal Sheet Locked</h3>
              <p className="text-xs text-slate-500">
                This sheet has been submitted or approved, locking edits. Content is currently read-only.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
