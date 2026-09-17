import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, agent-detail, tickets, docs, reports, admin, notes
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [ticketFilter, setTicketFilter] = useState({ statuses: [], priority: '', search: '', agent: '' });
  const [taskFilter, setTaskFilter] = useState({ status: '', priority: '', category: '', search: '' });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  const [isHelpdeskOnline, setIsHelpdeskOnline] = useState(true);

  // In-memory cache stores
  const teamDashboardCacheRef = useRef(null);
  const agentWorkspaceCacheRef = useRef({});
  const ticketListCacheRef = useRef({});
  const ticketDetailsCacheRef = useRef({});

  const clearCache = useCallback(() => {
    teamDashboardCacheRef.current = null;
    agentWorkspaceCacheRef.current = {};
    ticketListCacheRef.current = {};
    ticketDetailsCacheRef.current = {};
  }, []);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('casco_token');
    if (!token) return;
    try {
      const res = await api.get('/dashboard/notifications');
      setNotifications(res.data || []);
      setUnreadCount((res.data || []).length);
    } catch (e) {
      console.warn('Failed to fetch notifications', e);
    }
  }, []);

  // Fetch Team Dashboard with caching
  const getTeamDashboard = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && teamDashboardCacheRef.current) {
      return teamDashboardCacheRef.current;
    }
    const res = await api.get('/dashboard/team');
    teamDashboardCacheRef.current = res.data;
    return res.data;
  }, []);

  // Fetch Agent Workspace with caching
  const getAgentWorkspace = useCallback(async (agentId, forceRefresh = false) => {
    if (!agentId) return null;
    if (!forceRefresh && agentWorkspaceCacheRef.current[agentId]) {
      return agentWorkspaceCacheRef.current[agentId];
    }
    const res = await api.get(`/dashboard/agents/${agentId}`);
    agentWorkspaceCacheRef.current[agentId] = res.data;
    return res.data;
  }, []);

  // Fetch Tickets List with caching
  const getTickets = useCallback(async (filterParams = {}, forceRefresh = false) => {
    const queryKey = JSON.stringify(filterParams);
    if (!forceRefresh && ticketListCacheRef.current[queryKey]) {
      return ticketListCacheRef.current[queryKey];
    }
    const params = new URLSearchParams();
    if (filterParams.status) params.append('status', filterParams.status);
    if (filterParams.priority) params.append('priority', filterParams.priority);
    if (filterParams.search) params.append('search', filterParams.search);
    if (filterParams.agent) params.append('agent_id', filterParams.agent);

    const res = await api.get(`/tickets?${params.toString()}`);
    const data = res.data || [];
    ticketListCacheRef.current[queryKey] = data;
    return data;
  }, []);

  // Fetch Ticket Detail with caching
  const getTicketDetail = useCallback(async (ticketId, forceRefresh = false) => {
    if (!ticketId) return null;
    if (!forceRefresh && ticketDetailsCacheRef.current[ticketId]) {
      return ticketDetailsCacheRef.current[ticketId];
    }
    try {
      const res = await api.get(`/helpdesk/tickets/${ticketId}`);
      if (res.data?.ticket) {
        ticketDetailsCacheRef.current[ticketId] = res.data.ticket;
        return res.data.ticket;
      }
    } catch (e) {
      // Fallback
      const res2 = await api.get(`/tickets/${ticketId}`);
      if (res2.data) {
        ticketDetailsCacheRef.current[ticketId] = res2.data;
        return res2.data;
      }
    }
    return null;
  }, []);

  const triggerSync = async () => {
    try {
      const res = await api.post('/helpdesk/sync');
      setLastSyncTime(new Date().toLocaleTimeString());
      setIsHelpdeskOnline(res.data.is_online);
      // Invalidate caches upon sync
      clearCache();
      fetchNotifications();
      return res.data;
    } catch (e) {
      setIsHelpdeskOnline(false);
      return { status: 'warning', message: 'Helpdesk offline. Showing cached tickets.' };
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('casco_token');
    if (token) {
      fetchNotifications();
      const timer = setInterval(fetchNotifications, 60000);
      return () => clearInterval(timer);
    }
  }, [fetchNotifications]);

  const navigateToTicketsWithFilter = (filterObj) => {
    setTicketFilter(prev => ({ ...prev, ...filterObj }));
    setActiveTab('tickets');
  };

  const navigateToTasksWithFilter = (filterObj) => {
    setTaskFilter(prev => ({ ...prev, ...filterObj }));
    setActiveTab('tasks');
  };

  const navigateToAgentWorkspace = (agentId) => {
    setSelectedAgentId(agentId);
    setActiveTab('agent-detail');
  };

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab,
      selectedAgentId, setSelectedAgentId,
      ticketFilter, setTicketFilter,
      taskFilter, setTaskFilter,
      searchModalOpen, setSearchModalOpen,
      notifications, unreadCount,
      lastSyncTime, isHelpdeskOnline,
      triggerSync,
      clearCache,
      getTeamDashboard,
      getAgentWorkspace,
      getTickets,
      getTicketDetail,
      navigateToTicketsWithFilter,
      navigateToTasksWithFilter,
      navigateToAgentWorkspace
    }}>
      {children}
    </AppContext.Provider>
  );
};

