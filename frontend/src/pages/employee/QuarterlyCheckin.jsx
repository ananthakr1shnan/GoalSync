import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProgressScore } from '../../components/common/ProgressScore';
import { 
  Save, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  FileCheck,
  ChevronRight,
  Info
} from 'lucide-react';

export default function QuarterlyCheckin() {
  const [sheet, setSheet] = useState(null);
  const [activeCycle, setActiveCycle] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('q1');
  const [achievements, setAchievements] = useState({}); // goal_id -> achievement
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState({}); // goal_id -> 'saving' | 'saved' | 'error'
  const [demoMode, setDemoMode] = useState(false);

  // Form Inputs per goal
  const [formInputs, setFormInputs] = useState({}); // goal_id -> { actual, actual_date, status, notes }

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sheetsRes, cycleRes] = await Promise.all([
        api.get('/goal-sheets/'),
        api.get('/cycles/active').catch(() => ({ data: null }))
      ]);

      const activeCycleData = cycleRes.data;
      setActiveCycle(activeCycleData);

      // Find locked or approved sheet for active cycle
      const lockedSheet = sheetsRes.data.find(
        (s) => s.cycle_id === activeCycleData?.id && (s.status === 'locked' || s.status === 'approved')
      );

      if (lockedSheet) {
        setSheet(lockedSheet);
        
        // Fetch achievements
        const achRes = await api.get(`/achievements/${lockedSheet.id}`);
        const achMap = {};
        achRes.data.forEach((a) => {
          if (!achMap[a.goal_id]) achMap[a.goal_id] = {};
          achMap[a.goal_id][a.quarter] = a;
        });
        setAchievements(achMap);

        // Auto-detect quarter
        const detectedQ = detectActiveQuarter(activeCycleData);
        setSelectedQuarter(detectedQ || 'q1');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch check-in details. Make sure your goal sheet is Approved & Locked.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update form inputs when selectedQuarter or achievements change
  useEffect(() => {
    if (!sheet) return;
    const initialInputs = {};
    sheet.goals.forEach((g) => {
      const ach = achievements[g.id]?.[selectedQuarter] || {};
      initialInputs[g.id] = {
        actual: ach.actual !== undefined && ach.actual !== null ? String(ach.actual) : '',
        actual_date: ach.actual_date || new Date().toISOString().split('T')[0],
        status: ach.status || 'not_started',
        notes: ach.notes || ''
      };
    });
    setFormInputs(initialInputs);
  }, [sheet, selectedQuarter, achievements]);

  const detectActiveQuarter = (cycle) => {
    if (!cycle) return null;
    const today = new Date();
    const parse = (d) => d ? new Date(d) : null;

    if (parse(cycle.q1_open) <= today && today <= parse(cycle.q1_close)) return 'q1';
    if (parse(cycle.q2_open) <= today && today <= parse(cycle.q2_close)) return 'q2';
    if (parse(cycle.q3_open) <= today && today <= parse(cycle.q3_close)) return 'q3';
    if (parse(cycle.q4_open) <= today && today <= parse(cycle.q4_close)) return 'q4';
    return null;
  };

  const isQuarterOpen = (q) => {
    if (demoMode) return true;
    if (!activeCycle) return false;
    const today = new Date();
    const parse = (d) => d ? new Date(d) : null;

    const windows = {
      q1: { open: activeCycle.q1_open, close: activeCycle.q1_close },
      q2: { open: activeCycle.q2_open, close: activeCycle.q2_close },
      q3: { open: activeCycle.q3_open, close: activeCycle.q3_close },
      q4: { open: activeCycle.q4_open, close: activeCycle.q4_close },
    };

    const win = windows[q];
    if (!win.open || !win.close) return false;
    return parse(win.open) <= today && today <= parse(win.close);
  };

  const handleInputChange = (goalId, field, value) => {
    setFormInputs((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value
      }
    }));
  };

  const calculateProgressScore = (goal, actualVal, status) => {
    if (status === 'completed') return 100;
    const actual = Number(actualVal);
    const target = Number(goal.target);
    if (isNaN(actual) || isNaN(target) || target === 0) {
      return status === 'on_track' ? 70 : 0;
    }

    if (goal.uom === 'numeric_max' || goal.uom === 'percent_max') {
      return Math.min(100, Math.max(0, Math.round((actual / target) * 100)));
    } else if (goal.uom === 'numeric_min' || goal.uom === 'percent_min') {
      if (actual <= target) return 100;
      return Math.min(100, Math.max(0, Math.round((target / actual) * 100)));
    } else if (goal.uom === 'zero') {
      return actual === 0 ? 100 : 0;
    } else if (goal.uom === 'timeline') {
      return status === 'on_track' ? 70 : 0;
    }
    return 0;
  };

  const handleSaveAchievement = async (goalId) => {
    const inputs = formInputs[goalId];
    if (!inputs) return;

    setSaveStatus((prev) => ({ ...prev, [goalId]: 'saving' }));
    try {
      const payload = {
        goal_id: goalId,
        quarter: selectedQuarter,
        actual: inputs.actual === '' ? null : Number(inputs.actual),
        actual_date: inputs.actual_date,
        status: inputs.status,
        notes: inputs.notes
      };

      const res = await api.post(`/achievements/${goalId}/${selectedQuarter}`, payload);
      
      // Update achievements map
      setAchievements((prev) => {
        const copy = { ...prev };
        if (!copy[goalId]) copy[goalId] = {};
        copy[goalId][selectedQuarter] = res.data;
        return copy;
      });

      setSaveStatus((prev) => ({ ...prev, [goalId]: 'saved' }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [goalId]: null }));
      }, 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus((prev) => ({ ...prev, [goalId]: 'error' }));
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
      <div className="text-center py-16 max-w-md mx-auto space-y-4">
        <AlertCircle className="w-16 h-16 text-slate-500 mx-auto" />
        <h3 className="text-2xl font-bold text-slate-200">No Approved Goal Sheet</h3>
        <p className="text-sm text-slate-400">
          Quarterly check-ins require an Approved & Locked goal sheet for the current cycle. Make sure you submit your draft and get manager approval.
        </p>
      </div>
    );
  }

  const checkinOpen = isQuarterOpen(selectedQuarter);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Quarterly Check-in
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Submit actual progress details and achievements per goal for performance review.
          </p>
        </div>

        {/* Demo Mode Toggle */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <input
            id="demo-mode"
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500/50"
          />
          <label htmlFor="demo-mode" className="text-xs font-semibold text-indigo-300 uppercase tracking-wider cursor-pointer">
            Bypass Windows (Demo Mode)
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-4 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quarter Selector */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Quarter
            </label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="block w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
            >
              <option value="q1">Quarter 1 (Q1)</option>
              <option value="q2">Quarter 2 (Q2)</option>
              <option value="q3">Quarter 3 (Q3)</option>
              <option value="q4">Quarter 4 (Q4)</option>
            </select>
          </div>
          <div className="mt-4 flex items-center space-x-2 text-xs text-indigo-400 font-semibold bg-indigo-500/5 border border-indigo-500/10 px-3 py-1.5 rounded-lg">
            <Info className="w-4 h-4" />
            <span>Cycle: {activeCycle?.name}</span>
          </div>
        </div>

        {/* Window Banner */}
        <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-xl shrink-0 ${checkinOpen ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200">
                Check-in Window {checkinOpen ? 'is Open' : 'is Closed'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {checkinOpen 
                  ? 'The submission window is active. You can save and update your check-in numbers.'
                  : `Next check-in window opens according to schedule rules.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Cards Checklist */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-200">My Goals Checklist</h3>

        {sheet.goals.map((g) => {
          const inputs = formInputs[g.id] || { actual: '', status: 'not_started', notes: '', actual_date: '' };
          const status = saveStatus[g.id];
          const liveProgress = calculateProgressScore(g, inputs.actual, inputs.status);

          return (
            <div 
              key={g.id}
              className="bg-slate-900/30 border border-slate-850 hover:border-slate-800 rounded-2xl p-6 transition-all space-y-6"
            >
              {/* Goal card top */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 flex-wrap gap-y-1">
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
                  <h4 className="text-lg font-bold text-slate-200">{g.title}</h4>
                  <p className="text-xs text-slate-500">Target Value: {g.target}</p>
                </div>

                {/* Score indicators */}
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Live Progress</p>
                    <div className="mt-1">
                      <ProgressScore score={liveProgress} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Goal Inputs form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-850/50">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Actual Value
                  </label>
                  <input
                    type="text"
                    disabled={!checkinOpen || g.uom === 'zero'}
                    value={g.uom === 'zero' ? '0' : inputs.actual}
                    onChange={(e) => handleInputChange(g.id, 'actual', e.target.value)}
                    className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm disabled:opacity-50"
                    placeholder="Enter value"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    disabled={!checkinOpen}
                    value={inputs.status}
                    onChange={(e) => handleInputChange(g.id, 'status', e.target.value)}
                    className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm disabled:opacity-50"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="on_track">On Track</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Check-in Notes
                  </label>
                  <input
                    type="text"
                    disabled={!checkinOpen}
                    value={inputs.notes}
                    onChange={(e) => handleInputChange(g.id, 'notes', e.target.value)}
                    className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm disabled:opacity-50"
                    placeholder="Update notes..."
                  />
                </div>
              </div>

              {checkinOpen && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleSaveAchievement(g.id)}
                    disabled={status === 'saving'}
                    className="flex items-center space-x-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    {status === 'saving' ? (
                      <span>Saving...</span>
                    ) : status === 'saved' ? (
                      <span className="flex items-center space-x-1.5 text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved!</span>
                      </span>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Check-in</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
