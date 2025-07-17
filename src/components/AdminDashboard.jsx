import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const fetchUsersFromEdge = async () => {
  const session = await supabase.auth.getSession();
  const jwt = session.data.session?.access_token;
  if (!jwt) return [];
  const res = await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/list-users`,
    {
      headers: { Authorization: `Bearer ${jwt}` },
    }
  );
  if (!res.ok) return [];
  const { users } = await res.json();
  return users || [];
};

const fetchPredictionsForUser = async (userId) => {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return error ? [] : data;
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [modalPredictions, setModalPredictions] = useState([]);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isAdmin = user?.user_metadata?.role === 'admin' || user?.raw_user_meta_data?.role === 'admin';
      if (!user || !isAdmin) {
        navigate('/dashboard');
        return;
      }
      // Fetch all users from Edge Function
      const usersData = await fetchUsersFromEdge();
      // Fetch all predictions
      const { data: predictionsData } = await supabase.from('predictions').select('user_id');
      const safePredictions = Array.isArray(predictionsData) ? predictionsData : [];
      const userList = usersData.map(u => ({
        ...u,
        predictionCount: safePredictions.filter(p => p.user_id === u.id).length
      }));
      setUsers(userList);
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const openPredictionsModal = async (user) => {
    setModalUser(user);
    setModalOpen(true);
    setModalPredictions([]);
    setSelectedPrediction(null); // Reset selected prediction when opening modal
    const preds = await fetchPredictionsForUser(user.id);
    setModalPredictions(preds);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalUser(null);
    setModalPredictions([]);
    setSelectedPrediction(null);
  };

  if (loading) return <div style={{ color: '#fc5200', textAlign: 'center', marginTop: 40 }}>Loading admin dashboard...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', background: '#23272f', color: '#fff', borderRadius: 12, padding: 24 }}>
      <h1 style={{ color: '#fc5200', marginBottom: 24 }}>Admin Dashboard</h1>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ minWidth: 600, width: '100%', borderCollapse: 'collapse', background: '#181c24', borderRadius: 8, fontSize: 15 }}>
          <thead>
            <tr>
              <th style={{ padding: 12, textAlign: 'left', color: '#ffe066' }}>Email</th>
              <th style={{ padding: 12, textAlign: 'center', color: '#ffe066' }}>Role</th>
              <th style={{ padding: 12, textAlign: 'center', color: '#ffe066' }}>Date Joined</th>
              <th style={{ padding: 12, textAlign: 'center', color: '#ffe066' }}>Last Login</th>
              <th style={{ padding: 12, textAlign: 'center', color: '#ffe066' }}>Predictions</th>
              <th style={{ padding: 12, textAlign: 'center', color: '#ffe066' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: 12, wordBreak: 'break-all' }}>{user.email}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <span style={{
                    color: user.role === 'admin' ? '#ffe066' : '#10b981',
                    fontWeight: user.role === 'admin' ? 700 : 500,
                    background: user.role === 'admin' ? 'rgba(252,82,0,0.15)' : 'rgba(16,185,129,0.15)',
                    padding: '4px 10px',
                    borderRadius: 8
                  }}>{user.role || 'user'}</span>
                </td>
                <td style={{ padding: 12, textAlign: 'center' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : '-'}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{user.predictionCount}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <button
                    onClick={() => openPredictionsModal(user)}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 18px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    View Predictions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Modal for predictions */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#23272f',
            borderRadius: 16,
            padding: 16,
            minWidth: 0,
            maxWidth: 600,
            width: '95%',
            color: '#fff',
            boxShadow: '0 4px 32px 0 #000a',
            position: 'relative',
            overflowX: 'auto'
          }}>
            <h2 style={{ color: '#fc5200', marginBottom: 18, fontSize: 20 }}>Predictions for {modalUser?.email}</h2>
            <button onClick={closeModal} style={{ position: 'absolute', top: 12, right: 18, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
            {modalPredictions.length === 0 ? (
              <div style={{ color: '#ffe066', textAlign: 'center', marginTop: 30 }}>No predictions found.</div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ minWidth: 400, width: '100%', borderCollapse: 'collapse', background: '#181c24', borderRadius: 8, fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 10, color: '#ffe066' }}>Race Type</th>
                      <th style={{ padding: 10, color: '#ffe066' }}>Date</th>
                      <th style={{ padding: 10, color: '#ffe066' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalPredictions.map(pred => (
                      <tr key={pred.id} style={{ borderBottom: '1px solid #333', cursor: 'pointer', background: selectedPrediction && selectedPrediction.id === pred.id ? '#333' : 'inherit' }}
                        onClick={() => setSelectedPrediction(pred)}
                      >
                        <td style={{ padding: 10 }}>{pred.prediction?.raceEntries?.[0]?.distance || '-'}</td>
                        <td style={{ padding: 10 }}>{pred.created_at ? new Date(pred.created_at).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: 10, wordBreak: 'break-all' }}>{pred.prediction?.results ? Object.values(pred.prediction.results).map((r, i) => <span key={i}>{r.time}{i < Object.values(pred.prediction.results).length - 1 ? ', ' : ''}</span>) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Show selected prediction details */}
                {selectedPrediction && (
                  <div style={{ marginTop: 24, background: '#181c24', borderRadius: 8, padding: 16, color: '#ffe066', fontSize: 14 }}>
                    <h3 style={{ color: '#fc5200', marginBottom: 10, fontSize: 17 }}>Prediction Details</h3>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#fff', background: 'none', fontSize: 13, margin: 0 }}>
                      {JSON.stringify(selectedPrediction.prediction, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 700px) {
          div[style*='maxWidth: 1000px'] {
            padding: 8px !important;
          }
          table {
            font-size: 13px !important;
          }
          th, td {
            padding: 6px !important;
          }
          h1 {
            font-size: 20px !important;
          }
        }
        @media (max-width: 500px) {
          div[style*='maxWidth: 1000px'] {
            padding: 2px !important;
          }
          h1 {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard; 