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
  const [selectedDistance, setSelectedDistance] = useState('Half Marathon');
  const [paceRange, setPaceRange] = useState(50);
  const [terrainRange, setTerrainRange] = useState(0);
  const [tempRange, setTempRange] = useState(0);
  const [splitDistance, setSplitDistance] = useState(1);
  const [splitUnit, setSplitUnit] = useState('km');
  const [paceStrategy, setPaceStrategy] = useState('even');
  const [targetTime, setTargetTime] = useState('');
  const [showPaceBand, setShowPaceBand] = useState(false);

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

  const calculateTimes = () => {
    const inputs = {
      '1 Mile': timeToSeconds(times.mile),
      '5K': timeToSeconds(times.fiveK),
      '10K': timeToSeconds(times.tenK),
      'Half Marathon': timeToSeconds(times.halfMarathon),
      'Marathon': timeToSeconds(times.marathon)
    };

    const newResults = {};
    for (let target in distances) {
      let predictions = [];
      for (let known in inputs) {
        if (inputs[known] > 0) {
          const pred = predictTime(inputs[known], distances[known], distances[target]);
          predictions.push(pred);
        }
      }
      const avg = predictions.length ? predictions.reduce((a, b) => a + b) / predictions.length : null;
      newResults[target] = {
        actual: inputs[target] > 0 ? inputs[target] : null,
        predicted: avg,
        lower: avg ? avg * 0.97 : null,
        upper: avg ? avg * 1.03 : null
      };
    }

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
    const distanceKey = distance.replace(/\s+/g, '').toLowerCase();
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

  const renderResultsTable = () => {
    return (
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        marginTop: '20px',
        animation: 'fadeIn 1s ease-in'
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
              Distance
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
          </tr>
        </thead>
        <tbody>
          {Object.entries(results).map(([dist, result], index) => (
            <tr key={dist} style={{ 
              background: index % 2 === 0 ? 'transparent' : 'var(--medium-bg)' 
            }}>
              <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--medium-bg)' }}>
                {dist}
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
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderSplitCard = () => {
    const finishDist = distances[selectedDistance];
    const predictedTime = results[selectedDistance]?.predicted;
    if (!predictedTime) return null;

    const maxDist = splitUnit === 'km' ? finishDist : finishDist / 1.60934;
    const interval = parseInt(splitDistance);

    const paceFactor = paceRange === 0 ? 1.03 : paceRange === 50 ? 1 : 0.97;
    const terrainFactor = 1 + (terrainRange / 100 * 0.075);
    const tempFactor = 1 + (tempRange / 100 * 0.05);
    const adjustedTime = predictedTime * paceFactor * terrainFactor * tempFactor;
    const paceSeconds = adjustedTime / finishDist;

    const splits = [];
    for (let split = interval; split <= maxDist; split += interval) {
      const splitDist = split;
      const splitTime = paceSeconds * (splitUnit === 'km' ? splitDist : splitDist * 1.60934);
      splits.push({ distance: split, time: splitTime });
    }

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
          Split Times
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>
            Distance:
          </label>
          <select
            value={selectedDistance}
            onChange={(e) => setSelectedDistance(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="Half Marathon">Half Marathon</option>
            <option value="Marathon">Marathon</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>
            Pace Expectation:
          </label>
          <select
            value={paceRange}
            onChange={(e) => setPaceRange(parseInt(e.target.value))}
            style={{ width: '150px' }}
          >
            <option value={0}>Conservative (+3%)</option>
            <option value={50}>Predicted (0%)</option>
            <option value={100}>Aggressive (-3%)</option>
          </select>
          <div style={{ color: 'var(--neon-blue)', marginTop: '5px' }}>
            Total Time: {secondsToTime(adjustedTime)}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>
            Terrain:
          </label>
          <select
            value={terrainRange}
            onChange={(e) => setTerrainRange(parseInt(e.target.value))}
            style={{ width: '150px' }}
          >
            <option value={0}>Flat (0%)</option>
            <option value={15}>Rolling (+1.5%)</option>
            <option value={25}>Moderate (+2.5%)</option>
            <option value={50}>Hilly (+5%)</option>
            <option value={75}>Mountainous (+7.5%)</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>
            Temperature:
          </label>
          <select
            value={tempRange}
            onChange={(e) => setTempRange(parseInt(e.target.value))}
            style={{ width: '150px' }}
          >
            <option value={0}>Optimal (0%)</option>
            <option value={10}>Mild Warm (+1%)</option>
            <option value={15}>Warm (+1.5%)</option>
            <option value={30}>Hot (+3%)</option>
            <option value={50}>Extreme Heat (+5%)</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>
            Split Interval:
          </label>
          <select
            value={splitDistance}
            onChange={(e) => setSplitDistance(parseInt(e.target.value))}
            style={{ width: '100px' }}
          >
            <option value={1}>Every 1</option>
            <option value={2}>Every 2</option>
            <option value={3}>Every 3</option>
            <option value={4}>Every 4</option>
            <option value={5}>Every 5</option>
          </select>
          <select
            value={splitUnit}
            onChange={(e) => setSplitUnit(e.target.value)}
            style={{ width: '70px' }}
          >
            <option value="km">km</option>
            <option value="mi">mi</option>
          </select>
        </div>

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
              boxShadow: '0 0 5px rgba(0, 204, 255, 0.2)'
            }}>
              <h3 style={{ 
                margin: '0 0 3px', 
                color: 'var(--neon-blue)', 
                fontSize: '14px' 
              }}>
                {Number.isInteger(split.distance) ? split.distance : split.distance.toFixed(splitUnit === 'km' ? 4 : 2)} {splitUnit}
              </h3>
              <p style={{ margin: 0, fontSize: '12px' }}>
                {secondsToTime(split.time)}
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
              Finish ({(splitUnit === 'km' ? finishDist : finishDist / 1.60934).toFixed(splitUnit === 'km' ? 4 : 2)} {splitUnit})
            </h3>
            <p style={{ margin: 0, fontSize: '12px' }}>
              {secondsToTime(adjustedTime)}
            </p>
          </div>
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

      return splitTimes;
    };

    const splitTimes = generatePaceBand();

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
          onClick={() => setShowPaceBand(true)}
          className="btn"
          style={{ marginBottom: '15px' }}
        >
          Generate Pace Band
        </button>

        {showPaceBand && splitTimes && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 1fr)', 
            gap: '5px' 
          }}>
            {splitTimes.map((time, index) => (
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

      <div className="card">
        <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '15px' }}>Enter Your Times</h3>
        {renderTimeInput('1 Mile', times.mile)}
        {renderTimeInput('5K', times.fiveK)}
        {renderTimeInput('10K', times.tenK)}
        {renderTimeInput('Half Marathon', times.halfMarathon)}
        {renderTimeInput('Marathon', times.marathon)}
        
        <button onClick={calculateTimes} className="btn">
          Calculate
        </button>
      </div>

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