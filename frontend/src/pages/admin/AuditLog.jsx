import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  User, 
  Edit3, 
  Unlock, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';
import api from '../../api/client';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // High fidelity audit logs seed
  const mockLogs = [
    {
      id: '1',
      changed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      changed_by_name: 'Jane Manager',
      action: 'MANAGER_EDIT',
      field_name: 'weightage',
      old_value: '20%',
      new_value: '30%',
      reason: 'Aligning with increased focus on customer satisfaction KPIs',
      goal_title: 'Reduce customer response ticket time'
    },
    {
      id: '2',
      changed_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      changed_by_name: 'Admin User',
      action: 'GOAL_UNLOCKED',
      field_name: 'sheet_status',
      old_value: 'locked',
      new_value: 'approved',
      reason: 'Requested unlock to adjust Timeline goal date mismatch',
      goal_title: 'Launch compliance automation suite'
    },
    {
      id: '3',
      changed_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      changed_by_name: 'John Employee',
      action: 'SHEET_SUBMISSION',
      field_name: 'status',
      old_value: 'draft',
      new_value: 'submitted',
      reason: 'Completed goal setting sheet for performance cycle validation',
      goal_title: 'System Objective Checklist'
    },
    {
      id: '4',
      changed_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      changed_by_name: 'Admin User',
      action: 'SHARED_GOAL_PUSH',
      field_name: 'cascaded_goal',
      old_value: '—',
      new_value: 'Security Protocol Training',
      reason: 'Strategic deployment of security compliance objectives company-wide',
      goal_title: 'Shared Corporate Objectives'
    }
  ];

  const fetchLogs = () => {
    setLoading(true);
    // Simulate API fetch delay
    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch = 
      l.changed_by_name.toLowerCase().includes(search.toLowerCase()) ||
      l.goal_title.toLowerCase().includes(search.toLowerCase()) ||
      (l.reason && l.reason.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = actionFilter ? l.action === actionFilter : true;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Goal Audit Stream
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Immutable tracking of goal sheet changes, manager adjustments, and unlock audits.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-880 transition-all cursor-pointer"
          title="Refresh streams"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-550 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by auditor name, goal title, or reason..."
            className="w-full py-2.5 pl-10 pr-4 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Filter Option */}
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-450" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="block py-2.5 px-4 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
          >
            <option value="">All Audit Events</option>
            <option value="MANAGER_EDIT">Manager Edit</option>
            <option value="GOAL_UNLOCKED">Goal Unlocked</option>
            <option value="SHEET_SUBMISSION">Sheet Submission</option>
            <option value="SHARED_GOAL_PUSH">Strategic Goal Push</option>
          </select>
        </div>
      </div>

      {/* Audit ledger */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-dashed border-slate-850 rounded-2xl text-slate-500 text-sm">
          No matching audit log entries found.
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl space-y-4">
          <div className="divide-y divide-slate-850">
            {filteredLogs.map((log) => (
              <div 
                key={log.id}
                className="p-6 hover:bg-slate-850/15 transition-all flex flex-col md:flex-row justify-between items-start gap-6"
              >
                {/* Left audit item details */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center space-x-3 flex-wrap gap-y-1.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      log.action === 'GOAL_UNLOCKED' 
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                        : log.action === 'MANAGER_EDIT' 
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                      {log.action === 'GOAL_UNLOCKED' ? (
                        <Unlock className="w-3 h-3 mr-1" />
                      ) : log.action === 'MANAGER_EDIT' ? (
                        <Edit3 className="w-3 h-3 mr-1" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      )}
                      <span>{log.action.replace('_', ' ')}</span>
                    </span>
                    
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.changed_at).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-200">
                    {log.goal_title}
                  </h4>

                  {log.reason && (
                    <p className="text-xs text-slate-400 italic bg-slate-950/40 p-3 rounded-lg border border-slate-900 inline-block w-full">
                      Auditor Note: "{log.reason}"
                    </p>
                  )}
                </div>

                {/* Right field changes */}
                <div className="w-full md:w-64 bg-slate-950/30 border border-slate-850 rounded-xl p-4 text-xs space-y-2 shrink-0">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Auditor:</span>
                    <span className="font-semibold text-slate-300">{log.changed_by_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Field:</span>
                    <span className="font-mono text-indigo-300 font-semibold">{log.field_name}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-850/50 pt-2 mt-1">
                    <span className="text-slate-500">Prior:</span>
                    <span className="font-semibold text-red-400 line-through">{log.old_value}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Revised:</span>
                    <span className="font-semibold text-emerald-400">{log.new_value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
