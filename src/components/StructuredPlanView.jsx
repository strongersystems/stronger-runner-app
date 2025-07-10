import React from 'react';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StructuredPlanView = ({ aiPlan }) => {
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
      <h2 style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 600, marginBottom: 24, textAlign: 'center' }}>Weekly Breakdown</h2>
      {weeks.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 16, textAlign: 'center', padding: 32 }}>
          No weeks found. Please generate a plan chunk.
        </div>
      ) : (
        weeks
          .filter(week => week && week.week !== undefined)
          .sort((a, b) => a.week - b.week)
          .map(week => (
            <div key={week.week} style={{
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              boxShadow: '0 1px 4px var(--shadow)',
              marginBottom: 20,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              minWidth: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 17, fontWeight: '700', color: 'var(--primary)', marginRight: 10 }}>Week {safeRender(week.week)}</div>
              </div>
              {/* Weekly summary (from summary or key_sessions_summary) */}
              {typeof week.summary === 'string' && week.summary.trim() ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic', marginBottom: 10 }}>{week.summary}</div>
              ) : typeof week.key_sessions_summary === 'string' && week.key_sessions_summary.trim() ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic', marginBottom: 10 }}>{week.key_sessions_summary}</div>
              ) : null}
              <div style={{ width: '100%' }}>
                {Array.isArray(week.days) && week.days.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 8,
                      overflowX: 'auto',
                      paddingBottom: 4,
                      marginBottom: 2,
                      scrollbarWidth: 'thin',
                      WebkitOverflowScrolling: 'touch',
                      flexWrap: 'nowrap',
                      justifyContent: 'center',
                      width: '100%',
                    }}
                  >
                    {week.days.map((day, idx) => (
                      <div key={day.day || idx} style={{
                        background: 'var(--bg-card)',
                        borderRadius: 8,
                        boxShadow: '0 1px 2px var(--shadow)',
                        padding: 10,
                        minWidth: 110,
                        maxWidth: 130,
                        flex: '1 1 13%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        fontSize: 13,
                        marginBottom: 0
                      }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 2, textTransform: 'capitalize', fontWeight: 600 }}>{safeRender(day.day)}</div>
                        <div style={{ color: 'var(--text-light)', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{safeRender(day.workout)}</div>
                        {day.volume !== undefined && <div style={{ color: 'var(--text-light)', fontSize: 12 }}>Vol: {safeRender(day.volume)}</div>}
                        {Array.isArray(day.heart_rate_range) && day.heart_rate_range.length === 2 && (
                          <div style={{ color: 'var(--text-light)', fontSize: 12 }}>HR: {safeRender(day.heart_rate_range[0])}–{safeRender(day.heart_rate_range[1])}</div>
                        )}
                        {Array.isArray(day.rpe_range) && day.rpe_range.length === 2 && (
                          <div style={{ color: 'var(--text-light)', fontSize: 12 }}>RPE: {safeRender(day.rpe_range[0])}–{safeRender(day.rpe_range[1])}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>
                    No daily workouts found for this week.
                  </div>
                )}
              </div>
            </div>
          ))
      )}
    </div>
  );
};

export default StructuredPlanView; 