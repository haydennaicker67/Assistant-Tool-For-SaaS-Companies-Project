import React, { useState } from "react";

interface FilterBarProps {
  value: { from: string; to: string } | null;
  onChange: (range: { from: string; to: string } | null) => void;
}

export function FilterBar({ value, onChange }: FilterBarProps) {
  // Keep track of the selected dropdown option
  const [selectedPreset, setSelectedPreset] = useState("");

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value;
    setSelectedPreset(preset); // Update the UI state

    if (!preset) {
      onChange(null);
      return;
    }

    const to = new Date();
    const from = new Date();

    if (preset === "7d") from.setDate(to.getDate() - 7);
    else if (preset === "30d") from.setDate(to.getDate() - 30);
    else if (preset === "90d") from.setDate(to.getDate() - 90);
    else if (preset === "1y") from.setFullYear(to.getFullYear() - 1);

    onChange({
      from: from.toISOString().split('T')[0] || "",
      to: to.toISOString().split('T')[0] || ""
    });
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>Date Range:</label>
      <select 
        onChange={handlePresetChange}
        value={selectedPreset} // Bind to the local state
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: '#fff' }}
      >
        <option value="">All Time</option>
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
        <option value="90d">Last 90 Days</option>
        <option value="1y">Last 1 Year</option>
      </select>
    </div>
  );
}