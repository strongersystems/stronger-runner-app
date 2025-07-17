import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    if (password !== confirmPassword) {
      setSuccess('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setSuccess('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NODE_ENV === 'production'
            ? 'https://running.stronger.systems'
            : 'http://localhost:8888',
        },
      });

      if (error) throw error;

      if (data.user) {
        setSuccess('Account created successfully! Please check your email for verification.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      setSuccess(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      },
    });
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
          color: 'var(--text-light)', 
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '30px'
        }}>
          Create Account
        </h1>

        {success && (
          <div style={{ 
            background: 'rgba(5, 150, 105, 0.1)', 
            color: 'var(--success)', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid var(--success)',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'var(--text-light)', 
              marginBottom: '8px',
              fontWeight: '500'
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
              color: 'var(--text-light)', 
              marginBottom: '8px',
              fontWeight: '500'
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'var(--text-light)', 
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: '100%' }}
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ width: '100%', marginBottom: '20px' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            background: '#fff',
            color: '#222',
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: '12px',
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C36.68 2.36 30.77 0 24 0 14.82 0 6.71 5.1 2.69 12.55l7.98 6.2C12.13 13.13 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.02l7.19 5.6C43.93 37.13 46.1 31.36 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.75c-1.04-3.13-1.04-6.52 0-9.65l-7.98-6.2C.9 16.36 0 20.06 0 24c0 3.94.9 7.64 2.69 11.1l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.48 0 11.92-2.15 15.89-5.85l-7.19-5.6c-2.01 1.35-4.6 2.15-8.7 2.15-6.38 0-11.87-3.63-14.33-8.85l-7.98 6.2C6.71 42.9 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
          Sign up / Sign in with Google
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '10px', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 