import React, { useState } from "react";
import { useVizzlyQuery } from "../hooks/useVizzlyQuery";
import { Chart } from "./Chart";
import { FilterBar } from "./FilterBar";

export function NLQueryInput({ placeholder = "Ask a question about your data..." }) {
  const [question, setQuestion] = useState("");
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const { data, loading, error, executeNLQuery } = useVizzlyQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    executeNLQuery(question, dateRange || undefined);
  };

  return (
    <div className="vizzly-nl-query-container">
      <FilterBar value={dateRange} onChange={setDateRange} />

      <form onSubmit={handleSubmit} className="vizzly-nl-form" style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          className="vizzly-nl-input"
          disabled={loading}
          style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        <button 
          type="submit" 
          disabled={loading} 
          className="vizzly-nl-button"
          style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.375rem', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error === "LIMIT_EXCEEDED" ? (
        <div className="vizzly-limit-exceeded" style={{ padding: '1.5rem', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.5rem', marginTop: '1rem', textAlign: 'center' }}>
          <h3 style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '0.5rem', fontSize: '1.125rem' }}>
            Analytics Limit Reached
          </h3>
          <p style={{ color: '#b45309', fontSize: '0.875rem', marginBottom: '1rem' }}>
            The account owner has reached their monthly analytics limit. 
            Please ask them to upgrade their plan to continue viewing data.
          </p>
          <a href="https://vizzly.co.za/pricing" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: '#d97706', color: 'white', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none' }}>
            View Pricing Plans →
          </a>
        </div>
      ) : error ? (
        <div className="vizzly-error" style={{ color: '#dc2626', marginTop: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      ) : null}

      {data && !loading && <Chart data={data} />}
    </div>
  );
}