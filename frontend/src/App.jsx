import React, { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { AppProvider, AppContext } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { QuickSearchModal } from './components/common/QuickSearchModal';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AgentDetailPage } from './pages/AgentDetailPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { MyUpdatesPage } from './pages/MyUpdatesPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminPage } from './pages/AdminPage';
import { PersonalNotesPage } from './pages/PersonalNotesPage';

const AppContent = () => {
  const { user } = useContext(AuthContext);
  const { activeTab } = useContext(AppContext);

  if (!user) {
    return <LoginPage />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'agent-detail': return <AgentDetailPage />;
      case 'tickets': return <MyTicketsPage />;
      case 'tasks': return <MyTasksPage />;
      case 'updates': return <MyUpdatesPage />;
      case 'docs': return <KnowledgePage />;
      case 'kb': return <KnowledgePage />;
      case 'reports': return <ReportsPage />;
      case 'admin': return <AdminPage />;
      case 'notes': return <PersonalNotesPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="app-container">
      <Header />
      <Navigation />
      <main className="main-content">
        {renderTabContent()}
      </main>
      <QuickSearchModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
