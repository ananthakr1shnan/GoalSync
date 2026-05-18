import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setApiToken } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    // Note: FastAPI OAuth2PasswordRequestForm requires form-data
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    try {
      const { data } = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      setToken(data.access_token);
      setApiToken(data.access_token);
      
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);
      return userRes.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setApiToken(null);
  }, []);

  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };
    window.addEventListener('auth:logout', handleLogoutEvent);
    setLoading(false);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
