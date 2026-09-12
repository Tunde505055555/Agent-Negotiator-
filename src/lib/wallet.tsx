import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
};

interface WalletCtx {
  address: string | null;
  chainId: string | null;
  available: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletCtx | null>(null);

function getProvider(): Eip1193 | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = getProvider();
    setAvailable(Boolean(provider));
    if (!provider) return;

    void provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list[0]) setAddress(list[0]);
      })
      .catch(() => undefined);
    void provider
      .request({ method: "eth_chainId" })
      .then((id) => setChainId(id as string))
      .catch(() => undefined);

    const onAccounts = (...args: unknown[]) => {
      const list = (args[0] as string[]) ?? [];
      setAddress(list[0] ?? null);
    };
    const onChain = (...args: unknown[]) => setChainId((args[0] as string) ?? null);
    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError("MetaMask was not detected. Install the extension to connect an agent wallet.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accounts[0] ?? null);
      const id = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Wallet connection was rejected.";
      setError(message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  const value = useMemo(
    () => ({ address, chainId, available, connecting, error, connect, disconnect }),
    [address, chainId, available, connecting, error, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

export function shortAddress(value: string) {
  return value.length > 10 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
