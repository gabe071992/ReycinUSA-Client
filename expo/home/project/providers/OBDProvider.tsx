import React, { createContext, useContext, useState } from 'react';

interface OBDContextType {
  connected: boolean;
  connecting: boolean;
  telemetry: any;
  connect: (transport: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const OBDContext = createContext<OBDContextType | undefined>(undefined);

export function OBDProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [telemetry, setTelemetry] = useState(null);

  const connect = async (transport: string) => {
    setConnecting(true);
    // TODO: Implement actual connection logic
    console.log('Connecting via', transport);
    setTimeout(() => {
      setConnected(true);
      setConnecting(false);
    }, 1000);
  };

  const disconnect = async () => {
    setConnected(false);
    setTelemetry(null);
  };

  return (
    <OBDContext.Provider
      value={{
        connected,
        connecting,
        telemetry,
        connect,
        disconnect,
      }}
    >
      {children}
    </OBDContext.Provider>
  );
}

export function useOBD() {
  const context = useContext(OBDContext);
  if (!context) {
    throw new Error('useOBD must be used within OBDProvider');
  }
  return context;
}