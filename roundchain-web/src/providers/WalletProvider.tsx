"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  isConnected,
  isAllowed,
  getAddress,
  requestAccess,
  setAllowed,
} from "@stellar/freighter-api";

interface WalletContextValue {
  address: string | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const connected = await isConnected();
      if (!connected) {
        setAddress(null);
        return;
      }
      const allowed = await isAllowed();
      if (!allowed) {
        setAddress(null);
        return;
      }
      const addr = await getAddress();
      setAddress(addr.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet error");
      setAddress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = async () => {
    setError(null);
    try {
      await requestAccess();
      await setAllowed();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect Freighter");
    }
  };

  const disconnect = () => setAddress(null);

  return (
    <WalletContext.Provider value={{ address, loading, error, connect, disconnect, refresh }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
