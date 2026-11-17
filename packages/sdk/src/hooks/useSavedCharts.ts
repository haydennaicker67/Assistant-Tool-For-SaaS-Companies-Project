import { useState, useCallback } from "react";
import { useVizzlyConfig } from "../context";
import type { ChartSpec } from "@vizzly-sa/shared";

export function useSavedCharts() {
  const { embedToken, controlPlaneUrl, projectId } = useVizzlyConfig();
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCharts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${controlPlaneUrl}/v1/charts/list`, {
        headers: {
          "Authorization": `Bearer ${embedToken}`,
          "x-project-id": projectId,
        },
      });
      const data = await res.json();
      setCharts(data.charts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [embedToken, controlPlaneUrl, projectId]);

  const saveChart = async (title: string, question: string, chartPayload: ChartSpec) => {
    await fetch(`${controlPlaneUrl}/v1/charts/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${embedToken}`,
        "x-project-id": projectId,
      },
      body: JSON.stringify({ title, question, chartPayload }),
    });
  };

  return { charts, loading, fetchCharts, saveChart };
}