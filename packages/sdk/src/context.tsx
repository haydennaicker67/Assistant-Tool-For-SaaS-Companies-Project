import React, { createContext, useContext } from "react";

interface VizzlyConfig {
  embedToken: string;
  controlPlaneUrl: string;
  projectId: string;
}

const VizzlyContext = createContext<VizzlyConfig | null>(null);

export function VizzlyProvider({ 
  children, 
  ...config 
}: VizzlyConfig & { children: React.ReactNode }) {
  return (
    <VizzlyContext.Provider value={config}>
      {children}
    </VizzlyContext.Provider>
  );
}

export function useVizzlyConfig() {
  const ctx = useContext(VizzlyContext);
  if (!ctx) throw new Error("useVizzlyConfig must be used within a <VizzlyProvider>");
  return ctx;
}