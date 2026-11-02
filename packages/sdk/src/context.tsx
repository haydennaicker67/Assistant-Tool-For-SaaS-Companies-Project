import React, { createContext, useContext, useMemo } from "react";

interface VizzlyConfig {
  embedToken: string;
  controlPlaneUrl: string;
  projectId: string;
  onTokenExpired?: () => Promise<string>; // NEW
}

interface VizzlyContextType extends VizzlyConfig {
  role: "viewer" | "editor" | "admin" | null;
}

const VizzlyContext = createContext<VizzlyContextType | null>(null);

export function VizzlyProvider({ 
  children, 
  ...config 
}: VizzlyConfig & { children: React.ReactNode }) {
  // S12 FIX: Decode the JWT payload to get the role (no verification needed on client)
  const role = useMemo(() => {
    try {
      const base64Url = config.embedToken.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      return payload.role || null;
    } catch {
      return null;
    }
  }, [config.embedToken]);

  return (
    <VizzlyContext.Provider value={{ ...config, role }}>
      {children}
    </VizzlyContext.Provider>
  );
}

export function useVizzlyConfig() {
  const ctx = useContext(VizzlyContext);
  if (!ctx) throw new Error("useVizzlyConfig must be used within a <VizzlyProvider>");
  return ctx;
}