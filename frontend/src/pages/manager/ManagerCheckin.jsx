import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProgressScore } from '../../components/common/ProgressScore';
import { 
  ArrowLeft, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Calendar,
  Clock
} from 'lucide-react';

export default function ManagerCheckin() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [activeCycle, setActiveCycle] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('q1');
  const [achievements, setAchievements] = useState({}); // goal_id -> { q1: ach, ... }
  const [managerComments, setManagerComments] = useState({}); // goal_id -> [comments]
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Comment Inputs
  const [commentInputs, setCommentInputs] = useState({}); // goal_id -> string
  const [commentLoading, setCommentLoading] = useState({}); // goal_id -> bool

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Find the direct report info
      const [teamRes, cycleRes] = await Promise.all([
        api.get('/manager/team'),
        api.get('/cycles/active').catch(() => ({ data: null }))
      ]);

      const activeCycleData = cycleRes.data;
      setActiveCycle(activeCycleData);

      const report = teamRes.data.find(u => u.id === userId);
      if (!report) {
        throw new Error('Direct report not found.');
      }
      setEmployee(report);

      // Find report's sheet for active cycle
      const activeSheet = report.goal_sheets?.find(
        (s) => s.cycle_id === activeCycleData?.id && (s.status === 'locked' || s.status === 'approved')
      );

      if (activeSheet) {
        setSheet(activeSheet);

        // Fetch employee reported achievements and manager checkins in parallel
        const [achRes, commentRes] = await Promise.all([
          api.get(`/achievements/${activeSheet.id}`),
          api.get(`/manager/checkins/${userId}`)
        ]);

        // Map achievements
        const achMap = {};
        achRes.data.forEach((a) => {
          if (!achMap[a.goal_id]) achMap[a.goal_id] = {};
          achMap[a.goal_id][a.quarter] = a;
        });
        setAchievements(achMap);

        // Map manager comments
        const commentMap = {};
        commentRes.data.forEach((c) => {
          if (!commentMap[c.goal_id]) commentMap[c.goal_id] = [];
          commentMap[c.goal_id].push(c);
        });
        setManagerComments(commentMap);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load direct report check-in data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleCommentChange = (goalId, val) => {
    setCommentInputs((prev) => ({
      ...prev,
      [goalId]: val
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

  const handleSubmitComment = async (goalId) => {
    const text = commentInputs[goalId];
    if (!text || !text.trim()) return;

    setCommentLoading((prev) => ({ ...prev, [goalId]: true }));
    try {
      const payload = {
        goal_id: goalId,
        quarter: selectedQuarter,
        comment: text
      };

      const res = await api.post(`/manager/goals/${goalId}/checkin`, payload);

      // Add new comment to local state list
      setManagerComments((prev) => {
        const copy = { ...prev };
        if (!copy[goalId]) copy[goalId] = [];
        copy[goalId].push(res.data);
        return copy;
      });

      // Clear input
      setCommentInputs((prev) => ({ ...prev, [goalId]: '' }));
    } catch (err) {
      console.error(err);
      setError('Failed to submit manager comment.');
    } finally {
      setCommentLoading((prev) => ({ ...prev, [goalId]: false }));
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
          This employee does not have an Approved & Locked goal sheet for cycle {activeCycle?.name || ''} yet.
        </p>
        <button
          onClick={() => navigate('/team')}
          className="inline-flex items-center space-x-2 py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-350 text-sm hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
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
              <h2 className="text-2xl font-extrabold text-slate-100">{employee?.name}'s Check-ins</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">Submit coaching notes and evaluate quarterly progress</p>
          </div>
        </div>

        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
          className="block py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
        >
          <option value="q1">Quarter 1 (Q1)</option>
          <option value="q2">Quarter 2 (Q2)</option>
          <option value="q3">Quarter 3 (Q3)</option>
          <option value="q4">Quarter 4 (Q4)</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-4 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Goal Check-ins list */}
      <div className="space-y-6">
        {sheet.goals.map((g) => {
          const ach = achievements[g.id]?.[selectedQuarter];
          const commentsList = (managerComments[g.id] || []).filter(c => c.quarter === selectedQuarter);
          const inputVal = commentInputs[g.id] || '';
          const isSubmitting = commentLoading[g.id];
          const progressVal = ach ? calculateProgressScore(g, ach.actual, ach.status) : 0;

          return (
            <div 
              key={g.id}
              className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6 space-y-6"
            >
              {/* Top Goal Detail */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {g.thrust_area}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      UoM: {g.uom}
                    </span>
                  </div>
                  <h4 className="text-md font-bold text-slate-200 leading-snug">{g.title}</h4>
                  <p className="text-xs text-slate-500">Target Value: {g.target}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-550 uppercase tracking-wider">Reported Progress</p>
                  <div className="mt-1">
                    <ProgressScore score={progressVal} />
                  </div>
                </div>
              </div>

              {/* Employee Reported Achievement Data */}
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Employee Performance Check-in</span>
                </h5>
                {ach ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400">
                    <div>
                      <p className="text-xs text-slate-500">Actual Value</p>
                      <p className="font-semibold text-slate-300 mt-0.5">{ach.actual}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Report Date</p>
                      <p className="font-semibold text-slate-300 mt-0.5">
                        {new Date(ach.actual_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <span className="capitalize inline-block mt-0.5 font-semibold text-indigo-350">{ach.status.replace('_', ' ')}</span>
                    </div>
                    <div className="md:col-span-3 pt-2 border-t border-slate-850/50">
                      <p className="text-xs text-slate-500">Employee Notes</p>
                      <p className="text-slate-300 mt-0.5 italic">"{ach.notes || 'No notes provided.'}"</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-550 italic">
                    Employee has not submitted progress for {selectedQuarter.toUpperCase()} yet.
                  </p>
                )}
              </div>

              {/* Manager Feedback Stream */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Manager Feedback Stream</span>
                </h5>

                {/* Past comments */}
                {commentsList.length > 0 && (
                  <div className="space-y-3">
                    {commentsList.map((c) => (
                      <div 
                        key={c.id}
                        className="bg-slate-950/20 border border-slate-850 rounded-xl p-3.5 flex items-start space-x-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/10 flex items-center justify-center font-bold text-indigo-400 text-xs shrink-0 mt-0.5">
                          M
                        </div>
                        <div>
                          <p className="text-sm text-slate-200">{c.comment}</p>
                          <span className="text-xs text-slate-500 block mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Entry form */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => handleCommentChange(g.id, e.target.value)}
                    placeholder="Provide performance feedback or course correction..."
                    className="flex-1 py-2 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                  />
                  <button
                    onClick={() => handleSubmitComment(g.id)}
                    disabled={isSubmitting || !inputVal.trim()}
                    className="flex items-center justify-center p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/35 text-slate-100 transition-colors shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
