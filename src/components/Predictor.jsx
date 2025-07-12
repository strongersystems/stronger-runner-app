import React, { useState } from 'react';

const Predictor = () => {
  const [times, setTimes] = useState({
    mile: { h: 0, m: 0, s: 0 },
    fiveK: { h: 0, m: 0, s: 0 },
    tenK: { h: 0, m: 0, s: 0 },
    halfMarathon: { h: 0, m: 0, s: 0 },
    marathon: { h: 0, m: 0, s: 0 }
  });

  const [results, setResults] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [isImperial, setIsImperial] = useState(false);
  // Set default to Marathon
  const [selectedDistance, setSelectedDistance] = useState('Marathon');
  const [paceRange, setPaceRange] = useState(50);
  const [terrainRange, setTerrainRange] = useState(0);
  const [tempRange, setTempRange] = useState(0);
  const [splitDistance, setSplitDistance] = useState(1);
  const [splitUnit, setSplitUnit] = useState('km');
  const [paceStrategy, setPaceStrategy] = useState('even');
  const [targetTime, setTargetTime] = useState('');
  const [showPaceBand, setShowPaceBand] = useState(false);

  // Add state for pace band splits
  const [paceBandSplits, setPaceBandSplits] = useState(null);

  // New state for flexible race entries
  const [raceEntries, setRaceEntries] = useState([]); // {distance, h, m, s}
  const [currentEntry, setCurrentEntry] = useState({ distance: '5K', h: 0, m: 0, s: 0 });

  const distances = {
    '1 Mile': 1.60934,
    '5K': 5,
    '10K': 10,
    'Half Marathon': 21.0975,
    'Marathon': 42.195
  };

  const fatigueFactor = 1.06;

  const timeToSeconds = (timeObj) => {
    return timeObj.h * 3600 + timeObj.m * 60 + timeObj.s;
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

  // Helper for adding a race entry
  const addRaceEntry = () => {
    if (currentEntry.h === 0 && currentEntry.m === 0 && currentEntry.s === 0) return;
    setRaceEntries([...raceEntries, { ...currentEntry }]);
    setCurrentEntry({ distance: '5K', h: 0, m: 0, s: 0 });
  };
  const removeRaceEntry = (idx) => {
    setRaceEntries(raceEntries.filter((_, i) => i !== idx));
  };

  // Calculate times using all raceEntries
  const calculateTimes = () => {
    // Build inputs object for each distance
    const inputs = {};
    raceEntries.forEach(entry => {
      const seconds = entry.h * 3600 + entry.m * 60 + entry.s;
      if (!inputs[entry.distance]) inputs[entry.distance] = [];
      inputs[entry.distance].push(seconds);
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

  const updateTime = (distance, field, value) => {
    setTimes(prev => ({
      ...prev,
      [distance]: {
        ...prev[distance],
        [field]: parseInt(value) || 0
      }
    }));
  };

  const renderTimeInput = (distance, timeObj) => {
    // Map distance names to the correct state keys
    const distanceKeyMap = {
      '1 Mile': 'mile',
      '5K': 'fiveK',
      '10K': 'tenK',
      'Half Marathon': 'halfMarathon',
      'Marathon': 'marathon'
    };
    const distanceKey = distanceKeyMap[distance];
    
    return (
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          color: 'var(--neon-cyan)', 
          marginBottom: '5px' 
        }}>
          {distance} Time
        </label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <select
            value={timeObj.h}
            onChange={(e) => updateTime(distanceKey, 'h', e.target.value)}
            style={{ width: '70px' }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          :
          <select
            value={timeObj.m}
            onChange={(e) => updateTime(distanceKey, 'm', e.target.value)}
            style={{ width: '70px' }}
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
            ))}
          </select>
          :
          <select
            value={timeObj.s}
            onChange={(e) => updateTime(distanceKey, 's', e.target.value)}
            style={{ width: '70px' }}
          >
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  // Use isImperial to determine units
  const getDistanceUnit = () => (isImperial ? 'mi' : 'km');
  const getDistanceValue = (km) => (isImperial ? (km / 1.60934) : km);

  const renderResultsTable = () => {
    return (
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        marginTop: '20px',
        animation: 'fadeIn 1s ease-in',
        color: 'var(--text-light)'
      }}>
        <thead>
          <tr>
            <th style={{ 
              padding: '12px', 
              textAlign: 'center', 
              borderBottom: '1px solid var(--medium-bg)',
              background: 'var(--neon-cyan)',
              color: 'var(--text-dark)'
            }}>
              Distance ({getDistanceUnit()})
            </th>
            <th style={{ 
              padding: '12px', 
              textAlign: 'center', 
              borderBottom: '1px solid var(--medium-bg)',
              background: 'var(--neon-cyan)',
              color: 'var(--text-dark)'
            }}>
              Actual Time
            </th>
            <th style={{ 
              padding: '12px', 
              textAlign: 'center', 
              borderBottom: '1px solid var(--medium-bg)',
              background: 'var(--neon-cyan)',
              color: 'var(--text-dark)'
            }}>
              Predicted Time
            </th>
            <th style={{ 
              padding: '12px', 
              textAlign: 'center', 
              borderBottom: '1px solid var(--medium-bg)',
              background: 'var(--neon-cyan)',
              color: 'var(--text-dark)'
            }}>
              Range (±3%)
            </th>
            <th style={{ 
              padding: '12px', 
              textAlign: 'center', 
              borderBottom: '1px solid var(--medium-bg)',
              background: 'var(--neon-cyan)',
              color: 'var(--text-dark)'
            }}>
              Performance
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(results).map(([dist, result], index) => {
            let perf = null;
            if (result.actual && result.predicted) {
              if (result.actual < result.predicted) {
                perf = <span style={{ color: 'limegreen', fontWeight: 700 }} title="Outperforming">↑</span>;
              } else if (result.actual > result.predicted) {
                perf = <span style={{ color: 'red', fontWeight: 700 }} title="Underperforming">↓</span>;
              } else {
                perf = <span style={{ color: 'gold', fontWeight: 700 }} title="On Target">=</span>;
              }
            }
            return (
              <tr key={dist} style={{ 
                background: index % 2 === 0 ? 'transparent' : 'var(--medium-bg)',
                color: 'var(--text-light)'
              }}>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--medium-bg)' }}>
                  {getDistanceValue(distances[dist]).toFixed(2)} {getDistanceUnit()}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  borderBottom: '1px solid var(--medium-bg)',
                  color: 'var(--neon-yellow)'
                }}>
                  {result.actual ? secondsToTime(result.actual) : '-'}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  borderBottom: '1px solid var(--medium-bg)',
                  color: 'var(--neon-blue)'
                }}>
                  {result.predicted ? secondsToTime(result.predicted) : '-'}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  borderBottom: '1px solid var(--medium-bg)',
                  color: 'var(--neon-purple)'
                }}>
                  {result.lower ? `${secondsToTime(result.lower)} - ${secondsToTime(result.upper)}` : '-'}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  borderBottom: '1px solid var(--medium-bg)'
                }}>
                  {perf}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderSplitCard = () => {
    // Always use Marathon and 5K splits
    const finishDist = distances['Marathon'];
    const predictedTime = results['Marathon']?.predicted;
    if (!predictedTime) return null;

    const splitUnit = getDistanceUnit();
    const splitInterval = isImperial ? 3.10686 : 5; // 5K or 3.10686mi
    const maxDist = getDistanceValue(finishDist);
    const interval = splitInterval;

    const paceSeconds = predictedTime / maxDist;
    const splits = [];
    for (let split = interval; split < maxDist; split += interval) {
      const splitDist = split;
      const splitTime = paceSeconds * splitDist;
      splits.push({ distance: split, time: splitTime });
    }
    // Add finish
    splits.push({ distance: maxDist, time: predictedTime });

    return (
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, var(--darker-bg), var(--dark-bg))',
        boxShadow: '0 0 20px rgba(0, 255, 204, 0.3)',
        textAlign: 'center',
        color: 'var(--text-light)'
      }}>
        <h2 style={{ 
          color: 'var(--neon-cyan)', 
          textShadow: '0 0 5px var(--neon-cyan)',
          marginBottom: '15px'
        }}>
          Split Times (5K {isImperial ? '/ 3.1mi' : ''} Splits, Marathon)
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '5px' 
        }}>
          {splits.map((split, index) => (
            <div key={index} style={{
              background: 'var(--medium-bg)',
              padding: '5px',
              borderRadius: '5px',
              boxShadow: '0 0 5px rgba(0, 204, 255, 0.2)',
              color: 'var(--text-light)'
            }}>
              <h3 style={{ 
                margin: '0 0 3px', 
                color: 'var(--neon-blue)', 
                fontSize: '14px' 
              }}>
                {split.distance.toFixed(2)} {splitUnit}
              </h3>
              <p style={{ margin: 0, fontSize: '12px' }}>
                {secondsToTime(split.time)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPaceBandCard = () => {
    const generatePaceBand = () => {
      const totalSeconds = timeToSeconds({
        h: parseInt(targetTime.split(':')[0]) || 0,
        m: parseInt(targetTime.split(':')[1]) || 0,
        s: parseInt(targetTime.split(':')[2]) || 0
      });

      if (!totalSeconds || totalSeconds <= 0) {
        alert('Please enter a valid target time (HH:MM:SS).');
        return;
      }

      const finishDist = distances[selectedDistance];
      const maxDist = splitUnit === 'km' ? finishDist : finishDist / 1.60934;
      const interval = parseInt(splitDistance);
      let splitTimes = [];

      if (paceStrategy === 'even') {
        const secondsPerInterval = totalSeconds / (Math.floor(maxDist / interval) + 1);
        for (let split = interval; split <= maxDist; split += interval) {
          splitTimes.push(secondsPerInterval * (split / interval));
        }
      } else if (paceStrategy === 'negative') {
        const halfDist = maxDist / 2;
        const firstHalfFactor = 1.02;
        const secondHalfFactor = 0.98;
        const firstHalfTime = totalSeconds * 0.51 * firstHalfFactor;
        const secondHalfTime = totalSeconds * 0.49 * secondHalfFactor;
        const intervalsPerHalf = Math.floor(halfDist / interval);
        const firstHalfSeconds = firstHalfTime / intervalsPerHalf;
        const secondHalfSeconds = secondHalfTime / intervalsPerHalf;
        let currentTime = 0;
        for (let split = interval; split <= halfDist; split += interval) {
          currentTime += firstHalfSeconds;
          splitTimes.push(currentTime);
        }
        for (let split = halfDist + interval; split <= maxDist; split += interval) {
          currentTime += secondHalfSeconds;
          splitTimes.push(currentTime);
        }
      } else if (paceStrategy === 'positive') {
        const halfDist = maxDist / 2;
        const firstHalfFactor = 0.98;
        const secondHalfFactor = 1.02;
        const firstHalfTime = totalSeconds * 0.51 * firstHalfFactor;
        const secondHalfTime = totalSeconds * 0.49 * secondHalfFactor;
        const intervalsPerHalf = Math.floor(halfDist / interval);
        const firstHalfSeconds = firstHalfTime / intervalsPerHalf;
        const secondHalfSeconds = secondHalfTime / intervalsPerHalf;
        let currentTime = 0;
        for (let split = interval; split <= halfDist; split += interval) {
          currentTime += firstHalfSeconds;
          splitTimes.push(currentTime);
        }
        for (let split = halfDist + interval; split <= maxDist; split += interval) {
          currentTime += secondHalfSeconds;
          splitTimes.push(currentTime);
        }
      }

      setPaceBandSplits(splitTimes);
    };

    return (
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, var(--darker-bg), var(--dark-bg))',
        boxShadow: '0 0 20px rgba(0, 255, 204, 0.3)',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          color: 'var(--neon-cyan)', 
          textShadow: '0 0 5px var(--neon-cyan)',
          marginBottom: '15px'
        }}>
          Pace Band Generator
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>
            Target Time (HH:MM:SS):
          </label>
          <input
            type="text"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            placeholder="e.g., 2:00:00"
            style={{ width: '150px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>
            Pacing Strategy:
          </label>
          <select
            value={paceStrategy}
            onChange={(e) => setPaceStrategy(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="even">Even Splits</option>
            <option value="negative">Negative Splits</option>
            <option value="positive">Positive Splits</option>
          </select>
        </div>

        <button
          onClick={generatePaceBand}
          className="btn"
          style={{ marginBottom: '15px' }}
        >
          Generate Pace Band
        </button>

        {paceBandSplits && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '5px' 
          }}>
            {paceBandSplits.map((time, index) => (
              <div key={index} style={{
                background: 'var(--medium-bg)',
                padding: '5px',
                borderRadius: '5px',
                boxShadow: '0 0 5px rgba(0, 204, 255, 0.2)'
              }}>
                <h3 style={{ 
                  margin: '0 0 3px', 
                  color: 'var(--neon-blue)', 
                  fontSize: '14px' 
                }}>
                  {(index + 1) * splitDistance} {splitUnit}
                </h3>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  {secondsToTime(time)}
                </p>
              </div>
            ))}
            <div style={{
              background: 'var(--medium-bg)',
              padding: '5px',
              borderRadius: '5px',
              boxShadow: '0 0 5px rgba(0, 204, 255, 0.2)'
            }}>
              <h3 style={{ 
                margin: '0 0 3px', 
                color: 'var(--neon-blue)', 
                fontSize: '14px' 
              }}>
                Finish ({(splitUnit === 'km' ? distances[selectedDistance] : distances[selectedDistance] / 1.60934).toFixed(splitUnit === 'km' ? 4 : 2)} {splitUnit})
              </h3>
              <p style={{ margin: 0, fontSize: '12px' }}>
                {targetTime}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to check if currentEntry is a valid time
  const isValidTime = currentEntry.h > 0 || currentEntry.m > 0 || currentEntry.s > 0;

  // UI for entering a recent time
  const renderRaceEntryInput = () => (
    <div className="card" style={{ marginBottom: 20, color: 'var(--text-light)' }}>
      <h3 style={{ color: 'var(--neon-cyan)', marginBottom: 18, fontWeight: 700, fontSize: 22, textAlign: 'center' }}>Enter a Recent Time</h3>
      <form style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 28,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        padding: '22px 18px 18px 18px',
        boxShadow: '0 1px 8px 0 rgba(0,0,0,0.10)',
        maxWidth: 600,
        margin: '0 auto 8px',
      }} onSubmit={e => { e.preventDefault(); if (isValidTime) addRaceEntry(); }}>
        {/* Distance */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110 }}>
          <label style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--text-light)' }}>🏁 Distance</label>
          <select
            value={currentEntry.distance}
            onChange={e => setCurrentEntry({ ...currentEntry, distance: e.target.value })}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderRadius: 8,
              background: 'var(--medium-bg)',
              color: 'var(--text-light)',
              fontSize: 17,
              fontWeight: 500,
              outline: 'none',
              height: 44,
              boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.2s',
            }}
          >
            <option value="1 Mile">1 Mile</option>
            <option value="5K">5K</option>
            <option value="10K">10K</option>
            <option value="Half Marathon">Half Marathon</option>
            <option value="Marathon">Marathon</option>
          </select>
        </div>
        {/* Hours */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
          <label style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--text-light)' }}>⏰ Hours</label>
          <select
            value={currentEntry.h}
            onChange={e => setCurrentEntry({ ...currentEntry, h: parseInt(e.target.value) })}
            style={{ width: 60, border: 'none', borderRadius: 8, background: 'var(--medium-bg)', color: 'var(--text-light)', fontSize: 17, textAlign: 'center', height: 44, fontWeight: 500, outline: 'none', boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}
          >
            {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        {/* Minutes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
          <label style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--text-light)' }}>Minutes</label>
          <select
            value={currentEntry.m}
            onChange={e => setCurrentEntry({ ...currentEntry, m: parseInt(e.target.value) })}
            style={{ width: 60, border: 'none', borderRadius: 8, background: 'var(--medium-bg)', color: 'var(--text-light)', fontSize: 17, textAlign: 'center', height: 44, fontWeight: 500, outline: 'none', boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}
          >
            {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        {/* Seconds */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
          <label style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--text-light)' }}>Seconds</label>
          <select
            value={currentEntry.s}
            onChange={e => setCurrentEntry({ ...currentEntry, s: parseInt(e.target.value) })}
            style={{ width: 60, border: 'none', borderRadius: 8, background: 'var(--medium-bg)', color: 'var(--text-light)', fontSize: 17, textAlign: 'center', height: 44, fontWeight: 500, outline: 'none', boxShadow: '0 1px 4px 0 rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}
          >
            {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        {/* Add Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
          <label style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'transparent' }}>Add</label>
          <button
            type="submit"
            className="btn"
            disabled={!isValidTime}
            style={{
              background: isValidTime ? 'var(--neon-cyan)' : 'var(--medium-bg)',
              color: isValidTime ? 'var(--text-dark)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 17,
              padding: '10px 22px',
              boxShadow: isValidTime ? '0 2px 8px 0 rgba(0,255,204,0.10)' : 'none',
              cursor: isValidTime ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s, color 0.2s',
              height: 44
            }}
          >Add</button>
        </div>
      </form>
      {raceEntries.length > 0 && (
        <div style={{ marginTop: 15 }}>
          <h4 style={{ color: 'var(--neon-cyan)', fontSize: 15 }}>Your Recent Times:</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {raceEntries.map((entry, idx) => (
              <li key={idx} style={{ marginBottom: 4, color: 'var(--text-light)' }}>
                <span style={{ fontWeight: 500 }}>{entry.distance}:</span> {entry.h}h {entry.m}m {entry.s}s
                <button type="button" onClick={() => removeRaceEntry(idx)} style={{ marginLeft: 10, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

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

      {renderRaceEntryInput()}
      <button onClick={calculateTimes} className="btn" style={{ width: 200, margin: '0 auto 20px', display: 'block' }}>
        Calculate
      </button>

      {showResults && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <label style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>
              Units:
            </label>
            <select
              value={isImperial ? 'imperial' : 'metric'}
              onChange={(e) => setIsImperial(e.target.value === 'imperial')}
              style={{ width: '150px' }}
            >
              <option value="metric">Metric (km)</option>
              <option value="imperial">Imperial (mi)</option>
            </select>
          </div>

          {renderResultsTable()}
          {renderSplitCard()}
          {renderPaceBandCard()}
        </div>
      )}
    </div>
  );
};

export default Predictor; 