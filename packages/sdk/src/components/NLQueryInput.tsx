import React, { useState } from "react";
import { useVizzlyQuery } from "../hooks/useVizzlyQuery";
import { Chart } from "./Chart";

export function NLQueryInput({ placeholder = "Ask a question about your data..." }) {
  const [question, setQuestion] = useState("");
  const { data, loading, error, executeNLQuery } = useVizzlyQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    executeNLQuery(question);
  };

  return (
    <div className="vizzly-nl-query-container">
      <form onSubmit={handleSubmit} className="vizzly-nl-form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          className="vizzly-nl-input"
          disabled={loading}
        />
        <button type="submit" disabled={loading} className="vizzly-nl-button">
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error && <div className="vizzly-error">{error}</div>}
      {data && !loading && <Chart data={data} />}
    </div>
  );
}