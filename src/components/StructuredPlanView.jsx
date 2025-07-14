import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import SessionDetailsModal from './SessionDetailsModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StructuredPlanView = ({ aiPlan }) => {
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());
  const [selectedSession, setSelectedSession] = useState(null);

  const toggleWeek = (weekNumber) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  if (!aiPlan) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        <h2>No Plan Data</h2>
        <p>Please generate a plan to see your training weeks.</p>
      </div>
    );
  }

  const { plan_title, introduction, goals_summary, weekly_breakdown } = aiPlan;
  const weeks = Array.isArray(weekly_breakdown) ? weekly_breakdown : [];

  // Prepare data for the bar chart
  const weekLabels = weeks.map(w => `Week ${w.week}`);
  const weekVolumes = weeks.map(w => {
    if (!Array.isArray(w.days)) return 0;
    return w.days.reduce((sum, d) => sum + (d.volume || 0), 0);
  });
  const barData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'Weekly Volume',
        data: weekVolumes,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 40,
      },
    ],
  };
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Weekly Training Volume',
        color: '#ff6600',
        font: { size: 20, weight: 'bold' },
        padding: { top: 10, bottom: 10 },
      },
      tooltip: {
        callbacks: {
          label: (context) => `Volume: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Week', color: '#fff' },
        ticks: { color: '#fff' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      y: {
        title: { display: true, text: 'Volume', color: '#fff' },
        ticks: { color: '#fff' },
        grid: { color: 'rgba(255,255,255,0.1)' },
        beginAtZero: true,
      },
    },
  };

  // Helper function to safely render text
  const safeRender = (value) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    return '';
  };

  // Calculate key stats
  const weekNumbers = weeks.map(w => w.week);
  const totalWeeks = weekNumbers.length;
  // Use 'volume' instead of 'mileage'
  const minVolume = Math.min(...weeks.map(w => {
    if (!Array.isArray(w.days)) return Infinity;
    return w.days.reduce((sum, d) => sum + (d.volume || 0), 0);
  }).filter(m => m > 0));
  const maxVolume = Math.max(...weeks.map(w => {
    if (!Array.isArray(w.days)) return 0;
    return w.days.reduce((sum, d) => sum + (d.volume || 0), 0);
  }));
  const intensity = aiPlan.training_intensity || aiPlan.training_intensity_preference || 'N/A';

  // Get unit preference (default to km)
  const unit = aiPlan.unit_preference === 'imperial' ? 'mi' : 'km';



  // Replace the day card rendering with improved styles and responsive layout

  const getDayColor = (workout) => {
    // Use high-contrast, accessible colors
    if (/rest/i.test(workout)) return '#444';
    if (/long/i.test(workout)) return '#f9b233'; // Gold
    if (/tempo|interval|session|vo2|steady/i.test(workout)) return '#e4572e'; // Orange-Red
    if (/easy/i.test(workout)) return '#2eae57'; // Green
    if (/park run/i.test(workout)) return '#ff9800'; // Orange
    return '#3a6ea5'; // Blue for other
  };

  const getTextColor = (bg) => {
    // Simple luminance check for white or dark text
    if (!bg) return '#fff';
    const c = bg.substring(1); // strip #
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 160 ? '#222' : '#fff';
  };

  // TEMP: Debug log for weeks array
  console.log('StructuredPlanView weeks:', weeks);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      {/* Weekly Volume Bar Chart */}
      {weeks.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: '0 2px 8px var(--shadow)' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      )}
      {/* Plan Overview Section */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 32,
        boxShadow: '0 2px 8px var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {plan_title && <h1 style={{ color: 'var(--primary)', fontSize: 36, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>{safeRender(plan_title)}</h1>}
        {introduction && <div style={{ color: 'var(--text-light)', fontSize: 18, marginBottom: 12, textAlign: 'center' }}>{safeRender(introduction)}</div>}
        {goals_summary && <div style={{ color: 'var(--success)', fontSize: 16, marginBottom: 16, textAlign: 'center', fontWeight: 600 }}>{safeRender(goals_summary)}</div>}
        <div style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 8
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 15 }}><strong>Total Weeks:</strong> {totalWeeks}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 15 }}><strong>Weekly Volume:</strong> {minVolume === maxVolume ? minVolume : `${minVolume} - ${maxVolume}`}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 15 }}><strong>Intensity:</strong> {safeRender(intensity).toUpperCase()}</div>
        </div>
      </div>
      {/* Weekly Breakdown */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ color: 'var(--neon-orange)', textAlign: 'center', marginBottom: 24 }}>Weekly Breakdown</h2>
        {weeks.map((week, i) => {
          const isExpanded = expandedWeeks.has(week.week);
          const totalVolume = Array.isArray(week.days) 
            ? week.days.reduce((sum, day) => sum + (day.volume || 0), 0)
            : 0;
          
          return (
            <div key={i} style={{
              background: '#181c24',
              borderRadius: 16,
              marginBottom: 32,
              boxShadow: '0 2px 8px var(--shadow)',
              padding: 20,
            }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: 16
                }}
                onClick={() => toggleWeek(week.week)}
              >
                <div style={{ color: '#ff6600', fontWeight: 700, fontSize: 22 }}>Week {week.week}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    color: '#fff', 
                    fontSize: 16, 
                    background: 'rgba(255, 102, 0, 0.2)', 
                    padding: '4px 12px', 
                    borderRadius: 8,
                    border: '1px solid rgba(255, 102, 0, 0.3)'
                  }}>
                    Total: {totalVolume} {unit}
                  </div>
                  <div style={{ 
                    color: '#ff6600', 
                    fontSize: 18, 
                    fontWeight: 'bold',
                    transition: 'transform 0.2s ease',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}>
                    ▼
                  </div>
                </div>
              </div>
              
              <div style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>{week.summary}</div>
              
              {isExpanded && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 0,
                    justifyContent: 'flex-start',
                    animation: 'slideDown 0.3s ease-out'
                  }}
                >
                  {Array.isArray(week.days) && week.days.map((day, j) => {
                    const bg = getDayColor(day.workout || '');
                    const color = getTextColor(bg);
                    return (
                      <div
                        key={j}
                        style={{
                          background: bg,
                          color,
                          borderRadius: 12,
                          padding: '16px 14px',
                          minWidth: 140,
                          flex: '1 1 140px',
                          maxWidth: 180,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                          marginBottom: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onClick={() => {
                          console.log('Clicked day:', day);
                          setSelectedSession(day);
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'scale(1.02)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{day.day}</div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{day.workout}</div>
                        {day.volume !== undefined && (
                          <div style={{ fontSize: 13, marginBottom: 2 }}>Vol: {day.volume} {unit}</div>
                        )}
                        {day.heart_rate_range && (
                          <div style={{ fontSize: 13 }}>HR: {day.heart_rate_range[0]}–{day.heart_rate_range[1]}</div>
                        )}
                        {day.rpe_range && (
                          <div style={{ fontSize: 13 }}>RPE: {day.rpe_range[0]}–{day.rpe_range[1]}</div>
                        )}
                        <div style={{ 
                          fontSize: 11, 
                          opacity: 0.8, 
                          marginTop: '8px',
                          fontStyle: 'italic'
                        }}>
                          Click for details
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 600px) {
          .week-breakdown-row {
            flex-direction: column !important;
          }
          .week-breakdown-row > div {
            min-width: 90vw !important;
            max-width: 98vw !important;
          }
        }
      `}</style>
      
      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          unitPreference={aiPlan.unit_preference}
        />
      )}
    </div>
  );
};

export default StructuredPlanView; 