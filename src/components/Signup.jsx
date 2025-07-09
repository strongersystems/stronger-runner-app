import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setSuccess('Account created successfully! Please check your email for verification.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
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
          Sign Up
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

        {success && (
          <div style={{ 
            background: 'rgba(0, 255, 0, 0.1)', 
            color: '#51cf66', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            border: '1px solid #51cf66'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSignup}>
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'var(--neon-cyan)', 
              marginBottom: '5px' 
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '10px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--neon-cyan)' }}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 