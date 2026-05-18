import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';

// Employee Pages
import MyGoals from './pages/employee/MyGoals';
import GoalSheetBuilder from './pages/employee/GoalSheetBuilder';
import QuarterlyCheckin from './pages/employee/QuarterlyCheckin';

// Manager Pages
import TeamDashboard from './pages/manager/TeamDashboard';
import ApprovalPanel from './pages/manager/ApprovalPanel';
import ManagerCheckin from './pages/manager/ManagerCheckin';

// Admin Pages
import UserManager from './pages/admin/UserManager';
import CycleManager from './pages/admin/CycleManager';
import SharedGoals from './pages/admin/SharedGoals';
import Reports from './pages/admin/Reports';
import AuditLog from './pages/admin/AuditLog';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'employee') return <Navigate to="/my-goals" replace />;
    if (user.role === 'manager') return <Navigate to="/team" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const RootRedirect = () => {
  const { user, token } = useAuth();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role === 'employee') return <Navigate to="/my-goals" replace />;
  if (user.role === 'manager') return <Navigate to="/team" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
  
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<RootRedirect />} />
          
          {/* Employee Routes */}
          <Route path="my-goals" element={
            <ProtectedRoute allowedRoles={['employee']}><MyGoals /></ProtectedRoute>
          } />
          <Route path="my-goals/edit/:sheetId" element={
            <ProtectedRoute allowedRoles={['employee']}><GoalSheetBuilder /></ProtectedRoute>
          } />
          <Route path="my-goals/new" element={
            <ProtectedRoute allowedRoles={['employee']}><GoalSheetBuilder /></ProtectedRoute>
          } />
          <Route path="check-in" element={
            <ProtectedRoute allowedRoles={['employee']}><QuarterlyCheckin /></ProtectedRoute>
          } />

          {/* Manager Routes */}
          <Route path="team" element={
            <ProtectedRoute allowedRoles={['manager']}><TeamDashboard /></ProtectedRoute>
          } />
          <Route path="team/approve/:employeeId/:sheetId" element={
            <ProtectedRoute allowedRoles={['manager']}><ApprovalPanel /></ProtectedRoute>
          } />
          <Route path="team/check-in/:userId" element={
            <ProtectedRoute allowedRoles={['manager']}><ManagerCheckin /></ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}><UserManager /></ProtectedRoute>
          } />
          <Route path="admin/cycles" element={
            <ProtectedRoute allowedRoles={['admin']}><CycleManager /></ProtectedRoute>
          } />
          <Route path="admin/shared" element={
            <ProtectedRoute allowedRoles={['admin']}><SharedGoals /></ProtectedRoute>
          } />
          <Route path="admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>
          } />
          <Route path="admin/audit-logs" element={
            <ProtectedRoute allowedRoles={['admin']}><AuditLog /></ProtectedRoute>
          } />
          <Route path="admin/analytics" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}><AnalyticsDashboard /></ProtectedRoute>
          } />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
