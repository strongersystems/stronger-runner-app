import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h1 style={{ 
          textAlign: 'center', 
          color: 'var(--neon-cyan)', 
          textShadow: '0 0 10px var(--neon-cyan)',
          marginBottom: '30px'
        }}>
          Login
        </h1>

        {error && (
          <div style={{ 
            background: 'rgba(255, 0, 0, 0.1)', 
            color: '#ff6b6b', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            border: '1px solid #ff6b6b'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'var(--neon-cyan)', 
              marginBottom: '5px' 
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
              placeholder="Enter your email"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'var(--neon-cyan)', 
              marginBottom: '5px' 
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%' }}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ width: '100%', marginBottom: '20px' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '10px' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--neon-cyan)' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 