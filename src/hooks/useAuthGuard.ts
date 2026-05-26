import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWallet } from "@solana/wallet-adapter-react";

export function useAuthGuard() {
  const navigate = useNavigate();
  const { connected, connecting } = useWallet();

  useEffect(() => {
    if (!connecting && !connected) {
      navigate({ to: "/", replace: true });
    }
  }, [connected, connecting, navigate]);
}
