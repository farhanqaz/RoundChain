"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  isConnected,
  isAllowed,
  getAddress,
  requestAccess,
  setAllowed,
} from "@stellar/freighter-api";

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

interface WalletContextValue {
  address: string | null;
  loading: boolean;
  connecting: boolean;
  error: string | null;
  freighterInstalled: boolean | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function walletErrorMessage(error?: { message?: string }): string | null {
  return error?.message?.trim() ? error.message : null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await isConnected();
      setFreighterInstalled(status.isConnected);

      if (!status.isConnected) {
        setAddress(null);
        return;
      }

      const allowed = await isAllowed();
      if (!allowed.isAllowed) {
        setAddress(null);
        return;
      }

      const addr = await getAddress();
      if (addr.error || !addr.address) {
        setAddress(null);
        const msg = walletErrorMessage(addr.error);
        if (msg) setError(msg);
        return;
      }

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
    setConnecting(true);
    try {
      const status = await isConnected();
      setFreighterInstalled(status.isConnected);

      if (!status.isConnected) {
        setError(
          "Freighter extension not found. Install it from freighter.app, then refresh this page."
        );
        return;
      }

      const access = await requestAccess();
      if (access.error || !access.address) {
        setError(
          walletErrorMessage(access.error) ?? "Connection cancelled or failed in Freighter"
        );
        return;
      }

      await setAllowed();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect Freighter");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => setAddress(null);

  return (
    <WalletContext.Provider
      value={{
        address,
        loading,
        connecting,
        error,
        freighterInstalled,
        connect,
        disconnect,
        refresh,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
