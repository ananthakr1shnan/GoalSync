import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { 
  Calendar, 
  Plus, 
  X, 
  Save, 
  AlertCircle, 
  RefreshCw, 
  Activity, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';

export default function CycleManager() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  
  // Date states
  const [planningOpen, setPlanningOpen] = useState('');
  const [planningClose, setPlanningClose] = useState('');
  const [q1Open, setQ1Open] = useState('');
  const [q1Close, setQ1Close] = useState('');
  const [q2Open, setQ2Open] = useState('');
  const [q2Close, setQ2Close] = useState('');
  const [q3Open, setQ3Open] = useState('');
  const [q3Close, setQ3Close] = useState('');
  const [q4Open, setQ4Open] = useState('');
  const [q4Close, setQ4Close] = useState('');

  const fetchCycles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/cycles');
      setCycles(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch performance cycles database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setName('');
    setPlanningOpen('');
    setPlanningClose('');
    setQ1Open('');
    setQ1Close('');
    setQ2Open('');
    setQ2Close('');
    setQ3Open('');
    setQ3Close('');
    setQ4Open('');
    setQ4Close('');
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Name is required.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const payload = {
        name,
        is_active: false,
        goal_setting_open: planningOpen || null,
        goal_setting_close: planningClose || null,
        q1_open: q1Open || null,
        q1_close: q1Close || null,
        q2_open: q2Open || null,
        q2_close: q2Close || null,
        q3_open: q3Open || null,
        q3_close: q3Close || null,
        q4_open: q4Open || null,
        q4_close: q4Close || null,
      };

      await api.post('/admin/cycles', payload);
      resetForm();
      await fetchCycles();
    } catch (err) {
      console.error(err);
      setError('Failed to create goal cycle.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateCycle = async (cycleId) => {
    if (!window.confirm('Are you sure you want to activate this performance cycle? This will deactivate all others.')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/admin/cycles/${cycleId}/activate`);
      await fetchCycles();
    } catch (err) {
      console.error(err);
      setError('Failed to activate goal cycle.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Performance Cycle Management
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Define planning windows, set quarterly check-in schedules, and configure active review systems.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCycles}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-880 transition-all cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Cycle</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-4 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Cycle Creation Form */}
      {showForm && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-200">Configure Performance Cycle</h3>
            <button 
              onClick={resetForm}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateCycle} className="space-y-6">
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Cycle Title / Year
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-semibold"
                placeholder="e.g. FY 2026-27"
              />
            </div>

            {/* Date Windows grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Planning window */}
              <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-850 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Planning Window</h4>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Open</label>
                  <input type="date" value={planningOpen} onChange={(e) => setPlanningOpen(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Close</label>
                  <input type="date" value={planningClose} onChange={(e) => setPlanningClose(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
              </div>

              {/* Q1 window */}
              <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-850 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Q1 Check-in</h4>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Open</label>
                  <input type="date" value={q1Open} onChange={(e) => setQ1Open(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Close</label>
                  <input type="date" value={q1Close} onChange={(e) => setQ1Close(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
              </div>

              {/* Q2 window */}
              <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-850 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Q2 Check-in</h4>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Open</label>
                  <input type="date" value={q2Open} onChange={(e) => setQ2Open(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Close</label>
                  <input type="date" value={q2Close} onChange={(e) => setQ2Close(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
              </div>

              {/* Q3 window */}
              <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-850 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Q3 Check-in</h4>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Open</label>
                  <input type="date" value={q3Open} onChange={(e) => setQ3Open(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Close</label>
                  <input type="date" value={q3Close} onChange={(e) => setQ3Close(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
              </div>

              {/* Q4 window */}
              <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-850 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Q4 Check-in</h4>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Open</label>
                  <input type="date" value={q4Open} onChange={(e) => setQ4Open(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Close</label>
                  <input type="date" value={q4Close} onChange={(e) => setQ4Close(e.target.value)} className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-850 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 font-medium text-xs border border-slate-700/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex items-center space-x-2 py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Goal Cycle</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cycles Listing Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {cycles.map((c) => (
            <div 
              key={c.id}
              className={`border rounded-2xl p-6 transition-all ${
                c.is_active 
                  ? 'bg-slate-900/60 border-indigo-500/50 shadow-indigo-950/20 shadow-2xl relative overflow-hidden' 
                  : 'bg-slate-900/20 border-slate-850 hover:border-slate-800'
              }`}
            >
              {c.is_active && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
              )}

              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-5 border-b border-slate-850">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-slate-200">{c.name}</h3>
                    {c.is_active && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                        <Activity className="w-3.5 h-3.5 mr-1" />
                        <span>Active System Cycle</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Cycle ID: {c.id}</p>
                </div>

                {!c.is_active && (
                  <button
                    onClick={() => handleActivateCycle(c.id)}
                    disabled={actionLoading}
                    className="flex items-center space-x-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-slate-100 font-semibold text-xs border border-slate-700/50 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    <span>Activate Cycle</span>
                  </button>
                )}
              </div>

              {/* Schedules Display */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-5 text-sm">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Goal Setting</p>
                  <p className="font-bold text-slate-300 mt-1 text-xs">
                    {c.goal_setting_open ? new Date(c.goal_setting_open).toLocaleDateString() : 'Not Set'}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">to {c.goal_setting_close ? new Date(c.goal_setting_close).toLocaleDateString() : 'Not Set'}</p>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <p className="text-xs text-slate-550 uppercase font-semibold">Q1 Review</p>
                  <p className="font-bold text-slate-300 mt-1 text-xs">
                    {c.q1_open ? new Date(c.q1_open).toLocaleDateString() : 'Not Set'}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">to {c.q1_close ? new Date(c.q1_close).toLocaleDateString() : 'Not Set'}</p>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <p className="text-xs text-slate-550 uppercase font-semibold">Q2 Review</p>
                  <p className="font-bold text-slate-300 mt-1 text-xs">
                    {c.q2_open ? new Date(c.q2_open).toLocaleDateString() : 'Not Set'}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">to {c.q2_close ? new Date(c.q2_close).toLocaleDateString() : 'Not Set'}</p>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <p className="text-xs text-slate-550 uppercase font-semibold">Q3 Review</p>
                  <p className="font-bold text-slate-300 mt-1 text-xs">
                    {c.q3_open ? new Date(c.q3_open).toLocaleDateString() : 'Not Set'}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">to {c.q3_close ? new Date(c.q3_close).toLocaleDateString() : 'Not Set'}</p>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <p className="text-xs text-slate-550 uppercase font-semibold">Q4 Review</p>
                  <p className="font-bold text-slate-300 mt-1 text-xs">
                    {c.q4_open ? new Date(c.q4_open).toLocaleDateString() : 'Not Set'}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">to {c.q4_close ? new Date(c.q4_close).toLocaleDateString() : 'Not Set'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
