import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";

const ENDPOINT = clusterApiUrl("devnet");

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  // Wallet Standard wallets (Phantom, Backpack, Solflare) auto-register — no explicit adapters needed
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
