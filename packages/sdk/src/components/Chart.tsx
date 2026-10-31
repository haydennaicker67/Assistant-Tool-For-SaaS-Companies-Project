import React from "react";
import type { ChartSpec } from "@vizzly-sa/shared";

export function Chart({ data }: { data: ChartSpec }) {
  return (
    <div className="vizzly-chart" data-chart-type={data.chartType}>
      {data.meta.explanation && (
        <p className="vizzly-explanation" style={{ marginBottom: '1rem', color: '#555' }}>
          {data.meta.explanation}
        </p>
      )}
      
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <table className="vizzly-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              {data.columns.map((col) => (
                <th key={col.name} className="vizzly-th" style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={data.columns.length} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                  No data found
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <tr key={i} className="vizzly-tr" style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {data.columns.map((col) => (
                    <td key={col.name} className="vizzly-td" style={{ padding: '0.75rem 1rem', color: '#111827' }}>
                      {String(row[col.name] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="vizzly-meta" style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
        {data.meta.rowCount} rows · {data.meta.queryMs}ms
      </div>
    </div>
  );
}