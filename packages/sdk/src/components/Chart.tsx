import React from "react";
import type { ChartSpec } from "@vizzly-sa/shared";

export function Chart({ data }: { data: ChartSpec }) {
  return (
    <div className="vizzly-chart" data-chart-type={data.chartType}>
      {data.meta.explanation && (
        <p className="vizzly-explanation">{data.meta.explanation}</p>
      )}
      
      <table className="vizzly-table">
        <thead>
          <tr>
            {data.columns.map((col) => (
              <th key={col.name} className="vizzly-th">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="vizzly-tr">
              {data.columns.map((col) => (
                <td key={col.name} className="vizzly-td">
                  {String(row[col.name] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="vizzly-meta">
        {data.meta.rowCount} rows · {data.meta.queryMs}ms
      </div>
    </div>
  );
}