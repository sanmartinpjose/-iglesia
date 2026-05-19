/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './components/dashboard/Dashboard';
import { MemberManagement } from './components/members/MemberManagement';
import { TreasuryManagement } from './components/treasury/TreasuryManagement';
import { Submissions } from './components/treasury/Submissions';
import { Settings } from './components/settings/Settings';
import { AttendanceHistory } from './components/attendance/AttendanceHistory';
import { ChurchSetup } from './components/auth/ChurchSetup';

const AppContent = () => {
  const { user, church, churchLoading, loading: authLoading, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (authLoading || churchLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user && !church) {
    return <ChurchSetup />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'members':
        return <MemberManagement />;
      case 'attendance':
        return <AttendanceHistory />;
      case 'treasury':
        return <TreasuryManagement />;
      case 'submissions':
        return hasRole(['Tesorero', 'Pastor']) ? <Submissions /> : <Dashboard onNavigate={setActiveTab} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <Shell activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Shell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
