import { useState, useCallback } from "react";
import type { ChartSpec } from "@vizzly-sa/shared";
import { useVizzlyConfig } from "../context";

export function useVizzlyQuery() {
  const { embedToken, controlPlaneUrl, projectId } = useVizzlyConfig();
  const [data, setData] = useState<ChartSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeNLQuery = useCallback(async (question: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${controlPlaneUrl}/v1/query/nl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${embedToken}`,
          "x-project-id": projectId,
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const errBody = await res.json();
        
        // If limit exceeded, throw a specific error
        if (errBody.code === "limit_exceeded") {
          throw new Error("LIMIT_EXCEEDED");
        }
        
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
  }, [embedToken, controlPlaneUrl, projectId]);

  return { data, loading, error, executeNLQuery };
}