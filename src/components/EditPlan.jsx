import React, { useState } from 'react';

const WEEK_RANGES = [
  { label: 'Weeks 1-4', value: '1-4' },
  { label: 'Weeks 5-8', value: '5-8' },
  { label: 'Weeks 9-12', value: '9-12' },
  { label: 'Weeks 13-16', value: '13-16' },
];

const EditPlan = ({ plan, onSave, onCancel }) => {
  const [form, setForm] = useState(plan || {});
  const [selectedWeeks, setSelectedWeeks] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleWeekChange = (e) => {
    const { value, checked } = e.target;
    setSelectedWeeks(weeks =>
      checked ? [...weeks, value] : weeks.filter(w => w !== value)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, selectedWeeks });
  };

  return (
    <div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
      <h2>Edit Plan</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Goal: <input name="goals" value={form.goals || ''} onChange={handleChange} /></label>
        </div>
        <div>
          <label>Start Date: <input name="start_date" type="date" value={form.start_date || ''} onChange={handleChange} /></label>
        </div>
        {/* Add more fields as needed */}
        <div style={{ margin: '16px 0' }}>
          <div>Which weeks do you want to update?</div>
          {WEEK_RANGES.map(wr => (
            <label key={wr.value} style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                value={wr.value}
                checked={selectedWeeks.includes(wr.value)}
                onChange={handleWeekChange}
              /> {wr.label}
            </label>
          ))}
        </div>
        <button type="submit">Save Changes</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
      </form>
    </div>
  );
};

export default EditPlan; 