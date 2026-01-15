import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import UploadPage from './pages/UploadPage';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Forecasting from './pages/Forecasting';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Intelligence from './pages/Intelligence';
import Login from './pages/Login';
import Register from './pages/Register';
import { isAuthenticated, getUser, getToken } from './api/auth';
import api from './api';

const SESSION_KEY = 'pharma_session_id';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => isAuthenticated());
  const [sessionId, setSessionId] = useState<string | null>(() => {
    const user = getUser();
    if (user?.session_id) return user.session_id;
    const saved = localStorage.getItem(SESSION_KEY);
    return saved && saved.trim().length > 0 ? saved : null;
  });

  const [checkingSession, setCheckingSession] = useState(false);
  const isDataReady = useMemo(() => Boolean(sessionId), [sessionId]);

  // Persist sessionId
  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionId]);

  // Validate saved session against backend
  useEffect(() => {
    const validate = async () => {
      if (!sessionId) return;
      setCheckingSession(true);
      try {
        await api.get(`/date-range/${sessionId}`);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          localStorage.removeItem(SESSION_KEY);
          setSessionId(null);
        }
      } finally {
        setCheckingSession(false);
      }
    };
    validate();
  }, [sessionId]);

  const handleDataReady = (newSessionId: string) => {
    const clean = newSessionId?.trim();
    if (!clean) return;
    setSessionId(clean);
    
    // Update session on backend if logged in
    if (isLoggedIn && getToken()) {
      api.put(`/auth/session/${clean}`, null, {
        headers: { Authorization: `Bearer ${getToken()}` }
      }).catch(console.error);
    }
  };

  const handleReset = () => {
    setSessionId(null);
  };

  const handleAuth = () => {
    setIsLoggedIn(true);
    const user = getUser();
    if (user?.session_id) {
      setSessionId(user.session_id);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSessionId(null);
    localStorage.removeItem(SESSION_KEY);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes - always accessible */}
        <Route path="/login" element={
          isLoggedIn ? <Navigate to="/" replace /> : <Login onLogin={handleAuth} />
        } />
        <Route path="/register" element={
          isLoggedIn ? <Navigate to="/" replace /> : <Register onRegister={handleAuth} />
        } />

        {/* Protected routes */}
        {!isLoggedIn ? (
          <Route path="*" element={<Navigate to="/login" replace />} />
        ) : !isDataReady ? (
          <>
            <Route path="/" element={<UploadPage onDataReady={handleDataReady} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="/" element={<Layout sessionId={sessionId!} onReset={handleReset} onLogout={handleLogout} />}>
            <Route index element={<Dashboard sessionId={sessionId!} />} />
            <Route path="products" element={<Products sessionId={sessionId!} />} />
            <Route path="forecasting" element={<Forecasting sessionId={sessionId!} />} />
            <Route path="inventory" element={<Inventory sessionId={sessionId!} />} />
            <Route path="reports" element={<Reports sessionId={sessionId!} />} />
            <Route path="intelligence" element={<Intelligence sessionId={sessionId!} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;