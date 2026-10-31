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
  const downloadCSV = () => {
    if (!data || data.rows.length === 0) return;

    // 1. Get headers
    const headers = data.columns.map(c => c.label).join(",");

    // 2. Get rows
    const csvRows = data.rows.map(row => {
      return data.columns.map(col => {
                let val = row[col.name];
        // Escape quotes and wrap in quotes if it contains a comma
        if (typeof val === "string") {
          const strVal = val.replace(/"/g, '""');
          return strVal.includes(",") ? `"${strVal}"` : strVal;
        }
        return val ?? "";
      }).join(",");
    });

    // 3. Combine and download
    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `vizzly_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="vizzly-chart" data-chart-type={data.chartType} style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          {data.meta.explanation && (
            <p style={{ color: '#555', fontSize: '0.875rem', margin: 0 }}>
              {data.meta.explanation}
            </p>
          )}
        </div>
        
        {/* EXPORT BUTTON */}
        {data.rows.length > 0 && (
          <button
            onClick={downloadCSV}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Export to CSV
          </button>
        )}
      </div>
      
      {data.chartType === "bar" ? <BarChartView data={data} /> : <TableView data={data} />}
      
      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
        <span>{data.meta.rowCount} rows · {data.meta.queryMs}ms</span>
        <span>Type: {data.chartType}</span>
      </div>
    </div>
  );
}