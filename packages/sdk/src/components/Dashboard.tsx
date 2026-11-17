import React, { useEffect } from "react";
import { useSavedCharts } from "../hooks/useSavedCharts";
import { Chart } from "./Chart";

export function Dashboard() {
  const { charts, loading, fetchCharts } = useSavedCharts();

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading dashboard...</div>;
  if (charts.length === 0) return (
    <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px dashed #d1d5db' }}>
      <h3 style={{ color: '#374151' }}>No saved charts yet</h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Ask a question and click "Save to Dashboard" to pin it here.</p>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
      {charts.map((saved) => (
        <div key={saved.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#fff' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>{saved.title}</h3>
          <Chart data={saved.chartPayload} />
        </div>
      ))}
    </div>
  );
}