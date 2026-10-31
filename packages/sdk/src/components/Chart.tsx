import React from "react";
import type { ChartSpec } from "@vizzly-sa/shared";

// --- SUB-COMPONENT: TABLE ---
function TableView({ data }: { data: ChartSpec }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <tr>
            {data.columns.map((col) => (
              <th key={col.name} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <tr>
              <td colSpan={data.columns.length} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No data found</td>
            </tr>
          ) : (
            data.rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {data.columns.map((col) => (
                  <td key={col.name} style={{ padding: '0.75rem 1rem', color: '#111827' }}>
                    {String(row[col.name] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- SUB-COMPONENT: BAR CHART ---
function BarChartView({ data }: { data: ChartSpec }) {
  if (data.rows.length === 0) return <div style={{ textAlign: 'center', color: '#6b7280' }}>No data found</div>;

  // Assume the first column is the label (X-axis) and the second is the value (Y-axis)
  const labelKey = data.columns[0]?.name;
  const valueKey = data.columns[1]?.name;

  if (!labelKey || !valueKey) return <TableView data={data} />;

  const maxValue = Math.max(...data.rows.map(r => Number(r[valueKey]) || 0));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '300px', padding: '1rem 0', borderLeft: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
      {data.rows.map((row, i) => {
        const val = Number(row[valueKey]) || 0;
        const heightPct = maxValue > 0 ? (val / maxValue) * 100 : 0;

        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{val}</div>
            <div style={{ width: '100%', backgroundColor: '#3b82f6', height: `${heightPct}%`, borderRadius: '0.25rem 0.25rem 0 0', minHeight: '4px', transition: 'height 0.3s ease' }} />
            <div style={{ fontSize: '0.75rem', color: '#374151', marginTop: '0.5rem', textAlign: 'center', wordBreak: 'break-all' }}>
              {String(row[labelKey] ?? "")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- MAIN COMPONENT ---
export function Chart({ data }: { data: ChartSpec }) {
  return (
    <div className="vizzly-chart" data-chart-type={data.chartType} style={{ marginTop: '1rem' }}>
      {data.meta.explanation && (
        <p style={{ marginBottom: '1rem', color: '#555', fontSize: '0.875rem' }}>
          {data.meta.explanation}
        </p>
      )}
      
      {data.chartType === "bar" ? <BarChartView data={data} /> : <TableView data={data} />}
      
      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
        <span>{data.meta.rowCount} rows · {data.meta.queryMs}ms</span>
        <span>Type: {data.chartType}</span>
      </div>
    </div>
  );
}