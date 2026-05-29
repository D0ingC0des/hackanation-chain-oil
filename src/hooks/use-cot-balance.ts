import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

const COT_MINT = new PublicKey("4fPShVRxVyF2T7CY7hwzpDeMhKFP3M5GrPpXSRiAi8KJ");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export function useCotBalance(): number | null {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [cotBalance, setCotBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    connection
      .getTokenAccountsByOwner(publicKey, {
        programId: TOKEN_2022_PROGRAM_ID,
        mint: COT_MINT,
      })
      .then(({ value: accounts }) => {
        let total = 0n;
        for (const { account } of accounts) {
          const view = new DataView(account.data.buffer, account.data.byteOffset);
          total += view.getBigUint64(64, true);
        }
        setCotBalance(Number(total));
      })
      .catch(() => setCotBalance(0));
  }, [connection, publicKey]);

  return cotBalance;
}
