import React from 'react';

const IntakeForm = () => {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: 40, background: '#23272f', borderRadius: 16 }}>
        <h1 style={{ color: '#fc5200', fontSize: 32, fontWeight: 800, marginBottom: 18 }}>Create A Plan</h1>
        <p style={{ color: '#ffe066', fontSize: 20, marginBottom: 32 }}>Coming Soon!</p>
        <button disabled style={{ width: '100%', background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '16px', fontWeight: 700, fontSize: 18, opacity: 0.7, cursor: 'not-allowed' }}>
          🚧 Coming Soon 🚧
        </button>
      </div>
    </div>
  );
};

export default IntakeForm; 