import React from 'react';

const SessionDetailsModal = ({ session, onClose, unitPreference }) => {
  if (!session || !session.session_details) {
    return null;
  }

  const { session_details } = session;
  const unit = unitPreference === 'metric' ? 'km' : 'miles';
  const paceUnit = unitPreference === 'metric' ? 'min/km' : 'min/mile';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '15px'
        }}>
          <div>
            <h2 style={{
              color: 'var(--text-light)',
              fontSize: '24px',
              fontWeight: '700',
              margin: 0
            }}>
              {session.day} - {session.workout}
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '16px',
              margin: '5px 0 0 0'
            }}>
              {session.volume} {unit}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '5px'
            }}
          >
            ×
          </button>
        </div>

        {/* Session Brief */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            color: 'var(--text-light)',
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '10px'
          }}>
            Session Overview
          </h3>
          <p style={{
            color: 'var(--text-light)',
            fontSize: '16px',
            lineHeight: '1.6',
            margin: 0
          }}>
            {session_details.brief}
          </p>
        </div>

        {/* Target Information */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {session_details.target_pace && session_details.target_pace !== 'N/A' && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{
                color: 'var(--text-light)',
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Target Pace
              </h4>
              <p style={{
                color: 'var(--text-light)',
                fontSize: '16px',
                fontWeight: '500',
                margin: 0
              }}>
                {session_details.target_pace}
              </p>
            </div>
          )}

          {session.heart_rate_range && session.heart_rate_range[0] > 0 && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{
                color: 'var(--text-light)',
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Heart Rate Zone
              </h4>
              <p style={{
                color: 'var(--text-light)',
                fontSize: '16px',
                fontWeight: '500',
                margin: 0
              }}>
                {session.heart_rate_range[0]}-{session.heart_rate_range[1]} bpm
              </p>
            </div>
          )}

          {session.rpe_range && session.rpe_range[0] > 0 && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{
                color: 'var(--text-light)',
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                RPE Range
              </h4>
              <p style={{
                color: 'var(--text-light)',
                fontSize: '16px',
                fontWeight: '500',
                margin: 0
              }}>
                RPE {session.rpe_range[0]}-{session.rpe_range[1]}
              </p>
            </div>
          )}

          {session_details.effort_level && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <h4 style={{
                color: 'var(--text-light)',
                fontSize: '14px',
                fontWeight: '600',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Effort Level
              </h4>
              <p style={{
                color: 'var(--text-light)',
                fontSize: '16px',
                fontWeight: '500',
                margin: 0
              }}>
                {session_details.effort_level}
              </p>
            </div>
          )}
        </div>

        {/* Session Structure */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            color: 'var(--text-light)',
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '15px'
          }}>
            Session Structure
          </h3>
          
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{
              color: 'var(--text-light)',
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              Warmup
            </h4>
            <p style={{
              color: 'var(--text-light)',
              fontSize: '15px',
              lineHeight: '1.5',
              margin: 0,
              padding: '12px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              {session_details.warmup}
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h4 style={{
              color: 'var(--text-light)',
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              Main Set
            </h4>
            <p style={{
              color: 'var(--text-light)',
              fontSize: '15px',
              lineHeight: '1.5',
              margin: 0,
              padding: '12px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              {session_details.main_set}
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h4 style={{
              color: 'var(--text-light)',
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              Cooldown
            </h4>
            <p style={{
              color: 'var(--text-light)',
              fontSize: '15px',
              lineHeight: '1.5',
              margin: 0,
              padding: '12px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              {session_details.cooldown}
            </p>
          </div>
        </div>

        {/* Tips */}
        {session_details.tips && session_details.tips.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              color: 'var(--text-light)',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '15px'
            }}>
              Tips for This Session
            </h3>
            <ul style={{
              color: 'var(--text-light)',
              fontSize: '15px',
              lineHeight: '1.6',
              margin: 0,
              paddingLeft: '20px'
            }}>
              {session_details.tips.map((tip, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Equipment */}
        {session_details.equipment && session_details.equipment.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              color: 'var(--text-light)',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '15px'
            }}>
              Equipment Needed
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {session_details.equipment.map((item, index) => (
                <span key={index} style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '30px'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionDetailsModal; 