import React, { useState } from "react";
import type { ChartSpec } from "@vizzly-sa/shared";
import { useVizzlyConfig } from "../context"; // NEW IMPORT

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
  const labelKey = data.columns[0]?.name;
  const valueKey = data.columns[1]?.name;
  if (!labelKey || !valueKey) return <TableView data={data} />;

  const maxValue = Math.max(...data.rows.map(r => Number(r[valueKey]) || 0), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '300px', padding: '1rem 0', borderLeft: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
      {data.rows.map((row, i) => {
        const val = Number(row[valueKey]) || 0;
        const heightPct = (val / maxValue) * 100;
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

// --- SUB-COMPONENT: LINE CHART ---
function LineChartView({ data }: { data: ChartSpec }) {
  if (data.rows.length === 0) return <div style={{ textAlign: 'center', color: '#6b7280' }}>No data found</div>;
  const labelKey = data.columns[0]?.name;
  const valueKey = data.columns[1]?.name;
  if (!labelKey || !valueKey) return <TableView data={data} />;

  const maxValue = Math.max(...data.rows.map(r => Number(r[valueKey]) || 0), 1);
  const width = 600;
  const height = 300;
  const padding = 30;

  const points = data.rows.map((row, i) => {
    const x = padding + (i * ((width - padding * 2) / Math.max(data.rows.length - 1, 1)));
    const y = height - padding - ((Number(row[valueKey]) || 0) / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '300px' }}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="2" />
        <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} strokeLinejoin="round" strokeLinecap="round" />
        {data.rows.map((row, i) => {
          const x = padding + (i * ((width - padding * 2) / Math.max(data.rows.length - 1, 1)));
          const y = height - padding - ((Number(row[valueKey]) || 0) / maxValue) * (height - padding * 2);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="#3b82f6" />
              <text x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="#6b7280">{String(row[labelKey] ?? "").slice(0, 10)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- SUB-COMPONENT: PIE CHART ---
function PieChartView({ data }: { data: ChartSpec }) {
  if (data.rows.length === 0) return <div style={{ textAlign: 'center', color: '#6b7280' }}>No data found</div>;
  const labelKey = data.columns[0]?.name;
  const valueKey = data.columns[1]?.name;
  if (!labelKey || !valueKey) return <TableView data={data} />;

  const total = data.rows.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0);
  if (total === 0) return <div style={{ textAlign: 'center', color: '#6b7280' }}>Data values are 0</div>;

  let currentAngle = 0;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', padding: '1rem' }}>
      <svg viewBox="-1 -1 2 2" style={{ width: '200px', height: '200px', transform: 'rotate(-90deg)' }}>
        {data.rows.map((row, i) => {
          const val = Number(row[valueKey]) || 0;
          const angle = (val / total) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;

          const x1 = Math.cos((startAngle * Math.PI) / 180);
          const y1 = Math.sin((startAngle * Math.PI) / 180);
          const x2 = Math.cos((currentAngle * Math.PI) / 180);
          const y2 = Math.sin((currentAngle * Math.PI) / 180);
          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = [
            `M 0 0`,
            `L ${x1} ${y1}`,
            `A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `Z`
          ].join(' ');

          return <path key={i} d={pathData} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="0.05" />;
        })}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {data.rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: colors[i % colors.length], borderRadius: '2px' }} />
            <span style={{ color: '#374151' }}>{String(row[labelKey] ?? "")}: <strong>{String(row[valueKey] ?? "")}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export function Chart({ data }: { data: ChartSpec }) {
  const { role } = useVizzlyConfig(); // S12 FIX: Get the role
  const [activeChartType, setActiveChartType] = useState<"table" | "bar" | "line" | "pie">(data.chartType as any || "table");

  const downloadCSV = () => {
    if (!data || data.rows.length === 0) return;

    const headers = data.columns.map(c => c.label).join(",");

    const csvRows = data.rows.map(row => {
      return data.columns.map(col => {
        const val = row[col.name];
        
        // S23 FIX: Neutralize CSV injection and handle quoting
        if (typeof val === "string") {
          let strVal = val;
          if (/^[=+\-@]/.test(strVal)) {
            strVal = `'${strVal}`;
          }
          strVal = strVal.replace(/"/g, '""');
          if (/[",\n]/.test(strVal)) {
            return `"${strVal}"`;
          }
          return strVal;
        }
        return val ?? "";
      }).join(",");
    });

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
    <div className="vizzly-chart" style={{ marginTop: '1rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          {data.meta.explanation && (
            <p style={{ color: '#555', fontSize: '0.875rem', margin: 0 }}>
              {data.meta.explanation}
            </p>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {data.rows.length > 0 && (
            <select 
              value={activeChartType} 
              onChange={(e) => setActiveChartType(e.target.value as any)}
              style={{ padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', color: '#374151' }}
            >
              <option value="table">Table</option>
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          )}

          {/* S12 FIX: Only show Export CSV if role is editor or admin */}
          {data.rows.length > 0 && (role === "editor" || role === "admin") && (
            <button
              onClick={downloadCSV}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {activeChartType === "bar" && <BarChartView data={data} />}
      {activeChartType === "line" && <LineChartView data={data} />}
      {activeChartType === "pie" && <PieChartView data={data} />}
      {activeChartType === "table" && <TableView data={data} />}

      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
        <span>
          {data.meta.rowCount} rows · {data.meta.queryMs}ms 
          {data.meta.cached && <span style={{ color: '#10b981', marginLeft: '0.5rem', fontWeight: 'bold' }}>(Cached)</span>}
        </span>
        <span>Type: {activeChartType}</span>
      </div>
    </div>
  );
}