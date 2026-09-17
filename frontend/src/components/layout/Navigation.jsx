import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { AuthContext } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  UserCheck, 
  Ticket, 
  BookOpen, 
  BarChart3, 
  Users, 
  StickyNote
} from 'lucide-react';

export const Navigation = () => {
  const { activeTab, setActiveTab, setSelectedAgentId } = useContext(AppContext);
  const { user } = useContext(AuthContext);

  const handleMyWorkspaceClick = () => {
    setSelectedAgentId(user?.user_id || user?.id);
    setActiveTab('agent-detail');
  };

  const navItems = [
    { id: 'dashboard', label: 'Team Dashboard', icon: LayoutDashboard, onClick: () => setActiveTab('dashboard') },
    { id: 'agent-detail', label: 'My Workspace', icon: UserCheck, onClick: handleMyWorkspaceClick },
    { id: 'tickets', label: 'Team Tickets', icon: Ticket, onClick: () => setActiveTab('tickets') },
    { id: 'admin', label: 'Manage Users', icon: Users, onClick: () => setActiveTab('admin') },
    { id: 'docs', label: 'Knowledge & Docs', icon: BookOpen, onClick: () => setActiveTab('docs') },
    { id: 'reports', label: 'Reports', icon: BarChart3, onClick: () => setActiveTab('reports') },
    { id: 'notes', label: 'Personal Notes', icon: StickyNote, onClick: () => setActiveTab('notes') },
  ];

  return (
    <nav className="casco-nav">
      <ul className="nav-links">
        {navItems.map(item => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li key={item.id} className={`nav-item ${isActive ? 'active' : ''}`}>
              <button onClick={item.onClick}>
                <IconComponent size={16} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
