import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import supabase from './supabaseClient';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import IntakeForm from './components/IntakeForm';
import Predictor from './components/Predictor';
import ViewPlan from './components/ViewPlan';
import ProtectedRoute from './components/ProtectedRoute';

const Navigation = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav style={{
      background: 'var(--darker-bg)',
      padding: '15px 20px',
      boxShadow: '0 2px 10px var(--shadow)',
      marginBottom: '20px',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/dashboard" style={{
            color: 'var(--primary)',
            textDecoration: 'none',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Stronger Runner
          </Link>
          <Link to="/dashboard" style={{
            color: 'var(--text-light)',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            transition: 'all 0.2s',
            fontSize: '14px'
          }}>
            Dashboard
          </Link>
          <Link to="/intake" style={{
            color: 'var(--text-light)',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            transition: 'all 0.2s',
            fontSize: '14px'
          }}>
            New Plan
          </Link>
          <Link to="/predictor" style={{
            color: 'var(--text-light)',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            transition: 'all 0.2s',
            fontSize: '14px'
          }}>
            Predictor
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--text-muted)',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <div>
        <Navigation />
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/intake" element={
            <ProtectedRoute>
              <IntakeForm />
            </ProtectedRoute>
          } />
          <Route path="/intake/:planId" element={
            <ProtectedRoute>
              <IntakeForm />
            </ProtectedRoute>
          } />
          <Route path="/predictor" element={
            <ProtectedRoute>
              <Predictor />
            </ProtectedRoute>
          } />
          <Route path="/plan/:planId" element={
            <ProtectedRoute>
              <ViewPlan />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App; 