import React, { createContext, useState } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Always start on login screen upon opening or reloading the application
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const login = async (username, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', { username, password });
      const { access_token, user: userData } = res.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('casco_token', access_token);
      localStorage.setItem('casco_user', JSON.stringify(userData));
      return true;
    } catch (err) {
      setAuthError(err.userMessage || 'Invalid username or password.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore logout errors
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('casco_token');
      localStorage.removeItem('casco_user');
    }
  };


  return (
    <AuthContext.Provider value={{ user, token, loading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

