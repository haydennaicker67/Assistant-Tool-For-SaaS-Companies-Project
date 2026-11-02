import { useState, useCallback } from "react";
import type { ChartSpec } from "@vizzly-sa/shared";
import { useVizzlyConfig } from "../context";

export function useVizzlyQuery() {
  const { embedToken, controlPlaneUrl, projectId, onTokenExpired } = useVizzlyConfig();
  const [data, setData] = useState<ChartSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeNLQuery = useCallback(async (question: string, dateRange?: { from: string; to: string }) => {
    setLoading(true);
    setError(null);

    const makeRequest = async (token: string) => {
      return fetch(`${controlPlaneUrl}/v1/query/nl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-project-id": projectId,
        },
        body: JSON.stringify({ question, projectId, dateRange }),
      });
    };

    try {
      let res = await makeRequest(embedToken);

      // S19 FIX: If unauthorized (token expired), try to refresh
      if (res.status === 401 && onTokenExpired) {
        const newToken = await onTokenExpired();
        res = await makeRequest(newToken);
      }

      if (!res.ok) {
        const errBody = await res.json();
        if (errBody.code === "limit_exceeded") throw new Error("LIMIT_EXCEEDED");
        throw new Error(errBody.message || "Query failed");
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [embedToken, controlPlaneUrl, projectId, onTokenExpired]);

  return { data, loading, error, executeNLQuery };
}