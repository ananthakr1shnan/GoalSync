import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { 
  ShieldAlert, 
  Plus, 
  X, 
  Save, 
  AlertCircle, 
  RefreshCw, 
  CheckSquare, 
  Square,
  Users,
  Target
} from 'lucide-react';

export default function SharedGoals() {
  const [users, setUsers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thrustArea, setThrustArea] = useState('Operations');
  const [uom, setUom] = useState('numeric_min');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weightage, setWeightage] = useState(10);
  const [selectedEmployees, setSelectedEmployees] = useState([]); // employee_ids

  const fetchData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [usersRes, cyclesRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/cycles')
      ]);
      setUsers(usersRes.data);
      setCycles(cyclesRes.data);
      const active = cyclesRes.data.find(c => c.is_active);
      setActiveCycle(active);
    } catch (err) {
      console.error(err);
      setError('Failed to load shared goals dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectAll = () => {
    const employees = users.filter(u => u.role === 'employee');
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  const handleSelectEmployee = (empId) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handlePushSharedGoal = async (e) => {
    e.preventDefault();
    if (!activeCycle) {
      setError('An active performance cycle must exist.');
      return;
    }
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee.');
      return;
    }
    if (!title || !target) {
      setError('Please provide all mandatory goal fields.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        template: {
          title,
          description: description || null,
          thrust_area: thrustArea,
          uom,
          target: Number(target),
          target_date: targetDate || null,
          cycle_id: activeCycle.id
        },
        employee_ids: selectedEmployees,
        weightage: Number(weightage)
      };

      await api.post('/admin/shared-goals', payload);
      setSuccess('Shared goal pushed to direct reports successfully.');
      
      // Reset Form
      setTitle('');
      setDescription('');
      setThrustArea('Operations');
      setUom('numeric_min');
      setTarget('');
      setTargetDate('');
      setWeightage(10);
      setSelectedEmployees([]);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to push shared goal.');
    } finally {
      setActionLoading(false);
    }
  };

  const employees = users.filter(u => u.role === 'employee');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Shared Strategic Goals
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Cascade organization-wide corporate objectives directly to employee performance sheets.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-880 transition-all cursor-pointer"
          title="Refresh database"
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

      {success && (
        <div className="rounded-lg bg-green-950/30 border border-green-500/20 p-4 flex items-start space-x-3 text-green-200 text-sm">
          <Target className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Cycle Indicator */}
      {activeCycle && (
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex items-center space-x-3 text-sm text-indigo-300 font-semibold max-w-fit">
          <ShieldAlert className="w-5 h-5" />
          <span>Active Target Cycle: {activeCycle.name}</span>
        </div>
      )}

      <form onSubmit={handlePushSharedGoal} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goal Attributes Form Panel */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2 border-b border-slate-850 pb-3">
            <Target className="w-5 h-5 text-indigo-400" />
            <span>Configure Objective Blueprint</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Objective Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                placeholder="e.g. Attain ISO 27001 Information Security Certification"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description / Context
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-6550 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                placeholder="Detail deliverables, standards, or audit procedures..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Thrust Area
              </label>
              <select
                value={thrustArea}
                onChange={(e) => setThrustArea(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
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
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                UoM
              </label>
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
              >
                <option value="numeric_min">Numeric Min</option>
                <option value="numeric_max">Numeric Max</option>
                <option value="timeline">Timeline</option>
                <option value="zero">Zero</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Target Value
              </label>
              <input
                type="number"
                required
                disabled={uom === 'zero'}
                value={uom === 'zero' ? '0' : target}
                onChange={(e) => setTarget(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm disabled:opacity-50"
                placeholder={uom === 'zero' ? 'Zero is enforced' : 'e.g. 100'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Default Weightage (%)
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={weightage}
                onChange={(e) => setWeightage(Number(e.target.value))}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Employee Checklist Panel */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col justify-between h-[520px]">
          <div className="space-y-4 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3 shrink-0">
              <h3 className="font-bold text-slate-200 flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Select Target Audience</span>
              </h3>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                {selectedEmployees.length === employees.length ? 'Clear All' : 'Select All'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {employees.length === 0 ? (
                <p className="text-xs text-slate-550 italic text-center py-10">No employees found in DB.</p>
              ) : (
                employees.map((emp) => {
                  const isChecked = selectedEmployees.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp.id)}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-slate-200' 
                          : 'bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-800'
                      }`}
                    >
                      <div className="shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-650" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold truncate">{emp.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{emp.department || 'Operations'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-850 shrink-0">
            <button
              type="submit"
              disabled={actionLoading || selectedEmployees.length === 0}
              className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white font-semibold text-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Cascade Shared Goal ({selectedEmployees.length})</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
