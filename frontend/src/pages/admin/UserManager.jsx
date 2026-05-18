import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { 
  Users, 
  Plus, 
  Edit3, 
  X, 
  Save, 
  AlertCircle, 
  RefreshCw, 
  UserCheck, 
  Shield, 
  Briefcase 
} from 'lucide-react';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('');
  const [managerId, setManagerId] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch user database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setSelectedUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setDepartment('');
    setManagerId('');
  };

  const handleEditClick = (u) => {
    setSelectedUserId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword(''); // don't load password hashes
    setRole(u.role);
    setDepartment(u.department || '');
    setManagerId(u.manager_id || '');
    setShowForm(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!name || !email || (!selectedUserId && !password)) {
      setError('Please provide all mandatory fields.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const payload = {
        name,
        email,
        role,
        department: department || null,
        manager_id: managerId || null
      };

      if (selectedUserId) {
        // Edit User
        const editPayload = { ...payload };
        if (password) editPayload.password = password; // only edit if updated
        await api.patch(`/admin/users/${selectedUserId}`, editPayload);
      } else {
        // Create User
        await api.post('/admin/users', { ...payload, password });
      }

      resetForm();
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save user.');
    } finally {
      setActionLoading(false);
    }
  };

  const managers = users.filter(u => u.role === 'manager');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            User Account Management
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Provision roles, manage departments, and assign direct report organizational relationships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-880 transition-all cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-4 flex items-start space-x-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* User Form Sidebar / Overlay Panel */}
      {showForm && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-200">
              {selectedUserId ? 'Edit User Attributes' : 'Provision New User'}
            </h3>
            <button 
              onClick={resetForm}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                placeholder="e.g. Sarah Connor"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={!!selectedUserId}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm disabled:opacity-50"
                placeholder="e.g. sarah@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required={!selectedUserId}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                placeholder={selectedUserId ? '•••••••• (unchanged)' : '••••••••'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                placeholder="e.g. Finance"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Direct Manager
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
              >
                <option value="">No Manager / Self</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.department || 'Operations'})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end gap-3 pt-2">
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
                <span>Save User Account</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Database Grid/Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-955/40">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Reports to</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 bg-slate-900/10">
              {users.map((u) => {
                const reportManager = users.find(m => m.id === u.manager_id);
                return (
                  <tr key={u.id} className="hover:bg-slate-850/20 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-600/10 flex items-center justify-center font-bold text-indigo-400 text-sm border border-indigo-500/20">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        u.role === 'admin' 
                          ? 'bg-red-500/10 text-red-300 border-red-500/20' 
                          : u.role === 'manager' 
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      }`}>
                        {u.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                        <span className="capitalize">{u.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-350">
                      {u.department || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-350">
                      {reportManager ? (
                        <span className="font-semibold text-slate-300">{reportManager.name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Self / Executive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-950/40 text-indigo-400 hover:text-indigo-300 border border-slate-700/30 transition-all cursor-pointer"
                        title="Configure profile"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
