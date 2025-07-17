import React, { useState, useMemo, useEffect } from 'react';
import supabase from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import { FaInfoCircle } from 'react-icons/fa';

const Predictor = () => {
  const distances = useMemo(() => ({
    '1 Mile': 1.60934,
    '5K': 5,
    '10K': 10,
    'Half Marathon': 21.0975,
    'Marathon': 42.195
  }), []);
  const [results, setResults] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [raceEntries, setRaceEntries] = useState([
    { distance: '5K', h: 0, m: 0, s: 0 }
  ]); // Start with one blank row

  // Add state for split section race and units
  const [splitRace, setSplitRace] = useState('Marathon');
  const [splitIsImperial, setSplitIsImperial] = useState(false);

  // Add state for custom target time in split section
  const [splitTargetTime, setSplitTargetTime] = useState('');

  // Add state for saving prediction
  const [saveStatus, setSaveStatus] = useState('');

  // Add state for editing prediction
  const { predictionId } = useParams();
  const [editingPredictionId, setEditingPredictionId] = useState(null);
  const navigate = useNavigate();

  // Add state for info modal
  const [infoModal, setInfoModal] = useState({ open: false, distance: null });

  // Helper for updating a race entry inline
  const updateRaceEntry = (idx, field, value) => {
    setRaceEntries(entries => entries.map((entry, i) =>
      i === idx ? { ...entry, [field]: value } : entry
    ));
  };

  // Add a new blank row
  const addRaceEntry = () => {
    setRaceEntries([...raceEntries, { distance: '5K', h: 0, m: 0, s: 0 }]);
  };

  // Remove a row
  const removeRaceEntry = (idx) => {
    setRaceEntries(entries => entries.filter((_, i) => i !== idx));
  };

  // Calculate times using all valid raceEntries
  const calculateTimes = () => {
    // Build inputs object for each distance
    const inputs = {};
    raceEntries.forEach(entry => {
      // Only use rows with a nonzero time
      if (entry.h > 0 || entry.m > 0 || entry.s > 0) {
        const seconds = entry.h * 3600 + entry.m * 60 + entry.s;
        if (!inputs[entry.distance]) inputs[entry.distance] = [];
        inputs[entry.distance].push(seconds);
      }
    });
    // For each distance, predict using all other distances
    const newResults = {};
    Object.keys(distances).forEach(target => {
      let predictions = [];
      Object.keys(inputs).forEach(known => {
        inputs[known].forEach(knownTime => {
          if (known !== target) {
            predictions.push(predictTime(knownTime, distances[known], distances[target]));
          }
        });
      });
      // If user entered actual time for this distance, use the average
      let actual = null;
      if (inputs[target] && inputs[target].length > 0) {
        actual = inputs[target].reduce((a, b) => a + b) / inputs[target].length;
      }
      const avg = predictions.length ? predictions.reduce((a, b) => a + b) / predictions.length : null;
      newResults[target] = {
        actual,
        predicted: avg,
        lower: avg ? avg * 0.97 : null,
        upper: avg ? avg * 1.03 : null
      };
    });
    setResults(newResults);
    setShowResults(true);
  };



  // Update renderResultsTable for ±4% range and always show icons
  const renderResultsTable = () => {
    // Always show these distances
    const standardDistances = ['1 Mile', '5K', '10K', 'Half Marathon', 'Marathon'];
    const distanceLabels = {
      '1 Mile': '1 Mile',
      '5K': '5K',
      '10K': '10K',
      'Half Marathon': 'Half Marathon',
      'Marathon': 'Marathon',
    };
    return (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
        animation: 'fadeIn 1s ease-in',
        color: '#f8f8f8',
        background: 'var(--dark-bg)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <thead>
          <tr>
            <th style={{
              padding: '12px',
              textAlign: 'center',
              background: '#23272f',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              borderBottom: '2px solid #333',
            }}>
              Distance
            </th>
            <th style={{
              padding: '12px',
              textAlign: 'center',
              background: '#23272f',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              borderBottom: '2px solid #333',
            }}>
              Actual Time
            </th>
            <th style={{
              padding: '12px',
              textAlign: 'center',
              background: '#23272f',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              borderBottom: '2px solid #333',
            }}>
              Predicted Time <FaInfoCircle style={{ cursor: 'pointer', color: '#10b981' }} title="How is this calculated?" onClick={() => setInfoModal({ open: true, distance: 'Predicted' })} />
            </th>
            <th style={{
              padding: '12px',
              textAlign: 'center',
              background: '#23272f',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              borderBottom: '2px solid #333',
            }}>
              Range (±4%)
            </th>
            <th style={{
              padding: '12px',
              textAlign: 'center',
              background: '#23272f',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              borderBottom: '2px solid #333',
            }}>
              Performance
            </th>
          </tr>
        </thead>
        <tbody>
          {standardDistances.map((dist, index) => {
            const result = results[dist] || {};
            let perf = null;
            if (result.actual && result.predicted) {
              const diff = (result.actual - result.predicted) / result.predicted;
              let color = '', text = '', icon = '';
              if (diff < -0.08) {
                color = '#00ff6a'; text = 'Way Faster than Predicted'; icon = '🚀';
              } else if (diff < -0.05) {
                color = '#1ed760'; text = 'Faster than Predicted'; icon = '↑';
              } else if (diff < -0.04) {
                color = '#00bfae'; text = 'Within Range, Outperforming'; icon = '↗';
              } else if (diff < 0) {
                color = '#ffe066'; text = 'Within Range, Slightly Faster'; icon = '↗';
              } else if (diff < 0.04) {
                color = '#ffe066'; text = 'Within Range, Slightly Slower'; icon = '↘';
              } else if (diff < 0.05) {
                color = '#ffb347'; text = 'Within Range, Slightly Slower'; icon = '↘';
              } else if (diff < 0.08) {
                color = '#e4572e'; text = 'Slower than Predicted'; icon = '↓';
              } else {
                color = '#b30000'; text = 'Much Slower than Predicted'; icon = '🛑';
              }
              perf = (
                <span title={text} style={{ background: color, color: '#222', borderRadius: 16, padding: '4px 14px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span> {text}
                </span>
              );
            }
            return (
              <React.Fragment key={dist}>
                <tr style={{
                  background: index % 2 === 0 ? '#23272f' : '#181c24',
                  color: '#f8f8f8',
                  fontSize: 16,
                }}>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>{distanceLabels[dist]}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#ffe066', fontWeight: 700 }}>{result.actual ? secondsToTime(result.actual) : '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#6ec1e4', fontWeight: 700 }}>
                    {result.predicted ? (
                      <>
                        {secondsToTime(result.predicted)}
                        <FaInfoCircle style={{ cursor: 'pointer', color: '#10b981', marginLeft: 6 }} title="How is this calculated?" onClick={() => setInfoModal({ open: true, distance: dist })} />
                      </>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#b388ff', fontWeight: 700 }}>{result.predicted ? `${secondsToTime(result.predicted * 0.96)} - ${secondsToTime(result.predicted * 1.04)}` : '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{perf}</td>
                </tr>
                {/* Show warning row only after Marathon if Mile is entered */}
                {hasMile && dist === 'Marathon' && (
                  <tr>
                    <td colSpan={5} style={{ background: '#fff3cd', color: '#fc5200', fontWeight: 800, fontSize: 14, textAlign: 'center', borderTop: '1px solid #fc5200', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                      ⚠️ 1 Mile time may skew Half Marathon and Marathon predictions
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    );
  };

  // Helper to format seconds as HH:MM:SS
  const formatSecondsToHHMMSS = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  };
  // Helper to parse HH:MM:SS to seconds
  const parseHHMMSS = (str) => {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  };

  // Update splitTargetTime when race/units or predicted time changes
  React.useEffect(() => {
    const predictedTime = results[splitRace]?.predicted;
    if (predictedTime) {
      setSplitTargetTime(formatSecondsToHHMMSS(Math.round(predictedTime)));
    }
  }, [splitRace, splitIsImperial, results, distances]);

  // Load prediction if editing
  useEffect(() => {
    if (predictionId) {
      (async () => {
        const { data } = await supabase.from('predictions').select('*').eq('id', predictionId).single();
        if (data && data.prediction) {
          setRaceEntries(data.prediction.raceEntries || [{ distance: '5K', h: 0, m: 0, s: 0 }]);
          setResults(data.prediction.results || {});
          setShowResults(!!data.prediction.results);
          setSplitRace(data.prediction.splitRace || 'Marathon');
          setSplitIsImperial(!!data.prediction.splitIsImperial);
          setSplitTargetTime(data.prediction.splitTargetTime || '');
          setEditingPredictionId(data.id);
        }
      })();
    }
  }, [predictionId]);

  // Refined split times table: only show pace per km/mi and key chunks
  const renderSplitCard = () => {
    const predictedTime = results[splitRace]?.predicted;
    if (!predictedTime) return null;

    // Use splitTargetTime (editable) for splits
    const targetSeconds = parseHHMMSS(splitTargetTime) || predictedTime;

    let splits = [];
    let paceLabel = '';
    let paceValue = '';
    if (splitIsImperial) {
      // Imperial splits
      const totalMiles = distances[splitRace] / 1.60934;
      paceLabel = 'Pace per Mile';
      paceValue = secondsToTime(targetSeconds / totalMiles) + ' /mi';
      if (splitRace === 'Marathon') {
        splits = [
          { label: '5 Mile', dist: 5 },
          { label: '10 Mile', dist: 10 },
          { label: 'Half', dist: 13.1094 },
          { label: '15 Mile', dist: 15 },
          { label: '20 Mile', dist: 20 },
          { label: '25 Mile', dist: 25 },
          { label: 'Finish', dist: 26.2188 },
        ];
      } else {
        // Half Marathon
        splits = [
          { label: '5 Mile', dist: 5 },
          { label: '10 Mile', dist: 10 },
          { label: 'Half', dist: 13.1094 },
          { label: 'Finish', dist: 13.1094 },
        ];
      }
      splits = splits.filter(s => s.dist <= totalMiles + 0.01);
    } else {
      // Metric splits
      paceLabel = 'Pace per KM';
      paceValue = secondsToTime(targetSeconds / distances[splitRace]) + ' /km';
      if (splitRace === 'Marathon') {
        splits = [
          { label: '5K', dist: 5 },
          { label: '10K', dist: 10 },
          { label: '15K', dist: 15 },
          { label: 'Half Way', dist: 21.0975 },
          { label: '25K', dist: 25 },
          { label: '30K', dist: 30 },
          { label: '35K', dist: 35 },
          { label: '40K', dist: 40 },
          { label: 'Finish', dist: 42.195 },
        ];
      } else {
        // Half Marathon
        splits = [
          { label: '5K', dist: 5 },
          { label: '10K', dist: 10 },
          { label: 'Half Way', dist: 10.54875 },
          { label: 'Finish', dist: 21.0975 },
        ];
      }
      splits = splits.filter(s => s.dist <= distances[splitRace] + 0.01);
    }

    // Helper to get cumulative time for each split
    const getSplitTime = (dist) => {
      const total = splitIsImperial ? distances[splitRace] / 1.60934 : distances[splitRace];
      return secondsToTime(targetSeconds * (dist / total));
    };

    return (
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--darker-bg), var(--dark-bg))',
        boxShadow: '0 0 20px rgba(0, 255, 204, 0.3)',
        textAlign: 'center',
        color: 'var(--text-light)',
        marginTop: 32,
        padding: 18,
        maxWidth: 340,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 10 }}>
          <select value={splitRace} onChange={e => setSplitRace(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 16, background: '#23272f', color: '#fff', border: 'none', outline: 'none' }}>
            <option value="Marathon">Marathon</option>
            <option value="Half Marathon">Half Marathon</option>
          </select>
          <select value={splitIsImperial ? 'imperial' : 'metric'} onChange={e => setSplitIsImperial(e.target.value === 'imperial')} style={{ padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 16, background: '#23272f', color: '#fff', border: 'none', outline: 'none' }}>
            <option value="metric">Metric (km)</option>
            <option value="imperial">Imperial (mi)</option>
          </select>
        </div>
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <label htmlFor="splitTargetTime" style={{ color: '#6ec1e4', fontWeight: 700 }}>Target Time:</label>
          <input
            id="splitTargetTime"
            type="text"
            value={splitTargetTime}
            onChange={e => setSplitTargetTime(e.target.value)}
            style={{
              width: 90,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid #444',
              background: '#181c24',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textAlign: 'center',
              outline: 'none',
            }}
            placeholder="HH:MM:SS"
          />
        </div>
        <h2 style={{
          color: 'var(--neon-cyan)',
          textShadow: '0 0 5px var(--neon-cyan)',
          marginBottom: '10px',
          fontSize: 20,
        }}>
          Split Times ({splitRace}, {splitIsImperial ? 'mi' : 'km'})
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 auto', background: 'transparent', fontSize: 15 }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'left', padding: '4px 0', fontWeight: 700, color: '#6ec1e4' }}>{paceLabel}</td>
              <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700, color: '#ffe066' }}>{paceValue}</td>
            </tr>
            {splits.map((split, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600 }}>{split.label}</td>
                <td style={{ textAlign: 'right', padding: '4px 0', fontWeight: 700 }}>{getSplitTime(split.dist)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const predictTime = (knownTime, knownDist, targetDist) => {
    return knownTime * Math.pow(targetDist / knownDist, fatigueFactor);
  };

  const fatigueFactor = 1.06;

  const handleSavePrediction = async () => {
    setSaveStatus('');
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaveStatus('You must be logged in to save predictions.');
      return;
    }
    if (editingPredictionId) {
      // Update existing prediction
      await supabase.from('predictions').update({
        prediction: {
          raceEntries,
          results,
          splitRace,
          splitIsImperial,
          splitTargetTime,
          savedAt: new Date().toISOString(),
        },
      }).eq('id', editingPredictionId);
      setSaveStatus('Prediction updated!');
    } else {
      // Save new prediction
      await supabase.from('predictions').insert([
        {
          user_id: user.id,
          prediction: {
            raceEntries,
            results,
            splitRace,
            splitIsImperial,
            splitTargetTime,
            savedAt: new Date().toISOString(),
          },
        },
      ]);
      setSaveStatus('Prediction saved!');
    }
  };

  const handleDeletePrediction = async () => {
    if (!editingPredictionId) return;
    if (!window.confirm('Are you sure you want to delete this prediction? This action cannot be undone.')) return;
    await supabase.from('predictions').delete().eq('id', editingPredictionId);
    navigate('/dashboard');
  };

  // UI for entering/editing recent times as editable rows
  const renderRaceEntryRows = () => (
    <div className="card time-input-card" style={{ marginBottom: 20, color: 'var(--text-light)' }}>
      <h3 style={{ color: '#fc5200', marginBottom: 18, fontWeight: 700, fontSize: 22, textAlign: 'center' }}>Enter Recent Times</h3>
      <form style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        padding: '22px 18px 18px 18px',
        boxShadow: '0 1px 8px 0 rgba(0,0,0,0.10)',
        maxWidth: 700,
        margin: '0 auto 8px',
      }} onSubmit={e => { e.preventDefault(); }}>
        {raceEntries.map((entry, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 10 }}>
            {/* Distance */}
            <select
              value={entry.distance}
              onChange={e => updateRaceEntry(idx, 'distance', e.target.value)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: 8,
                background: 'var(--medium-bg)',
                color: 'var(--text-light)',
                fontSize: 18,
                fontWeight: 500,
                outline: 'none',
                height: 48,
                minWidth: 120,
                boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)',
                marginRight: 8
              }}
            >
              <option value="1 Mile">1 Mile</option>
              <option value="5K">5K</option>
              <option value="10K">10K</option>
              <option value="Half Marathon">Half Marathon</option>
              <option value="Marathon">Marathon</option>
            </select>
            {/* Hours */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <label htmlFor={`h-${idx}`} style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>h</label>
              <select
                id={`h-${idx}`}
                value={entry.h}
                onChange={e => updateRaceEntry(idx, 'h', parseInt(e.target.value))}
                style={{ width: 70, border: 'none', borderRadius: 8, background: 'var(--medium-bg)', color: 'var(--text-light)', fontSize: 18, textAlign: 'center', height: 48, fontWeight: 500, outline: 'none', boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)', padding: '0 8px' }}
              >
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            {/* Minutes */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <label htmlFor={`m-${idx}`} style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>m</label>
              <select
                id={`m-${idx}`}
                value={entry.m}
                onChange={e => updateRaceEntry(idx, 'm', parseInt(e.target.value))}
                style={{ width: 70, border: 'none', borderRadius: 8, background: 'var(--medium-bg)', color: 'var(--text-light)', fontSize: 18, textAlign: 'center', height: 48, fontWeight: 500, outline: 'none', boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)', padding: '0 8px' }}
              >
                {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            {/* Seconds */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <label htmlFor={`s-${idx}`} style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>s</label>
              <select
                id={`s-${idx}`}
                value={entry.s}
                onChange={e => updateRaceEntry(idx, 's', parseInt(e.target.value))}
                style={{ width: 70, border: 'none', borderRadius: 8, background: 'var(--medium-bg)', color: 'var(--text-light)', fontSize: 18, textAlign: 'center', height: 48, fontWeight: 500, outline: 'none', boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)', padding: '0 8px' }}
              >
                {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            {/* Remove Button */}
            {raceEntries.length > 1 && (
              <button type="button" onClick={() => removeRaceEntry(idx)} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#fc5200', fontWeight: 700, fontSize: 18, cursor: 'pointer', borderRadius: 6, padding: '6px 12px', transition: 'background 0.2s' }}>Remove</button>
            )}
          </div>
        ))}
        {/* Add Button (Strava style) */}
        <button
          type="button"
          onClick={addRaceEntry}
          style={{
            background: '#fc5200',
            color: '#fff',
            border: 'none',
            borderRadius: 24,
            fontWeight: 800,
            fontSize: 20,
            padding: '12px 36px',
            margin: '18px auto 0',
            display: 'block',
            boxShadow: '0 2px 12px 0 rgba(252,82,0,0.15)',
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'background 0.2s, color 0.2s',
          }}
        >+ Add Another</button>
      </form>
    </div>
  );

  // Check if 1 Mile is entered
  const hasMile = raceEntries.some(e => e.distance === '1 Mile' && (e.h > 0 || e.m > 0 || e.s > 0));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ 
        textAlign: 'center', 
        color: 'var(--neon-cyan)', 
        textShadow: '0 0 10px var(--neon-cyan)',
        marginBottom: '20px'
      }}>
        Race Time Predictor
      </h1>

      {renderRaceEntryRows()}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={calculateTimes} className="btn" style={{ width: 180, background: '#fc5200', color: '#fff', borderRadius: 24, fontWeight: 800, fontSize: 20, padding: '12px 36px', boxShadow: '0 2px 12px 0 rgba(252,82,0,0.15)', letterSpacing: 1, border: 'none', cursor: 'pointer' }}>
          Calculate
        </button>
        {showResults && (
          <button
            onClick={handleSavePrediction}
            className="btn"
            style={{ width: 180, background: '#10b981', color: '#fff', borderRadius: 24, fontWeight: 800, fontSize: 20, padding: '12px 36px', boxShadow: '0 2px 12px 0 rgba(16,185,129,0.15)', letterSpacing: 1, border: 'none', cursor: 'pointer' }}
          >
            Save
          </button>
        )}
        {showResults && saveStatus && (
          <span style={{ alignSelf: 'center', marginLeft: 8, color: saveStatus.includes('saved') || saveStatus.includes('updated') ? '#10b981' : '#ef4444', fontWeight: 600 }}>{saveStatus}</span>
        )}
      </div>

      {showResults && (
        <div className="card">
          {renderResultsTable()}
          {renderSplitCard()}
        </div>
      )}
      {/* Add Delete button if editing */}
      {editingPredictionId && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={handleDeletePrediction}
            className="btn-secondary"
            style={{ fontSize: 16, padding: '8px 24px', borderRadius: 8, background: '#ef4444', color: '#fff', fontWeight: 700, boxShadow: '0 2px 8px 0 rgba(239,68,68,0.15)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            title="Delete Prediction"
          >
            <span style={{ fontSize: 20 }}>🗑️</span> Delete
          </button>
        </div>
      )}
      {/* Explanation and warning section */}
      <div className="card" style={{ margin: '32px auto 0', maxWidth: 700, background: 'rgba(255,255,255,0.03)', color: 'var(--text-light)', padding: 24, borderRadius: 16 }}>
        <h2 style={{ color: '#10b981', marginBottom: 10 }}>How Race Predictions Work</h2>
        <p style={{ fontSize: 16, marginBottom: 10 }}>
          This tool uses your recent race times to estimate your performance at other distances. It applies a mathematical model (Riegel formula, fatigue factor 1.06) to predict how your pace changes as distance increases. The "Predicted Time" is the model's best guess, and the shaded range shows ±3% margin for typical day-to-day variation.
        </p>
        <ul style={{ fontSize: 15, marginBottom: 10 }}>
          <li><b>Actual Time</b>: Your real result (if entered for that distance).</li>
          <li><b>Predicted Time</b>: What the model expects you could run, based on your other results.</li>
          <li><b>Range</b>: A typical range for your predicted time, accounting for good/bad days.</li>
        </ul>
        <h3 style={{ color: '#fc5200', marginTop: 18 }}>⚠️ 1 Mile times can skew long distance predictions</h3>
        <p style={{ fontSize: 15, color: '#ffe066' }}>
          Using a 1 Mile time to predict a Half Marathon or Marathon is not very reliable. The model tends to overestimate your endurance at longer distances. For best results, use 1 Mile times only for 5K/10K predictions, and use 5K/10K/Half times for longer races.
        </p>
      </div>
      {/* Info Modal/Lightbox for prediction explanation */}
      {infoModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setInfoModal({ open: false, distance: null })}>
          <div style={{ background: '#23272f', borderRadius: 16, padding: 32, minWidth: 320, maxWidth: 420, color: 'var(--text-light)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setInfoModal({ open: false, distance: null })} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
            <h2 style={{ color: '#10b981', marginBottom: 10 }}>How is {infoModal.distance} Predicted?</h2>
            <p style={{ fontSize: 15, marginBottom: 10 }}>
              The prediction for <b>{infoModal.distance}</b> is calculated using the Riegel formula:
            </p>
            <pre style={{ background: '#181c24', color: '#ffe066', padding: 10, borderRadius: 8, fontSize: 15, marginBottom: 10 }}>
              T₂ = T₁ × (D₂ / D₁)<sup>1.06</sup>
            </pre>
            <p style={{ fontSize: 15, marginBottom: 10 }}>
              Where:
              <ul>
                <li><b>T₁</b> = Your time for a known distance (in seconds)</li>
                <li><b>D₁</b> = That known distance (in km)</li>
                <li><b>D₂</b> = The target distance (in km)</li>
                <li><b>T₂</b> = Predicted time for the target distance</li>
              </ul>
            </p>
            {/* Show breakdown for this prediction */}
            {(() => {
              const dist = infoModal.distance;
              if (!dist || !results[dist] || !results[dist].predicted) return null;
              // Find all user entries used for this prediction
              const usedEntries = raceEntries.filter(e => e.distance !== dist && (e.h > 0 || e.m > 0 || e.s > 0));
              if (usedEntries.length === 0) return <p style={{ color: '#ffe066' }}>No other race times entered to predict this distance.</p>;
              return (
                <div style={{ marginTop: 10 }}>
                  <b>Calculation(s) used:</b>
                  <ul style={{ fontSize: 15 }}>
                    {usedEntries.map((e, i) => {
                      const knownTime = e.h * 3600 + e.m * 60 + e.s;
                      const knownDist = distances[e.distance];
                      const targetDist = distances[dist];
                      const predicted = knownTime * Math.pow(targetDist / knownDist, 1.06);
                      return (
                        <li key={i}>
                          From your {e.distance} time: {secondsToTime(knownTime)} →
                          {` ${secondsToTime(Math.round(predicted))} for ${dist} `}
                          <span style={{ color: '#b388ff' }}>
                            (T₂ = {knownTime}s × ({targetDist} / {knownDist})<sup>1.06</sup> = {Math.round(predicted)}s)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div style={{ fontSize: 15, marginTop: 8 }}>
                    <b>Average prediction:</b> {secondsToTime(Math.round(results[dist].predicted))}
                  </div>
                </div>
              );
            })()}
            <p style={{ fontSize: 15, marginTop: 10 }}>
              The app averages predictions from all your entered times (except for the distance being predicted). The ±4% range shows typical day-to-day variation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Predictor; 