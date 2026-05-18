import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, 
  Target, 
  Calendar, 
  Users, 
  Shield, 
  FileText, 
  FileCheck,
  History,
  TrendingUp
} from 'lucide-react';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const employeeLinks = [
    { to: '/my-goals', label: 'My Goals', icon: Target },
    { to: '/check-in', label: 'Quarterly Check-in', icon: FileCheck },
  ];

  const managerLinks = [
    { to: '/team', label: 'Team Dashboard', icon: Users },
    { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  ];

  const adminLinks = [
    { to: '/admin/users', label: 'User Manager', icon: Users },
    { to: '/admin/cycles', label: 'Cycle Manager', icon: Calendar },
    { to: '/admin/shared', label: 'Shared Goals', icon: Shield },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: History },
    { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  ];

  let links = [];
  if (user?.role === 'employee') links = employeeLinks;
  else if (user?.role === 'manager') links = managerLinks;
  else if (user?.role === 'admin') links = adminLinks;

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link to="/" className="flex items-center space-x-2 text-indigo-400 font-extrabold text-xl tracking-tight">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">GoalSync</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active 
                    ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-slate-100 text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || 'Role'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-slate-100 font-medium text-xs border border-slate-700/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              Goal Management System
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Department</p>
              <p className="text-sm font-medium text-slate-300">{user?.department || 'Operations'}</p>
            </div>
          </div>
        </header>

        {/* Screen Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
